# Email in TechCare

How TechCare sends emails: what is sent, when, and where the code is.

## 1. The rules

| Who | Must verify their email? | What happens if not verified | Forgot password |
|---|---|---|---|
| **Employee** (`users`) | Yes | **Can't log in** | By email ("Forgot password?" on the login page) |
| **Patient** (`patients`) | No | Account works, but the clinic sends them **no emails** | At the clinic front desk only |

Staff can also reset passwords by typing a new one:

- **Admin:** resets an employee's password from User Management.
- **Front desk:** resets a patient's password from Patient Records.

## 2. Setup

Emails are sent with **Brevo** through its HTTPS API. SMTP (e.g. Nodemailer + Gmail) doesn't work on Render's free tier because Render blocks SMTP ports.

Add these to `backend/.env`, and to Render's environment settings:

```dotenv
BREVO_API_KEY=your_brevo_api_key
EMAIL_FROM=sender@example.com      # must be verified in Brevo (Senders)
EMAIL_FROM_NAME=Reyna G Diagnostic Clinic
APP_URL=http://localhost:5173       # the frontend address, used in email links
```

- **No `BREVO_API_KEY`** (local development): nothing is sent. The email, including its link, is printed in the **backend console** instead, so you can copy the link and open it.
- **On Render:** set `APP_URL` to the real frontend address, or the links in emails will point to `localhost`.

Getting a key:
1. Create a free account at brevo.com.
2. Go to Senders and verify the email address you will send from.
3. Go to SMTP & API → API Keys and create a key.

## 3. Database columns

There are no new tables, only new columns. `connectNeon()` in `config/db.ts` adds them on startup with `ALTER TABLE … ADD COLUMN IF NOT EXISTS`.

**`users`**

| Column | Meaning |
|---|---|
| `is_verified` | `FALSE` = hasn't confirmed their email and can't log in. Defaults to `TRUE` so accounts that existed before this feature still work; `addUser` inserts `FALSE`. |
| `verify_token`, `verify_expires_at` | The confirmation link (48 hours). |
| `reset_token`, `reset_expires_at` | The forgot-password link (30 minutes). |

**`patients`**

| Column | Meaning |
|---|---|
| `is_verified` | `FALSE` = the clinic sends them no emails. Defaults to `FALSE`. |
| `pending_email` | A new email waiting to be confirmed (see section 5.3). |
| `verify_token`, `verify_expires_at` | The verification link (48 hours). |

The tokens in the database are **SHA-256 hashes**. The real token is only in the email link, so someone who reads the database can't use the links.

## 4. The files

| File | What it does |
|---|---|
| `backend/src/services/email/sendEmail.ts` | `sendEmail()` sends one email through Brevo, or prints it when there's no key. `sendUserVerificationEmail()` and `sendPatientVerificationEmail()` create a new link and send it. `sendEmailToPatient()` is the rule that unverified patients get nothing. |
| `backend/src/services/email/emailTemplates.ts` | The text of the 3 emails: employee confirmation, patient verification, password reset. |
| `backend/src/utils/emailToken.ts` | `createToken()` / `hashToken()` for the link tokens, and `MIN_PASSWORD_LENGTH` (8). |
| `frontend/src/auth/VerifyEmailPage.tsx` | The page the email link opens (`/verify-email`). |
| `frontend/src/auth/ForgotPasswordPage.tsx` | `/forgot-password`. |
| `frontend/src/auth/ResetPasswordPage.tsx` | `/reset-password`, opened from the reset email. |
| `frontend/src/components/ResetPasswordModal.tsx` | The "type the new password twice" modal used by the admin and the front desk. |
| `frontend/src/users/patient/components/EmailVerificationBanner.tsx` | The yellow "verify your email" banner in the patient portal. |

`sendEmail()` never throws. If Brevo fails it logs the error and returns `false`, and the controller tells staff to press **Resend**. There is no automatic retry.

## 5. The flows

### 5.1 Admin adds an employee

1. The admin fills in Add User, including the password, as before.
2. `addUser` (`controllers/admin/postRequests.controller.ts`) inserts the user with `is_verified = FALSE`, then calls `sendUserVerificationEmail(userId)`.
3. The employee gets "Confirm your email" with a link to `/verify-email?token=…`.
4. Until they confirm, `login` answers **403 "Please confirm your email first."** The admin sees "Email not verified" on the user card, and **Resend confirmation email** on the profile.
5. The employee opens the link and presses **Confirm email**. `POST /api/auth/verify-email` sets `is_verified = TRUE`, and they can now log in.

### 5.2 Front desk registers a patient

1. `addPatient` (`controllers/fdstaff/postRequests.controller.ts`) creates the patient as before (`is_verified` defaults to `FALSE`), then calls `sendPatientVerificationEmail(patientId)`.
2. The patient can log in right away. The portal shows a banner saying their email isn't verified, with a **Send verification link** button.
3. The patient opens the link and presses Confirm. `is_verified` becomes `TRUE`, the banner disappears, and the clinic can now email them.

The front desk can resend the link from Patient Records (**Resend verification**).

### 5.3 Front desk changes a patient's email

In `updatePatient` (`controllers/fdstaff/updateRequests.controller.ts`):

- **Patient already verified:** their current `email` stays, and they stay verified. The new address goes into `pending_email`, and the link is sent to the **new** address. Until it's confirmed, clinic emails still go to the old email. When they click the link, `email` becomes the new address and `pending_email` is cleared.
- **Patient not verified:** the email is simply replaced, and a link is sent to the new address.

### 5.4 Employee forgot their password

1. Login page → **Forgot password?** → enter email → `POST /api/auth/forgot-password`.
2. If it's an active, verified employee, a reset link is saved (30 minutes) and emailed.
3. The page always shows the same message, so nobody can use it to check which emails have accounts: *"If this email belongs to a staff account, we sent you a reset link. Patients: please visit the clinic front desk to reset your password."*
4. The link opens `/reset-password`. The employee types a new password (at least 8 characters). The link works **once**.

Patients don't get reset emails; the front desk resets their password (5.5).

### 5.5 Staff reset a password

| Who | Where | Endpoint |
|---|---|---|
| Admin → employee | User Management → profile → **Reset password** | `PATCH /api/admin/users/:user_id/password` |
| Front desk → patient | Patient Records → **Reset password** | `PATCH /api/fdstaff/patients/:patient_id/password` |

The staff member types the new password twice (at least 8 characters) and gives it to the person. An admin reset also cancels any forgot-password link the employee had. Editing a patient no longer changes their password; this button is the only way.

## 6. Endpoints

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/api/auth/verify-email` | public | Confirm an email from a link (employees and patients) |
| POST | `/api/auth/forgot-password` | public | Send a reset link (employees only) |
| POST | `/api/auth/reset-password` | public | Set a new password from a reset link |
| POST | `/api/admin/users/:user_id/verification-email` | admin | Resend an employee's confirmation email |
| PATCH | `/api/admin/users/:user_id/password` | admin | Reset an employee's password |
| POST | `/api/fdstaff/patients/:patient_id/verification-email` | front desk | Resend a patient's verification email |
| PATCH | `/api/fdstaff/patients/:patient_id/password` | front desk | Reset a patient's password |
| GET | `/api/patient/email-status` | patient | For the portal banner |
| POST | `/api/patient/verification-email` | patient | Patient resends their own link |

## 7. Sending other emails to patients later

For any new patient email (lab results ready, receipts, …), **always** use `sendEmailToPatient()` so unverified patients are skipped:

```ts
import { sendEmailToPatient } from "../../services/email/sendEmail.js";

await sendEmailToPatient(patientId, (to, firstName) => ({
  to,
  subject: "Your laboratory result is ready",
  html: `<p>Hi ${firstName}, your result is ready. Log in to the patient portal to view it.</p>`,
}));
```

Don't put medical results in the email itself; tell them to log in.

## 8. Testing locally

1. Leave `BREVO_API_KEY` empty and start the backend and frontend.
2. Add an employee or a patient. The backend console prints:
   ```
   [EMAIL] To: someone@example.com
   [EMAIL] Subject: Confirm your email to activate your TechCare account
   [EMAIL] Link: http://localhost:5173/verify-email?token=...
   ```
3. Open the link and press **Confirm email**.

## 9. Troubleshooting

| Problem | Check |
|---|---|
| No email arrives | Backend logs for `SEND EMAIL ERROR`. Usually a wrong `BREVO_API_KEY` or an `EMAIL_FROM` not verified in Brevo. Also check the spam folder. |
| The link opens `localhost` in production | `APP_URL` isn't set on Render. |
| "This link is invalid, already used, or expired" | Links last 48 hours (verification) or 30 minutes (reset), and only the newest link works. Press Resend. |
| Employee can't log in after being created | They haven't confirmed their email. Resend it from their profile. |
| Free plan limit | Brevo's free plan has a daily sending limit; check your Brevo account. |

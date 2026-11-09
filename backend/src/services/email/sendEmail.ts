import { sql } from "../../config/db.js";
import { ENV } from "../../config/env.js";
import { createToken } from "../../utils/emailToken.js";
import {
  employeeVerificationEmail,
  patientVerificationEmail,
  type Email,
} from "./emailTemplates.js";

// =========================
// SEND EMAIL (Brevo)
// =========================
// Uses Brevo's HTTPS API. Render's free tier blocks SMTP, so Nodemailer
// with Gmail won't work there. Without BREVO_API_KEY (local development)
// the email is printed to the console instead, so you can open the link.
// Never throws: returns false and logs the error if sending fails.
export async function sendEmail(email: Email): Promise<boolean> {
  if (!ENV.BREVO_API_KEY || !ENV.EMAIL_FROM) {
    const link = email.html.match(/href="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&");
    console.log(`\n[EMAIL] To: ${email.to}\n[EMAIL] Subject: ${email.subject}\n[EMAIL] Link: ${link}\n`);
    return true;
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": ENV.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: ENV.EMAIL_FROM_NAME, email: ENV.EMAIL_FROM },
        to: [{ email: email.to }],
        subject: email.subject,
        htmlContent: email.html,
      }),
    });

    if (!response.ok) {
      console.error("SEND EMAIL ERROR:", response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("SEND EMAIL ERROR:", error);
    return false;
  }
}

// =========================
// EMPLOYEE VERIFICATION LINK
// =========================
// Saves a new link on the user (old links stop working) and emails it.
export async function sendUserVerificationEmail(userId: string): Promise<boolean> {
  const { token, tokenHash } = createToken();

  const [user] = await sql`
    UPDATE users
    SET verify_token = ${tokenHash},
        verify_expires_at = NOW() + INTERVAL '48 hours'
    WHERE user_id = ${userId}
    RETURNING first_name, email
  `;

  if (!user) return false;

  return sendEmail(employeeVerificationEmail(user.email, user.first_name, token));
}

// =========================
// PATIENT VERIFICATION LINK
// =========================
// Sends to the pending new email if there is one, otherwise to the current
// email. This is the only email an unverified patient can receive.
export async function sendPatientVerificationEmail(patientId: string): Promise<boolean> {
  const { token, tokenHash } = createToken();

  const [patient] = await sql`
    UPDATE patients
    SET verify_token = ${tokenHash},
        verify_expires_at = NOW() + INTERVAL '48 hours'
    WHERE patient_id = ${patientId}
    RETURNING first_name, email, pending_email
  `;

  if (!patient) return false;

  const isNewEmail = Boolean(patient.pending_email);
  const to = isNewEmail ? patient.pending_email : patient.email;

  return sendEmail(patientVerificationEmail(to, patient.first_name, token, isNewEmail));
}

// =========================
// EMAIL TO A PATIENT (rule)
// =========================
// Use this for every other patient email (lab results, receipts, ...).
// Unverified patients get nothing.
export async function sendEmailToPatient(
  patientId: string,
  createEmail: (to: string, firstName: string) => Email,
): Promise<boolean> {
  const [patient] = await sql`
    SELECT email, first_name
    FROM patients
    WHERE patient_id = ${patientId} AND is_verified = TRUE
  `;

  if (!patient) return false;

  return sendEmail(createEmail(patient.email, patient.first_name));
}

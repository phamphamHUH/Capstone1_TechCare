
import { sql } from "../../config/db.js";
import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ENV } from "../../config/env.js";
import type {
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
} from "./dto/post.dto.js";
import { createToken, hashToken, MIN_PASSWORD_LENGTH } from "../../utils/emailToken.js";
import { sendEmail } from "../../services/email/sendEmail.js";
import { passwordResetEmail } from "../../services/email/emailTemplates.js";

export async function login(
  req: Request,
  res: Response<login.response | login.error>,
) {
  try {
    const { username, password } = req.body as login.body;

    // =========================
    // REQUIRED CREDENTIALS
    // =========================
    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required",
      } as login.error);
    }

    // Explicitly enabled local development shortcut. Never used in production.
    // if (
    //   ENV.NODE_ENV === "development" && !ENV.IS_PRODUCTION &&
    //   ENV.DEV_DOCTOR_LOGIN &&
    //   ["localhost", "127.0.0.1", "::1", "[::1]"].includes(req.hostname) &&
    //   username === "doctor.dev@techcare.local" && password === "DoctorDev123!"
    // ) {
    //   // Create a real user row so consultation/lab-request foreign keys are valid.
    //   // Never overwrite an existing account or its password.
    //   const passwordHash = await bcrypt.hash("DoctorDev123!", 10);
    //   await sql`
    //     INSERT INTO users (
    //       user_id, username, password_hash, first_name, last_name, sex,
    //       email, contact_number, address, birthdate, role, date_hired
    //     ) VALUES (
    //       'DEV-DOCTOR-LOCAL', 'doctor.dev', ${passwordHash}, 'Development',
    //       'Doctor', 'Male', 'doctor.dev@techcare.local', '00000000000',
    //       'Local development only', '1990-01-01', 'doctor', CURRENT_DATE
    //     ) ON CONFLICT DO NOTHING
    //   `;
    //   const doctors = await sql`
    //     SELECT * FROM users WHERE user_id = 'DEV-DOCTOR-LOCAL'
    //       AND username = 'doctor.dev' AND email = 'doctor.dev@techcare.local'
    //       AND role = 'doctor' AND account_status = TRUE
    //   `;
    //   if (!doctors[0]) {
    //     return res.status(409).json({
    //       message: "Development doctor conflicts with an existing or disabled account. Ask an administrator to check DEV-DOCTOR-LOCAL and doctor.dev@techcare.local.",
    //     });
    //   }
    //   const { password_hash: _passwordHash, ...safeDoctor } = doctors[0];
    //   // Development doctor routes already accept body.doctor_id without a JWT.
    //   return res.status(200).json({
    //     message: "Login successful", user: safeDoctor, token: "", refreshToken: "",
    //   });
    // }

    // =========================
    // FIND USER
    // =========================
    const validUsers = await sql`
      SELECT *
      FROM users
      WHERE username = ${username} OR email = ${username}
      LIMIT 1
    `;

    let account = validUsers[0];
    let accountType: login.accountType = "user";

    // =========================
    // FIND PATIENT IF USER DOES NOT EXIST
    // =========================
    if (!account) {
      const validPatients = await sql`
        SELECT *
        FROM patients
        WHERE username = ${username} OR email = ${username}
        LIMIT 1
      `;

      account = validPatients[0];
      accountType = "patient";
    }

    // =========================
    // CHECK IF ACCOUNT EXISTS
    // =========================
    if (!account) {
      return res.status(401).json({
        message: "Invalid username or email",
      } as login.error);
    }

    // =========================
    // VERIFY PASSWORD
    // =========================
    const isMatch = await bcrypt.compare(password, account.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid username or password",
      } as login.error);
    }

    // =========================
    // CHECK ACCOUNT STATUS
    // =========================
    if (accountType === "user" && account.account_status === false) {
      return res.status(403).json({
        message:
          "Your account has been deactivated. Please contact the administrator.",
      } as login.error);
    }

    // Employees must confirm their email first (patients don't have to).
    if (accountType === "user" && account.is_verified === false) {
      return res.status(403).json({
        message:
          "Please confirm your email first. Check your inbox for the link, or ask the administrator to resend it.",
      } as login.error);
    }

    // =========================
    // UPDATE LOGIN STATUS
    // =========================
    if (accountType === "user") {
      await sql`
        UPDATE users
        SET active = TRUE,
            last_login = CURRENT_TIMESTAMP
        WHERE user_id = ${account.user_id}
      `;
    } else {
      // The patients table does not have an active or last_login column.
      // Update the existing updated_at timestamp after a successful login.
      await sql`
        UPDATE patients
        SET updated_at = CURRENT_TIMESTAMP
        WHERE patient_id = ${account.patient_id}
      `;
    }

    // =========================
    // GENERATE ACCESS TOKEN
    // =========================
    // Creates a short-lived JWT containing the authenticated account's ID.
    // The token is used to authenticate requests to protected endpoints.
    // The account_type claim distinguishes employees from patients.
    const accountId =
      accountType === "user" ? account.user_id : account.patient_id;

    const token = jwt.sign(
      {
        user_id: accountId,
        account_type: accountType,
      },
      ENV.JWT_SECRET,
      {
        expiresIn: ENV.JWT_EXPIRES_IN,
      },
    );

    // =========================
    // GENERATE REFRESH TOKEN
    // =========================
    // Creates a longer-lived JWT containing the authenticated account's ID.
    // The refresh token can be used to obtain a new access token
    // after the access token expires.
    // The account_type claim identifies the account's table.
    const refreshToken = jwt.sign(
      {
        user_id: accountId,
        account_type: accountType,
      },
      ENV.JWT_REFRESH_TOKEN,
      {
        expiresIn: ENV.JWT_REFRESH_EXPIRES_IN,
      },
    );

    // =========================
    // REMOVE SENSITIVE DATA
    // =========================
    // Prevents the password hash from being sent to the client.
    // Also keep the email link tokens out of the response.
    const { password_hash, verify_token, reset_token, ...safeAccount } = account;

    // =========================
    // RESPONSE
    // =========================
    // accountType identifies whether the authenticated account is a user or patient.
    // The frontend can use this value to determine the appropriate dashboard.
    return res.status(200).json({
      message: "Login successful",
      accountType,
      user: safeAccount,
      token,
      refreshToken,
    } as login.response);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Internal Server Error",
    } as login.error);
  }
}

// =========================
// VERIFY EMAIL (link from the email)
// =========================
// POST /api/auth/verify-email  { token }
// Works for both employees and patients: checks users first, then patients
// (same order as login).
export async function verifyEmail(
  req: Request,
  res: Response<verifyEmail.response | verifyEmail.error>,
) {
  try {
    const { token } = req.body as verifyEmail.body;

    if (!token) {
      return res.status(400).json({ message: "This link is invalid." });
    }

    const tokenHash = hashToken(token);

    // =========================
    // EMPLOYEE
    // =========================
    const [user] = await sql`
      UPDATE users
      SET is_verified = TRUE, verify_token = NULL, verify_expires_at = NULL
      WHERE verify_token = ${tokenHash} AND verify_expires_at > NOW()
      RETURNING username
    `;

    if (user) {
      return res.status(200).json({
        message: "Your email is confirmed. You can now log in.",
        accountType: "user",
      });
    }

    // =========================
    // PATIENT
    // =========================
    // If they changed their email, the new one (pending_email) replaces it.
    const [patient] = await sql`
      UPDATE patients
      SET email = COALESCE(pending_email, email),
          pending_email = NULL,
          is_verified = TRUE,
          verify_token = NULL,
          verify_expires_at = NULL
      WHERE verify_token = ${tokenHash} AND verify_expires_at > NOW()
      RETURNING email
    `;

    if (patient) {
      return res.status(200).json({
        message: "Your email is verified. You'll now receive emails from the clinic.",
        accountType: "patient",
      });
    }

    return res.status(400).json({
      message: "This link is invalid, already used, or expired. Ask the clinic to send a new one.",
    });
  } catch (error: any) {
    // 23505 = unique violation: another patient took this email meanwhile.
    if (error?.code === "23505") {
      return res.status(409).json({
        message: "This email is already used by another account. Please contact the clinic.",
      });
    }

    console.error("VERIFY EMAIL ERROR:", error);

    return res.status(500).json({ message: "Internal Server Error" });
  }
}

// =========================
// FORGOT PASSWORD (employees only)
// =========================
// POST /api/auth/forgot-password  { email }
// Always gives the same answer so nobody can check who has an account.
// Patients reset their password at the front desk instead.
export async function forgotPassword(
  req: Request,
  res: Response<forgotPassword.response | forgotPassword.error>,
) {
  const answer =
    "If this email belongs to a staff account, we sent you a reset link. Patients: please visit the clinic front desk to reset your password.";

  try {
    const { email } = req.body as forgotPassword.body;

    if (!email) {
      return res.status(400).json({ message: "Please enter your email." });
    }

    const { token, tokenHash } = createToken();

    // Saving a new token also cancels any older link.
    const [user] = await sql`
      UPDATE users
      SET reset_token = ${tokenHash},
          reset_expires_at = NOW() + INTERVAL '30 minutes'
      WHERE LOWER(email) = ${email.trim().toLowerCase()}
        AND account_status = TRUE
        AND is_verified = TRUE
      RETURNING first_name, email
    `;

    if (user) {
      await sendEmail(passwordResetEmail(user.email, user.first_name, token));
    }

    return res.status(200).json({ message: answer });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);

    return res.status(500).json({ message: "Internal Server Error" });
  }
}

// =========================
// RESET PASSWORD (link from the email, employees only)
// =========================
// POST /api/auth/reset-password  { token, password }
export async function resetPassword(
  req: Request,
  res: Response<resetPassword.response | resetPassword.error>,
) {
  try {
    const { token, password } = req.body as resetPassword.body;

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
    }

    if (!token) {
      return res.status(400).json({ message: "This link is invalid." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Clearing reset_token makes the link work only once.
    const [user] = await sql`
      UPDATE users
      SET password_hash = ${hashedPassword},
          reset_token = NULL,
          reset_expires_at = NULL,
          updated_at = NOW()
      WHERE reset_token = ${hashToken(token)} AND reset_expires_at > NOW()
      RETURNING username
    `;

    if (!user) {
      return res.status(400).json({
        message: "This link is invalid, already used, or expired. Request a new one.",
      });
    }

    return res.status(200).json({ message: "Your password has been changed. You can now log in." });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);

    return res.status(500).json({ message: "Internal Server Error" });
  }
}

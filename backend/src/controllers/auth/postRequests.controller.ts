
import { sql } from "../../config/db.js";
import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ENV } from "../../config/env.js";
import type { login } from "./dto/post.dto.js";

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
    const { password_hash, ...safeAccount } = account;

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

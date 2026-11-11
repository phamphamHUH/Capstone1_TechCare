
import { sql } from "../../config/db.js";
import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ENV } from "../../config/env.js";
import type {
  checkPasswordLink,
  login,
  refresh,
  setPasswordFromLink,
} from "./dto/post.dto.js";
import { hashPasswordToken } from "../../utils/passwordLink.js";
import { MIN_PASSWORD_LENGTH } from "../../utils/password.js";
import { issueTokens } from "./utils/issueTokens.js";

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
    // EMPLOYEE HASN'T CREATED A PASSWORD YET
    // =========================
    // New employees get no password from the admin; they create it through
    // the link in their account email.
    if (accountType === "user" && account.password_token_hash) {
      return res.status(403).json({
        message:
          "Your account isn't set up yet. Use the link in your account email to create your password, or ask the administrator for help.",
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
    // GENERATE TOKENS
    // =========================
    // Access token for API requests + refresh token for /api/auth/refresh.
    const accountId =
      accountType === "user" ? account.user_id : account.patient_id;

    const { token, refreshToken } = issueTokens(accountId, accountType);

    // =========================
    // REMOVE SENSITIVE DATA
    // =========================
    // Prevents the password hash from being sent to the client.
    const { password_hash, password_token_hash, ...safeAccount } = account;

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

// POST /api/auth/refresh
// Trades a valid refresh token for a new access token and a new refresh token.
// Refused (401) when the refresh token is invalid/expired, the account is gone
// or deactivated, or a staff member has logged out since (users.active = FALSE).
export async function refresh(
  req: Request,
  res: Response<refresh.response | refresh.error>,
) {
  const { refreshToken } = (req.body ?? {}) as Partial<refresh.body>;
  if (!refreshToken || typeof refreshToken !== "string") {
    return res.status(400).json({ message: "Refresh token is required." });
  }

  let claims: jwt.JwtPayload | string;
  try {
    claims = jwt.verify(refreshToken, ENV.JWT_REFRESH_TOKEN);
  } catch {
    return res
      .status(401)
      .json({ message: "Session expired. Please log in again." });
  }

  const accountId = typeof claims === "string" ? null : claims.user_id;
  const accountType = typeof claims === "string" ? null : claims.account_type;
  if (
    typeof accountId !== "string" ||
    (accountType !== "user" && accountType !== "patient")
  ) {
    return res.status(401).json({ message: "Invalid refresh token." });
  }

  try {
    const [account] =
      accountType === "user"
        ? await sql`
            SELECT user_id FROM users
            WHERE user_id = ${accountId}
              AND account_status IS NOT FALSE
              AND active = TRUE
          `
        : await sql`
            SELECT patient_id FROM patients
            WHERE patient_id = ${accountId}
              AND account_status IS NOT FALSE
          `;

    if (!account) {
      return res
        .status(401)
        .json({ message: "Session expired. Please log in again." });
    }

    return res.status(200).json({
      message: "Token refreshed",
      ...issueTokens(accountId, accountType),
    });
  } catch (error) {
    console.error("Unable to refresh token:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}


// =========================
// "SET YOUR PASSWORD" LINKS
// =========================
// The account-created email links to /set-password?token=...
// Employees create their first password there; patients change the one the
// front desk gave them. Only the token's SHA-256 hash is stored.

type LinkAccount = {
  account_type: login.accountType;
  id: string;
  first_name: string;
  username: string;
};

// Finds the account a still-valid link belongs to (users first, like login).
async function findLinkAccount(token: unknown): Promise<LinkAccount | null> {
  if (typeof token !== "string" || token.length < 20 || token.length > 200) {
    return null;
  }
  const hash = hashPasswordToken(token);

  const [user] = await sql`
    SELECT user_id, first_name, username FROM users
    WHERE password_token_hash = ${hash} AND password_token_expires_at > NOW()
  `;
  if (user) {
    return { account_type: "user", id: user.user_id, first_name: user.first_name, username: user.username };
  }

  const [patient] = await sql`
    SELECT patient_id, first_name, username FROM patients
    WHERE password_token_hash = ${hash} AND password_token_expires_at > NOW()
  `;
  if (patient) {
    return { account_type: "patient", id: patient.patient_id, first_name: patient.first_name, username: patient.username };
  }
  return null;
}

const INVALID_LINK =
  "This link is invalid or has expired. Ask the clinic administrator (staff) or the front desk (patients) for help.";

// POST /api/auth/password-link/check  { token }
export async function checkPasswordLink(
  req: Request,
  res: Response<checkPasswordLink.response | checkPasswordLink.error>,
) {
  try {
    const { token } = (req.body ?? {}) as Partial<checkPasswordLink.body>;
    const account = await findLinkAccount(token);
    if (!account) return res.status(404).json({ message: INVALID_LINK });

    return res.status(200).json({
      message: "Link is valid.",
      account_type: account.account_type,
      first_name: account.first_name,
      username: account.username,
    });
  } catch (error) {
    console.error("CHECK PASSWORD LINK ERROR:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

// POST /api/auth/password-link  { token, password }
export async function setPasswordFromLink(
  req: Request,
  res: Response<setPasswordFromLink.response | setPasswordFromLink.error>,
) {
  try {
    const { token, password } = (req.body ?? {}) as Partial<setPasswordFromLink.body>;

    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
    }

    const account = await findLinkAccount(token);
    if (!account) return res.status(404).json({ message: INVALID_LINK });

    const hashedPassword = await bcrypt.hash(password, 10);
    const hash = hashPasswordToken(token as string);

    // Clearing the hash in the same UPDATE makes the link single-use, even
    // if it is submitted twice at the same time.
    const updated =
      account.account_type === "user"
        ? await sql`
            UPDATE users
            SET password_hash = ${hashedPassword},
                password_token_hash = NULL,
                password_token_expires_at = NULL,
                updated_at = NOW()
            WHERE user_id = ${account.id} AND password_token_hash = ${hash}
            RETURNING user_id
          `
        : await sql`
            UPDATE patients
            SET password_hash = ${hashedPassword},
                password_token_hash = NULL,
                password_token_expires_at = NULL,
                updated_at = NOW()
            WHERE patient_id = ${account.id} AND password_token_hash = ${hash}
            RETURNING patient_id
          `;
    if (updated.length === 0) return res.status(404).json({ message: INVALID_LINK });

    return res.status(200).json({
      message:
        account.account_type === "user"
          ? "Your password is set. You can log in now."
          : "Your password has been changed. Use it the next time you log in.",
      account_type: account.account_type,
    });
  } catch (error) {
    console.error("SET PASSWORD FROM LINK ERROR:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

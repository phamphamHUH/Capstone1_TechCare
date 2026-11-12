import crypto from "node:crypto";
import { ENV } from "../config/env.js";

// =========================
// "SET YOUR PASSWORD" LINKS
// =========================
// Sent in the account-created email:
// - employees: the admin doesn't set a password; the employee creates it
//   through this link and can't log in until they do.
// - patients: the front desk sets a password; the link lets the patient
//   change it to their own (the front desk password keeps working).
// Only the SHA-256 hash is stored (users/patients.password_token_hash), so a
// leaked database can't be used to open the links. One use, 7 days.

export const PASSWORD_LINK_DAYS = 7;

export const hashPasswordToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export function createPasswordLink() {
  const token = crypto.randomBytes(32).toString("base64url");
  return {
    token,
    hash: hashPasswordToken(token),
    expiresAt: new Date(Date.now() + PASSWORD_LINK_DAYS * 24 * 60 * 60 * 1000),
    url: `${ENV.APP_URL}/set-password?token=${encodeURIComponent(token)}`,
  };
}

// A password nobody knows, for employee accounts that haven't set theirs yet
// (password_hash is NOT NULL).
export const unusablePassword = () => crypto.randomBytes(32).toString("hex");

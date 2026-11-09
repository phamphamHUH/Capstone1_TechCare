import { createHash, randomBytes } from "node:crypto";

// =========================
// EMAIL LINK TOKENS
// =========================
// The raw token goes in the email link. The database only stores its
// SHA-256 hash, so someone who reads the database can't use the links.

export function createToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Shortest password allowed when a password is reset.
export const MIN_PASSWORD_LENGTH = 8;

import jwt from "jsonwebtoken";
import { ENV } from "../../../config/env.js";
import type { login } from "../dto/post.dto.js";

// =========================
// ISSUE TOKENS
// =========================
// Access token (short-lived, sent on every request) + refresh token
// (longer-lived, only sent to /api/auth/refresh). Both carry the account ID
// and account_type ("user" or "patient") so refresh knows which table to check.
export function issueTokens(accountId: string, accountType: login.accountType) {
  const claims = { user_id: accountId, account_type: accountType };
  return {
    token: jwt.sign(claims, ENV.JWT_SECRET, { expiresIn: ENV.JWT_EXPIRES_IN }),
    refreshToken: jwt.sign(claims, ENV.JWT_REFRESH_TOKEN, {
      expiresIn: ENV.JWT_REFRESH_EXPIRES_IN,
    }),
  };
}

import type { Request } from "express";
import { rateLimit, type Options } from "express-rate-limit";
import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";

// =========================
// RATE LIMITS
// =========================
// Counters live in memory (one Render instance), so they reset on restart.
// The whole clinic usually shares ONE public IP, so signed-in requests are
// counted per account, not per IP; otherwise one busy front desk could lock
// out the doctors. Requests without a valid token are counted per IP.
// Tests run without limits.

const MINUTE = 60 * 1000;
const isTest = ENV.NODE_ENV === "test";

// Shared settings: standard RateLimit-* headers and a JSON message the
// frontend already knows how to show (response.data.message).
const common = (message: string): Partial<Options> => ({
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json({ message });
  },
});

const ipOf = (req: Request) => req.ip ?? req.socket.remoteAddress ?? "unknown";

// Only a token signed with our secret identifies an account; anything else
// (missing, forged) falls back to the IP so it can't dodge the limit.
function accountOrIp(req: Request) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const claims = jwt.verify(header.slice(7).trim(), ENV.JWT_SECRET, {
        ignoreExpiration: true, // an expired token still identifies who it is
      });
      if (typeof claims !== "string" && typeof claims.user_id === "string") {
        return `account:${claims.account_type ?? "user"}:${claims.user_id}`;
      }
    } catch {
      // invalid signature: count by IP
    }
  }
  return `ip:${ipOf(req)}`;
}

// Every /api request. Generous: dashboards load several lists at once and
// reload on every live queue change. Long-lived SSE streams are not counted.
export const apiLimiter = rateLimit({
  ...common("Too many requests. Please wait a moment and try again."),
  windowMs: MINUTE,
  limit: 300,
  keyGenerator: accountOrIp,
  skip: (req) => isTest || req.path.endsWith("/stream"),
});

// POST /api/auth/login: stops password guessing. Only FAILED attempts count,
// per IP + username, so staff logging in normally are never blocked.
export const loginLimiter = rateLimit({
  ...common("Too many failed login attempts. Please wait 15 minutes and try again."),
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) =>
    `${ipOf(req)}:${String(req.body?.username ?? "").trim().toLowerCase()}`,
  skip: () => isTest,
});

// Token refresh and the emailed "set your password" links (public).
export const sensitiveAuthLimiter = rateLimit({
  ...common("Too many attempts. Please wait 15 minutes and try again."),
  windowMs: 15 * MINUTE,
  limit: 20,
  keyGenerator: (req) => `ip:${ipOf(req)}`,
  skip: () => isTest,
});

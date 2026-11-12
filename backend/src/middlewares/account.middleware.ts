import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { sql } from "../config/db.js";

export type AccountRef = { type: "user" | "patient"; id: string };

// Accepts any signed-in account (staff or patient) for the shared
// "my account" endpoints. Sets res.locals.account = { type, id }.
export default async function accountMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET!);
    if (typeof claims === "string" || typeof claims.user_id !== "string") {
      return res.status(401).json({ message: "Invalid token." });
    }

    const type = claims.account_type === "patient" ? "patient" : "user";
    const [account] =
      type === "patient"
        ? await sql`
            SELECT patient_id AS id FROM patients
            WHERE patient_id = ${claims.user_id} AND account_status = TRUE
          `
        : await sql`
            SELECT user_id AS id FROM users
            WHERE user_id = ${claims.user_id} AND account_status = TRUE
          `;
    if (!account) {
      return res.status(401).json({ message: "Account is unavailable." });
    }

    res.locals.account = { type, id: account.id } satisfies AccountRef;
    next();
  } catch (error) {
    if (
      error instanceof jwt.TokenExpiredError ||
      error instanceof jwt.JsonWebTokenError
    ) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    console.error("Unable to authenticate account:", error);
    return res.status(500).json({ message: "Unable to authenticate account." });
  }
}

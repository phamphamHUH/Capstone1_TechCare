import type { Request, Response } from "express";
import { sql } from "../../config/db.js";
import type { AccountRef } from "../../middlewares/account.middleware.js";
import type { getMyAccount } from "./dto/get.dto.js";

// =========================
// GET MY ACCOUNT
// =========================
// GET /api/auth/me — the signed-in staff member's or patient's own details.
export async function getMyAccount(
  req: Request,
  res: Response<getMyAccount.response | getMyAccount.error>,
) {
  try {
    const account = res.locals.account as AccountRef;
    const [row] =
      account.type === "patient"
        ? await sql`SELECT * FROM patients WHERE patient_id = ${account.id}`
        : await sql`SELECT * FROM users WHERE user_id = ${account.id}`;

    if (!row) return res.status(404).json({ message: "Account not found." });

    const { password_hash, password_token_hash, password_token_expires_at, ...user } =
      row;

    return res.status(200).json({
      accountType: account.type,
      user,
    } as getMyAccount.response);
  } catch (error) {
    console.error("Error loading account:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { sql } from "../config/db.js";

// Patient access tokens use user_id for the patient ID and account_type=patient.
export default async function patientMiddleware(
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
    if (typeof claims === "string" || claims.account_type !== "patient") {
      return res
        .status(403)
        .json({ message: "A patient account is required." });
    }
    if (typeof claims.user_id !== "string" || !claims.user_id) {
      return res.status(401).json({ message: "Invalid patient token." });
    }
    const [patient] = await sql`
      SELECT patient_id FROM patients
      WHERE patient_id = ${claims.user_id} AND account_status = TRUE
    `;
    if (!patient) {
      return res
        .status(401)
        .json({ message: "Patient account is unavailable." });
    }
    res.locals.patientId = patient.patient_id;
    next();
  } catch (error) {
    if (
      error instanceof jwt.TokenExpiredError ||
      error instanceof jwt.JsonWebTokenError
    ) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    console.error("Unable to authenticate patient:", error);
    return res.status(500).json({ message: "Unable to authenticate patient." });
  }
}

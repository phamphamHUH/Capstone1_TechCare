import { sql } from "../../config/db.js";
import type { Request, Response } from "express";
import type { resendMyVerification } from "./dto/post.dto.js";
import { sendPatientVerificationEmail } from "../../services/email/sendEmail.js";

// =========================
// RESEND MY VERIFICATION EMAIL
// =========================
// POST /api/patient/verification-email  (patientMiddleware)
// The patient is taken from the login token, not from the request body.
export async function resendMyVerification(
  req: Request,
  res: Response<resendMyVerification.response | resendMyVerification.error>,
) {
  try {
    const patientId = String(res.locals.patientId);

    const [patient] = await sql`
      SELECT is_verified, pending_email FROM patients WHERE patient_id = ${patientId}
    `;

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    if (patient.is_verified && !patient.pending_email) {
      return res.status(409).json({ message: "Your email is already verified." });
    }

    const emailSent = await sendPatientVerificationEmail(patientId);

    if (!emailSent) {
      return res.status(502).json({ message: "The email couldn't be sent. Please try again." });
    }

    return res.status(200).json({
      message: "We sent you a new verification link. Check your inbox and spam folder.",
    });
  } catch (error) {
    console.error("RESEND MY VERIFICATION ERROR:", error);

    return res.status(500).json({ message: "Internal Server Error" });
  }
}

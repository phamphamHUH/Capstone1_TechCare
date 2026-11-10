import { sql } from "../../config/db.js";
import { ENV } from "../../config/env.js";
import type { Email } from "./emailTemplates.js";

// =========================
// SEND EMAIL (Brevo)
// =========================
// Uses Brevo's HTTPS API. Render's free tier blocks SMTP, so Nodemailer
// with Gmail won't work there. Without BREVO_API_KEY (local development)
// the email is only logged to the console.
// Never throws: returns false and logs the error if sending fails, so
// callers can fire and forget with `void sendEmail(...)`.
export async function sendEmail(email: Email): Promise<boolean> {
  if (!email.to) return false;

  if (!ENV.BREVO_API_KEY || !ENV.EMAIL_FROM) {
    console.log(`\n[EMAIL] To: ${email.to}\n[EMAIL] Subject: ${email.subject}\n`);
    return true;
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": ENV.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: ENV.EMAIL_FROM_NAME, email: ENV.EMAIL_FROM },
        to: [{ email: email.to }],
        subject: email.subject,
        htmlContent: email.html,
      }),
    });

    if (!response.ok) {
      console.error("SEND EMAIL ERROR:", response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("SEND EMAIL ERROR:", error);
    return false;
  }
}

// =========================
// EMAIL TO A PATIENT
// =========================
// Looks up the patient's email and first name, then sends. Patients without
// an email are skipped. Never throws.
export async function sendEmailToPatient(
  patientId: string,
  createEmail: (to: string, firstName: string) => Email,
): Promise<boolean> {
  try {
    const [patient] = await sql`
      SELECT email, first_name
      FROM patients
      WHERE patient_id = ${patientId}
    `;

    if (!patient?.email) return false;

    return sendEmail(createEmail(patient.email, patient.first_name));
  } catch (error) {
    console.error("SEND EMAIL TO PATIENT ERROR:", error);
    return false;
  }
}

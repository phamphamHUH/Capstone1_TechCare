import { sql } from "../../../config/db.js";
import { sendEmailToPatient } from "../../../services/email/sendEmail.js";
import { labResultsReadyEmail } from "../../../services/email/emailTemplates.js";

// Emails the patient that one of their laboratory results was released.
export async function notifyPatientResultReleased(labItemId: string) {
  try {
    const [item] = await sql`
      SELECT lr.patient_id, s.service_name
      FROM test_request_items lri
      JOIN test_requests lr ON lr.request_id = lri.request_id
      JOIN services s ON s.service_id = lri.service_id
      WHERE lri.item_id = ${labItemId}
    `;
    if (!item) return;

    await sendEmailToPatient(String(item.patient_id), (to, firstName) =>
      labResultsReadyEmail(to, firstName, item.service_name),
    );
  } catch (error) {
    console.error("RESULT RELEASED EMAIL ERROR:", error);
  }
}

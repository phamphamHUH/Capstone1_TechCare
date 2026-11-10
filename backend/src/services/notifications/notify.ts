import { sql } from "../../config/db.js";
import {
  publishNotificationChange,
  type Recipient,
} from "../notification-sse/index.js";

// =========================
// QUEUE NOTIFICATIONS
// =========================
// Only doctors, laboratory staff and patients get notifications, and only
// about the queue. Every person has their own rows in `notifications` and
// keeps at most MAX_PER_PERSON; when a new one pushes them over, their
// oldest is deleted (nobody else's).
//
// After saving, the people concerned get a "notifications-changed" signal
// (notification-sse) and their bell reloads from REST.
// Call these AFTER the change is committed. They never throw, so they can't
// break the request that triggered them: `void notifyPatient(...)`.

export const MAX_PER_PERSON = 10;

export type StaffRole = "doctor" | "laboratory-staff";

export type NotificationType =
  | "priority-patient" // staff: a priority patient joined their queue
  | "cancellation" // staff + patient: a queue entry was cancelled
  | "queued" // patient: added to a queue
  | "called" // patient: it's their turn
  | "skipped"; // patient: they were skipped

export type NotificationContent = {
  type: NotificationType;
  title: string;
  message?: string | null;
};

// Deletes everything past the newest MAX_PER_PERSON for these people only.
async function keepNewest(recipients: Recipient[]) {
  for (const type of ["user", "patient"] as const) {
    const ids = recipients.filter((r) => r.type === type).map((r) => r.id);
    if (ids.length === 0) continue;

    await sql`
      DELETE FROM notifications
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY recipient_id
                   ORDER BY created_at DESC, id DESC
                 ) AS position
          FROM notifications
          WHERE recipient_type = ${type} AND recipient_id = ANY(${ids})
        ) ranked
        WHERE position > ${MAX_PER_PERSON}
      )
    `;
  }
}

// One patient.
export async function notifyPatient(patientId: string, { type, title, message = null }: NotificationContent) {
  try {
    await sql`
      INSERT INTO notifications (recipient_type, recipient_id, type, title, message)
      VALUES ('patient', ${patientId}, ${type}, ${title}, ${message})
    `;

    const recipients: Recipient[] = [{ type: "patient", id: patientId }];
    await keepNewest(recipients);
    publishNotificationChange(recipients);
  } catch (error) {
    console.error("NOTIFY PATIENT ERROR:", error);
  }
}

// Every active staff member with this role, except whoever caused it.
export async function notifyStaff(
  role: StaffRole,
  { type, title, message = null }: NotificationContent,
  actorUserId: string | null = null,
) {
  try {
    const rows = await sql`
      INSERT INTO notifications (recipient_type, recipient_id, type, title, message)
      SELECT 'user', u.user_id, ${type}, ${title}, ${message}
      FROM users u
      WHERE u.role = ${role}
        AND u.account_status = TRUE
        AND u.user_id IS DISTINCT FROM ${actorUserId}
      RETURNING recipient_id
    `;

    const recipients: Recipient[] = rows.map((row) => ({ type: "user", id: String(row.recipient_id) }));
    if (recipients.length === 0) return;

    await keepNewest(recipients);
    publishNotificationChange(recipients);
  } catch (error) {
    console.error("NOTIFY STAFF ERROR:", error);
  }
}

// "Juan Dela Cruz" for a patient id; falls back to the id itself.
export async function patientName(patientId: string) {
  try {
    const [patient] = await sql`
      SELECT first_name, last_name FROM patients WHERE patient_id = ${patientId}
    `;
    return patient ? `${patient.first_name} ${patient.last_name}` : patientId;
  } catch {
    return patientId;
  }
}

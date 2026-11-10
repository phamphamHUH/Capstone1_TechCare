import { sql } from "../config/db.js";

// What ONE row on the Queue Monitor screen looks like.
// IMPORTANT: Everything we send through SSE can be seen in the browser's
// devtools, so this is a small, masked version of a queue entry:
// no birthdate, no patient_id, and only the first name + last initial.
export type QueueMonitorEntry = {
  queue_id: string;
  queue_number: number;
  service_name: string;
  service_type: string; // "consultation" or "laboratory"
  room: string | null;
  is_priority: boolean;
  status: string; // always lowercase: waiting, serving, skipped, completed, cancelled
  display_name: string; // example: "Juan D."
  updated_at: string;
};

// Gets today's queue entries for the Queue Monitor.
// This is the same "today" window that getAllQueueEntries uses.
export async function getQueueMonitorEntries(): Promise<QueueMonitorEntry[]> {
  const queueEntries = await sql`
    SELECT
      qe.queue_id,
      qe.queue_number,
      COALESCE(cs.service_name, lab.service_name)               AS service_name,
      LOWER(COALESCE(cs.service_type, lab.service_type))        AS service_type,
      COALESCE(cs.room::text, lab.room)                         AS room,
      qe.is_priority,
      LOWER(qe.status)                                          AS status,
      CONCAT(p.first_name, ' ', LEFT(p.last_name, 1), '.')      AS display_name,
      qe.updated_at
    FROM queue_entries qe
    JOIN patients p ON p.patient_id = qe.patient_id
    LEFT JOIN consultation_records cr ON cr.queue_id = qe.queue_id
    LEFT JOIN services cs             ON cs.service_id = cr.service_id
    LEFT JOIN LATERAL (
      SELECT ls.service_name, ls.service_type, ls.room::text AS room
      FROM test_request_items tri
      JOIN services ls ON ls.service_id = tri.service_id
      WHERE tri.queue_id = qe.queue_id
      ORDER BY tri.item_id
      LIMIT 1
    ) lab ON TRUE
    WHERE qe.created_at >= CURRENT_DATE
      AND qe.created_at <  CURRENT_DATE + INTERVAL '1 day'
    ORDER BY qe.queue_number ASC, qe.id ASC
  `;

  return queueEntries as unknown as QueueMonitorEntry[];
}

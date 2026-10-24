import { sql } from "../../config/db.js";
import type { Request, Response } from "express";
import { skipQueueEntry } from "./dto/update.dto.js";
import { publishQueueChange } from "../../services/queue-sse/index.js";

export async function skipConsultationQueueEntry(
  req: Request,
  res: Response<skipQueueEntry.response | skipQueueEntry.error>,
) {
  try {
    // Get the queue_id of the patient who wants to skip.
    const { queue_id } = req.params;

    // Validate the queue ID.
    if (!queue_id) {
      return res.status(400).json({
        message: "Queue ID is required!",
      } as skipQueueEntry.error);
    }

    // Find the patient's current queue entry. Joining consultation_records
    // makes sure this is a consultation queue and not a laboratory one.
    const queue = await sql`
      SELECT qe.queue_id, qe.queue_number, qe.status
      FROM queue_entries qe
      JOIN consultation_records cr ON cr.queue_id = qe.queue_id
      WHERE qe.queue_id = ${queue_id}
      LIMIT 1;
    `;

    // Stop if the queue entry doesn't exist (or isn't a consultation queue).
    if (queue.length === 0) {
      return res.status(404).json({
        message: "Queue entry not found.",
      } as skipQueueEntry.error);
    }

    const { queue_number: currentQueueNumber, status } = queue[0];

    // Only waiting or serving entries can be skipped.
    if (!["waiting", "serving"].includes(String(status).toLowerCase())) {
      return res.status(409).json({
        message: `Queue entry cannot be skipped because its status is ${status}.`,
      } as skipQueueEntry.error);
    }

    // Move the next waiting patient forward by one position.
    // All consultations share one line, so "same queue" means today's
    // consultation queue entries.
    await sql`
      UPDATE queue_entries q
      SET
        queue_number = q.queue_number - 1,
        updated_at = NOW()
      WHERE q.queue_number = ${currentQueueNumber + 1}
        AND LOWER(q.status) = 'waiting'
        AND q.queue_id LIKE 'CONS-%'
        AND q.created_at >= CURRENT_DATE
        AND q.created_at <  CURRENT_DATE + INTERVAL '1 day';
    `;

    // Move the skipped patient back one position and mark the entry
    // as skipped so it can be called again later.
    const updatedQueue = await sql`
      UPDATE queue_entries
      SET
        queue_number = ${currentQueueNumber + 2},
        status = 'skipped',
        updated_at = NOW()
      WHERE queue_id = ${queue_id}
      RETURNING *;
    `;

    publishQueueChange();
    return res.status(200).json({
      message: "Queue skipped successfully and returned to the queue.",
      queue: updatedQueue[0],
    } as skipQueueEntry.response);
  } catch (error) {
    console.error("Error in skipConsultationQueueEntry controller:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    } as skipQueueEntry.error);
  }
}

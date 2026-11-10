import { sql, pool } from "../../config/db.js";
import type { PoolClient } from "@neondatabase/serverless";
import type { Request, Response } from "express";
import type { acceptConsultationQueue, completeConsultationQueueEntry, cancelConsultationQueue, skipQueueEntry } from "./dto/update.dto.js";
import { recomputeBillTotals } from "../../utils/recomputeBills.js";
import { publishQueueChange } from "../../services/queue-sse/index.js";

export async function acceptConsultationQueue(
  req: Request,
  res: Response<acceptConsultationQueue.response | acceptConsultationQueue.error>,
) {
  const { queue_id } = req.params;
  const { room } = req.body ?? {};
  if (typeof queue_id !== "string" || !queue_id.trim()) {
    return res.status(400).json({ message: "Queue ID is required." });
  }
  if (typeof room !== "string" || !room.trim()) {
    return res.status(400).json({ message: "Consultation room is required." });
  }
  const roomText = room.trim();

  try {
    // Keep the status check inside the UPDATE so two requests cannot both accept
    // the same patient. Only active consultations in this room can be served.
    const [updated] = await sql`
      UPDATE queue_entries q
      SET status = 'Serving', updated_at = NOW()
      WHERE q.queue_id = ${queue_id}
        AND q.queue_id LIKE 'CONS-%'
        AND LOWER(TRIM(q.status)) IN ('waiting', 'skipped')
        AND EXISTS (
          SELECT 1 FROM consultation_records cr
          JOIN services s ON s.service_id = cr.service_id
          WHERE cr.queue_id = q.queue_id AND cr.patient_id = q.patient_id
            AND s.room::text = ${roomText}
            AND LOWER(TRIM(cr.status)) NOT IN ('cancelled', 'canceled', 'rejected', 'completed')
        )
      RETURNING q.*
    `;

    if (!updated) {
      const [existing] = await sql`
        SELECT q.status,
          EXISTS (
            SELECT 1 FROM consultation_records cr JOIN services s ON s.service_id = cr.service_id
            WHERE cr.queue_id = q.queue_id AND cr.patient_id = q.patient_id AND s.room::text = ${roomText}
          ) AS in_room
        FROM queue_entries q
        WHERE q.queue_id = ${queue_id} AND q.queue_id LIKE 'CONS-%'
          AND EXISTS (SELECT 1 FROM consultation_records cr WHERE cr.queue_id = q.queue_id AND cr.patient_id = q.patient_id)
      `;
      if (!existing) return res.status(404).json({ message: "Consultation queue entry not found." });
      if (!existing.in_room) return res.status(403).json({ message: "This consultation belongs to a different room." });
      return res.status(409).json({ message: "Only waiting or skipped queues with an active consultation can be accepted. Refresh the queue to see its current status." });
    }

    publishQueueChange();
    return res.status(200).json({ message: "Consultation accepted and now being served.", queue: updated });
  } catch (error) {
    console.error("Unable to accept consultation queue:", error);
    return res.status(500).json({ message: "Unable to accept the consultation. Refresh the queue before trying again." });
  }
}

export async function completeConsultationQueueEntry(
  req: Request,
  res: Response<completeConsultationQueueEntry.response | completeConsultationQueueEntry.error>,
) {
  const { queue_id } = req.params;
  const { room } = req.body ?? {};

  // Validate inputs
  if (typeof queue_id !== "string" || !queue_id.trim() || queue_id.length > 255) {
    return res.status(400).json({ message: "A valid queue ID is required." });
  }
  if (typeof room !== "string" || !room.trim()) {
    return res.status(400).json({ message: "Consultation room is required." });
  }

  const roomText = room.trim();
  let client: PoolClient | undefined;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const reject = async (status: number, message: string) => {
      await client!.query("ROLLBACK");
      return res.status(status).json({ message });
    };

    // Lock the queue entry for update
    const { rows: [entry] } = await client.query(
      "SELECT * FROM queue_entries WHERE queue_id = $1 AND queue_id LIKE 'CONS-%' FOR UPDATE",
      [queue_id.trim()]
    );
    if (!entry) return await reject(404, "Consultation queue entry not found.");

    // Lock related consultation records to verify the room
    const { rows: consultations } = await client.query(
      `SELECT cr.*, s.room FROM consultation_records cr
       JOIN services s ON s.service_id = cr.service_id
       WHERE cr.queue_id = $1 AND cr.patient_id = $2
       ORDER BY cr.consultation_record_id FOR UPDATE OF cr`,
      [entry.queue_id, entry.patient_id]
    );

    if (!consultations.length) {
      return await reject(404, "Consultation records not found.");
    }

    if (consultations.some((record) => String(record.room) !== roomText)) {
      return await reject(403, "This consultation belongs to a different room.");
    }

    // Validate that the queue is actually 'Serving' right now
    if (String(entry.status).trim().toLowerCase() !== "serving") {
      return await reject(409, "Only 'Serving' queues can be marked as completed.");
    }

    // Update the queue status to 'Completed'
    const { rows: [queue] } = await client.query(
      "UPDATE queue_entries SET status = 'Completed', updated_at = NOW() WHERE queue_id = $1 RETURNING *",
      [entry.queue_id]
    );

    // Update the consultation records themselves to 'Completed' 
    const { rows: completedRecords } = await client.query(
      `UPDATE consultation_records SET status = 'Completed'
       WHERE consultation_record_id = ANY($1::text[]) RETURNING *`,
      [consultations.map((record) => record.consultation_record_id)]
    );

    await client.query("COMMIT");

    // Tell every live queue screen to reload (one shared SSE hub for all roles).
    try {
      publishQueueChange();
    } catch (error) {
      console.error("Consultation completed, but queue notification failed:", error);
    }

    return res.status(200).json({
      message: "Consultation completed successfully.",
      queue,
      consultations: completedRecords,
    } as any); // Cast as 'any' if the 'consultations' property isn't defined in completeConsultationQueueEntry.response yet
    
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(console.error);
    console.error("Unable to complete consultation queue:", error);
    return res.status(500).json({ message: "Unable to complete the consultation. Refresh the queue before trying again." });
  } finally {
    client?.release();
  }
}

export async function cancelConsultationQueue(
  req: Request,
  res: Response<cancelConsultationQueue.response | cancelConsultationQueue.error>,
) {
  const { queue_id } = req.params;
  const { room, reason } = req.body ?? {};
  if (typeof queue_id !== "string" || !queue_id.trim() || queue_id.length > 255) {
    return res.status(400).json({ message: "A valid queue ID is required." });
  }
  if (typeof room !== "string" || !room.trim()) {
    return res.status(400).json({ message: "Consultation room is required." });
  }

const roomText = room.trim();
  if (typeof reason !== "string" || !reason.trim() || reason.trim().length > 255) {
    return res.status(400).json({ message: "Cancellation reason is required and must not exceed 255 characters." });
  }

  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const reject = async (status: number, message: string) => {
      await client!.query("ROLLBACK");
      return res.status(status).json({ message });
    };

    // Lock the queue first, as front desk cancellation does, then its clinical
    // records. Concurrent accepts/cancellations must see the committed status.
    const { rows: [entry] } = await client.query(
      "SELECT * FROM queue_entries WHERE queue_id = $1 AND queue_id LIKE 'CONS-%' FOR UPDATE",
      [queue_id.trim()],
    );
    if (!entry) return await reject(404, "Consultation queue entry not found.");
    const { rows: consultations } = await client.query(
      `SELECT cr.*, s.room FROM consultation_records cr
       JOIN services s ON s.service_id = cr.service_id
       WHERE cr.queue_id = $1 AND cr.patient_id = $2
       ORDER BY cr.consultation_record_id FOR UPDATE OF cr`,
      [entry.queue_id, entry.patient_id],
    );
    if (!consultations.length) return await reject(404, "Consultation queue entry not found.");
    if (consultations.some((record) => String(record.room) !== roomText)) {
      return await reject(403, "This consultation belongs to a different room.");
    }
    const activeStatuses = ["created", "in queue", "waiting", "skipped", "serving"];
    if (!["waiting", "skipped", "serving"].includes(String(entry.status).trim().toLowerCase()) ||
        consultations.some((record) => !activeStatuses.includes(String(record.status).trim().toLowerCase()))) {
      return await reject(409, "Only waiting, skipped or serving queues with active consultations can be cancelled.");
    }

    const { rows: [queue] } = await client.query(
      "UPDATE queue_entries SET status = 'Cancelled', updated_at = NOW() WHERE queue_id = $1 RETURNING *",
      [entry.queue_id],
    );
    const { rows: cancelled } = await client.query(
      `UPDATE consultation_records SET status = 'Cancelled', cancellation_reason = $1
       WHERE consultation_record_id = ANY($2::text[]) RETURNING *`,
      [reason.trim(), consultations.map((record) => record.consultation_record_id)],
    );
    const billIds = [...new Set(consultations.map((record) => record.bill_id as string | null).filter((id): id is string => Boolean(id)))].sort();
    for (const billId of billIds) await recomputeBillTotals(client, billId);
    await client.query("COMMIT");

    publishQueueChange();
    void notifyCancelled(entry.patient_id, "consultation", actorId(req), reason.trim());
    return res.status(200).json({
      message: "Consultation request cancelled successfully.",
      queue,
      consultations: cancelled,
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(console.error);
    console.error("Unable to cancel consultation queue:", error);
    return res.status(500).json({ message: "Unable to cancel the consultation. Refresh the queue before trying again." });
  } finally {
    client?.release();
  }
}

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
      SELECT qe.queue_id, qe.queue_number, qe.status, qe.skip_count
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

    const { queue_number: currentQueueNumber, status, skip_count } = queue[0];

    // Only waiting or serving entries can be skipped.
    if (!["waiting", "serving", "skipped"].includes(String(status).trim().toLowerCase())) {
      return res.status(409).json({
        message: `Queue entry cannot be skipped because its status is ${status}.`,
      } as skipQueueEntry.error);
    }

    // Check the limit BEFORE shifting anyone.
    // COALESCE treats a NULL skip_count as 0.
    if ((skip_count ?? 0) >= 3) {
      return res.status(409).json({
        message: "Maximum skips reached. Cancel this consultation instead.",
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
        skip_count = COALESCE(skip_count, 0) + 1,
        status = 'skipped',
        updated_at = NOW()
      WHERE queue_id = ${queue_id}
      RETURNING *;
    `;

    publishQueueChange();
    if (updatedQueue[0]) void notifySkipped(updatedQueue[0].patient_id, "consultation");
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

import { sql, pool } from "../../config/db.js";
import type { Request, Response } from "express";
import type {
  acceptQueueEntry,
  completeQueueEntry,
  skipQueueEntry,
  cancelQueueEntry,
  startLaboratoryAnalysis,
  releaseLaboratoryResult,
} from "./dto/update.dto.js";
import { publishQueueChange } from "../../services/queue-sse/index.js";
import { sendEmailToPatient } from "../../services/email/sendEmail.js";
import { labResultsReadyEmail } from "../../services/email/emailTemplates.js";
export async function acceptQueueEntry(
  req: Request,
  res: Response<acceptQueueEntry.response | acceptQueueEntry.error>,
) {
  try {
    const { queue_id } = req.params;
    const { room } = req.body as acceptQueueEntry.body;

    if (!queue_id) {
      return res
        .status(400)
        .json({ message: "Queue ID is required!" } as acceptQueueEntry.error);
    }
    if (room === undefined || room === null || room === "") {
      return res
        .status(400)
        .json({ message: "room is required" } as acceptQueueEntry.error);
    }

    const roomText = String(room);

    const [updated] = await sql`
      UPDATE queue_entries q
      SET
        status = 'Serving',
        updated_at = NOW()
      WHERE q.queue_id = ${queue_id}
        AND q.queue_id LIKE 'LAB-%'
        AND LOWER(q.status) IN ('waiting', 'skipped')
        AND EXISTS (
          SELECT 1
          FROM laboratory_request_items lri
          JOIN services s ON s.service_id = lri.service_id
          WHERE lri.queue_id = q.queue_id
            AND s.room::text = ${roomText}
        )
      RETURNING q.*
    `;

    if (!updated) {
      const [existing] = await sql`
        SELECT
          q.status,
          EXISTS (
            SELECT 1
            FROM laboratory_request_items lri
            JOIN services s ON s.service_id = lri.service_id
            WHERE lri.queue_id = q.queue_id
              AND s.room::text = ${roomText}
          ) AS in_room
        FROM queue_entries q
        WHERE q.queue_id = ${queue_id}
          AND q.queue_id LIKE 'LAB-%'
      `;

      if (!existing) {
        return res.status(404).json({
          message: "Queue entry not found.",
        } as acceptQueueEntry.error);
      }
      if (!existing.in_room) {
        return res.status(403).json({
          message: "This queue belongs to a different room.",
        } as acceptQueueEntry.error);
      }
      return res.status(409).json({
        message: `Queue is ${existing.status} and can't be accepted.`,
      } as acceptQueueEntry.error);
    }

    publishQueueChange();
    return res.status(200).json({
      message: "Queue entry accepted and now being served.",
      queue: updated,
    } as acceptQueueEntry.response);
  } catch (error) {
    console.error("Unable to accept queue", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error" } as acceptQueueEntry.error);
  }
}

export async function completeQueueEntry(
  req: Request,
  res: Response<completeQueueEntry.response | completeQueueEntry.error>,
) {
  try {
    const { queue_id } = req.params;
    const { room } = (req.body ?? {}) as completeQueueEntry.body;

    if (!queue_id) {
      return res.status(400).json({
        message: "Queue ID is required!",
      } as completeQueueEntry.error);
    }

    if (typeof room !== "string" || !room.trim()) {
      return res.status(400).json({
        message: "room is required",
      } as completeQueueEntry.error);
    }

    const [updated] = await sql`
      WITH completed_queue AS (
        UPDATE queue_entries q
        SET
          status = 'Completed',
          updated_at = CASE
            WHEN LOWER(q.status) = 'completed' THEN q.updated_at
            ELSE NOW()
          END
        WHERE q.queue_id = ${queue_id}
          AND q.queue_id LIKE 'LAB-%'
          AND LOWER(q.status) IN ('serving', 'completed')
          AND EXISTS (
            SELECT 1
            FROM laboratory_request_items ri
            JOIN services item_service
              ON item_service.service_id = ri.service_id
            WHERE ri.queue_id = q.queue_id
              AND item_service.room::text = ${room}
          )
          AND (
            LOWER(q.status) = 'completed'
            OR EXISTS (
              SELECT 1
              FROM laboratory_request_items ri
              JOIN services item_service
                ON item_service.service_id = ri.service_id
              WHERE ri.queue_id = q.queue_id
                AND item_service.room::text = ${room}
                AND LOWER(ri.status) IN (
                  'requested',
                  'waiting',
                  'serving',
                  'specimen collected'
                )
            )
          )
        RETURNING q.*
      ),
      collected_items AS (
        UPDATE laboratory_request_items ri
        SET
          status = 'Specimen Collected',
          updated_at = NOW()
        FROM completed_queue cq, services s
        WHERE ri.queue_id = cq.queue_id
          AND s.service_id = ri.service_id
          AND s.room::text = ${room}
          AND LOWER(ri.status) IN (
            'requested',
            'waiting',
            'serving'
          )
        RETURNING ri.lab_item_id
      )
      SELECT
        cq.*,
        (SELECT COUNT(*)::int FROM collected_items) AS collected_item_count
      FROM completed_queue cq
    `;

    if (!updated) {
      const [existing] = await sql`
        SELECT
          q.status,
          EXISTS (
            SELECT 1
            FROM laboratory_request_items ri
            JOIN services s ON s.service_id = ri.service_id
            WHERE ri.queue_id = q.queue_id
              AND s.room::text = ${room}
          ) AS in_room
        FROM queue_entries q
        WHERE q.queue_id = ${queue_id}
          AND q.queue_id LIKE 'LAB-%'
      `;

      if (!existing) {
        return res.status(404).json({
          message: "Queue entry not found.",
        } as completeQueueEntry.error);
      }

      if (!existing.in_room) {
        return res.status(403).json({
          message: "This queue belongs to a different room.",
        } as completeQueueEntry.error);
      }

      if (String(existing.status).toLowerCase() === "serving") {
        return res.status(409).json({
          message:
            "No laboratory request items are available for specimen collection in this room.",
        } as completeQueueEntry.error);
      }

      return res.status(409).json({
        message: "Queue is " + existing.status + " and can't be completed.",
      } as completeQueueEntry.error);
    }

    const { collected_item_count, ...queue } = updated;

    publishQueueChange();
    return res.status(200).json({
      message: "Queue entry completed.",
      queue,
      collected_item_count,
    } as completeQueueEntry.response);
  } catch (error) {
    console.error("Unable to complete queue", error);

    return res.status(500).json({
      message: "Internal Server Error",
    } as completeQueueEntry.error);
  }
}

export async function skipQueueEntry(
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

    // Find the patient's current queue entry.
    // The room now comes from the lab items attached to this queue,
    // since queue_entries no longer has a service_id.
    const queue = await sql`
      SELECT
        qe.queue_id,
        qe.queue_number,
        qe.status,
        (
          SELECT s.room::text
          FROM laboratory_request_items lri
          JOIN services s ON s.service_id = lri.service_id
          WHERE lri.queue_id = qe.queue_id
          ORDER BY lri.lab_item_id
          LIMIT 1
        ) AS room
      FROM queue_entries qe
      WHERE qe.queue_id = ${queue_id}
      LIMIT 1;
    `;

    // Stop if the queue entry doesn't exist.
    if (queue.length === 0) {
      return res.status(404).json({
        message: "Queue entry not found.",
      } as skipQueueEntry.error);
    }

    const { queue_number: currentQueueNumber, room, status } = queue[0];

    // Only waiting or serving entries can be skipped.
    if (!["waiting", "serving"].includes(String(status).toLowerCase())) {
      return res.status(409).json({
        message: `Queue entry cannot be skipped because its status is ${status}.`,
      } as skipQueueEntry.error);
    }

    // Move the next waiting patient forward by one position.
    // "Same queue" now means: a queue with lab items in the same room.
    await sql`
      UPDATE queue_entries q
      SET
        queue_number = q.queue_number - 1,
        updated_at = NOW()
      WHERE q.queue_number = ${currentQueueNumber + 1}
        AND LOWER(q.status) = 'waiting'
        AND EXISTS (
          SELECT 1
          FROM laboratory_request_items lri
          JOIN services s ON s.service_id = lri.service_id
          WHERE lri.queue_id = q.queue_id
            AND s.room::text = ${room}
        );
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
    console.error("Error in skipQueueEntry controller:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    } as skipQueueEntry.error);
  }
}

export async function cancelQueueEntry(
  req: Request,
  res: Response<cancelQueueEntry.response | cancelQueueEntry.error>,
) {
  try {
    const { queue_id } = req.params;
    const { reason } = req.body as cancelQueueEntry.body;

    if (!queue_id) {
      return res.status(400).json({
        message: "Queue ID is required!",
      } as cancelQueueEntry.error);
    }

    if (typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({
        message: "Cancellation reason is required!",
      } as cancelQueueEntry.error);
    }

    const cancellationReason = reason.trim();

    if (cancellationReason.length > 255) {
      return res.status(400).json({
        message: "Cancellation reason must not exceed 255 characters.",
      } as cancelQueueEntry.error);
    }

    // Find the queue entry.
    const queue = await sql`
      SELECT queue_id, queue_number, service_id, status
      FROM queue_entries
      WHERE queue_id = ${queue_id}
      LIMIT 1;
    `;

    if (queue.length === 0) {
      return res.status(404).json({
        message: "Queue entry not found.",
      } as cancelQueueEntry.error);
    }

    const { status } = queue[0];

    // Only waiting, skipped, or serving entries can be cancelled.
    if (
      !["waiting", "skipped", "serving"].includes(String(status).toLowerCase())
    ) {
      return res.status(409).json({
        message: `Queue entry cannot be cancelled because its status is ${status}.`,
      } as cancelQueueEntry.error);
    }

    // Cancel the queue entry.
    const updatedQueue = await sql`
      UPDATE queue_entries
      SET
        status = 'Cancelled',
        updated_at = NOW()
      WHERE queue_id = ${queue_id}
        AND LOWER(status) IN ('waiting', 'skipped', 'serving')
      RETURNING *;
    `;

    if (updatedQueue.length === 0) {
      return res.status(409).json({
        message: "Queue entry status changed. Please try again.",
      } as cancelQueueEntry.error);
    }

    // Store the cancellation reason against the associated
    // laboratory request item.
    const updatedItems = await sql`
      UPDATE laboratory_request_items
      SET
        reason = ${cancellationReason},
        updated_at = NOW()
      WHERE queue_id = ${queue_id}
      RETURNING lab_item_id, request_id, queue_id, reason;
    `;

    publishQueueChange();
    return res.status(200).json({
      message: "Queue cancelled successfully.",
      queue: updatedQueue[0],
      reason: cancellationReason,
      laboratory_items: updatedItems,
    } as cancelQueueEntry.response);
  } catch (error) {
    console.error("Error in cancelQueueEntry controller:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    } as cancelQueueEntry.error);
  }
}

export async function startLaboratoryAnalysis(
  req: Request,
  res: Response<
    startLaboratoryAnalysis.response | startLaboratoryAnalysis.error
  >,
) {
  const { room, lab_item_ids } = (req.body ??
    {}) as startLaboratoryAnalysis.body;
  if (
    typeof room !== "string" ||
    !room.trim() ||
    !Array.isArray(lab_item_ids) ||
    !lab_item_ids.length ||
    lab_item_ids.length > 100 ||
    lab_item_ids.some((id) => typeof id !== "string" || !id.trim()) ||
    new Set(lab_item_ids).size !== lab_item_ids.length
  ) {
    return res.status(400).json({
      message: "A room and distinct laboratory item IDs are required.",
    } as startLaboratoryAnalysis.error);
  }
  try {
    const items = await sql`
      WITH eligible AS MATERIALIZED (
        SELECT ri.lab_item_id FROM laboratory_request_items ri
        JOIN services s ON s.service_id = ri.service_id
        WHERE ri.lab_item_id = ANY(${lab_item_ids}::text[]) AND s.room = ${room}
          AND ri.status IN ('Specimen Collected', 'In Progress')
          AND NOT EXISTS (SELECT 1 FROM laboratory_results r WHERE r.lab_item_id = ri.lab_item_id)
        FOR UPDATE OF ri
      )
      UPDATE laboratory_request_items ri SET status = 'In Progress',
        updated_at = CASE WHEN ri.status = 'In Progress' THEN ri.updated_at ELSE NOW() END
      WHERE ri.lab_item_id IN (SELECT lab_item_id FROM eligible)
        AND (SELECT count(*) FROM eligible) = ${lab_item_ids.length}
      RETURNING ri.lab_item_id, ri.status
    `;
    if (items.length !== lab_item_ids.length)
      return res.status(409).json({
        message:
          "Some tests are already completed or are not collected samples in this room. Refresh the list.",
      } as startLaboratoryAnalysis.error);
    return res.json({
      items: items as unknown as startLaboratoryAnalysis.item[],
    } as startLaboratoryAnalysis.response);
  } catch (error) {
    console.error("Unable to start analysis:", error);
    return res.status(500).json({
      message: "Unable to start analysis.",
    } as startLaboratoryAnalysis.error);
  }
}

export async function releaseLaboratoryResult(
  req: Request,
  res: Response<
    releaseLaboratoryResult.response | releaseLaboratoryResult.error
  >,
) {
  try {
    const { result_id } = req.params;

    if (!result_id) {
      return res.status(400).json({
        message: "Result ID is required.",
      } as releaseLaboratoryResult.error);
    }

    const [result] = await sql`
      UPDATE laboratory_results
      SET
        status = 'Released',
        updated_at = NOW()
      WHERE result_id = ${result_id}
        AND status = 'Pending'
      RETURNING result_id, lab_item_id, status, updated_at;
    `;

    if (!result) {
      const [existing] = await sql`
        SELECT result_id, status
        FROM laboratory_results
        WHERE result_id = ${result_id}
        LIMIT 1;
      `;

      if (!existing) {
        return res.status(404).json({
          message: "Laboratory result not found.",
        } as releaseLaboratoryResult.error);
      }

      return res.status(409).json({
        message: `Result cannot be released because its status is ${existing.status}.`,
      } as releaseLaboratoryResult.error);
    }

    // Tell the patient (information only, not awaited).
    void notifyPatientResultReleased(String(result.lab_item_id));

    return res.status(200).json({
      message: "Laboratory result released successfully.",
      result,
    } as releaseLaboratoryResult.response);
  } catch (error) {
    console.error("Unable to release laboratory result:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    } as releaseLaboratoryResult.error);
  }
}

// Emails the patient that one of their laboratory results was released.
async function notifyPatientResultReleased(labItemId: string) {
  try {
    const [item] = await sql`
      SELECT lr.patient_id, s.service_name
      FROM laboratory_request_items lri
      JOIN laboratory_requests lr ON lr.request_id = lri.request_id
      JOIN services s ON s.service_id = lri.service_id
      WHERE lri.lab_item_id = ${labItemId}
    `;
    if (!item) return;

    await sendEmailToPatient(String(item.patient_id), (to, firstName) =>
      labResultsReadyEmail(to, firstName, item.service_name),
    );
  } catch (error) {
    console.error("RESULT RELEASED EMAIL ERROR:", error);
  }
}

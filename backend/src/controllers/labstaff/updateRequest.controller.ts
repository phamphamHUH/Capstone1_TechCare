import { sql, pool } from "../../config/db.js";
import type { Request, Response } from "express";
import type {
  acceptQueueEntry,
  completeQueueEntry,
  skipQueueEntry,
  cancelQueueEntry,
  startLaboratoryAnalysis,
  releaseLaboratoryResult,
  verifyLaboratoryResult,
} from "./dto/update.dto.js";
import { publishQueueChange } from "../../services/queue-sse/index.js";
import {
  actorId,
  notifyCalled,
  notifyCancelled,
  notifySkipped,
} from "../../services/notifications/index.js";
import { notifyPatientResultReleased } from "./utils/notifyPatientResultReleased.js";
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
        AND (q.queue_id LIKE 'LAB-%' OR q.queue_id LIKE 'IMG-%') -- laboratory and imaging queues
        AND LOWER(q.status) IN ('waiting', 'skipped')
        AND EXISTS (
          SELECT 1
          FROM test_request_items tri
          JOIN services s ON s.service_id = tri.service_id
          WHERE tri.queue_id = q.queue_id
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
            FROM test_request_items tri
            JOIN services s ON s.service_id = tri.service_id
            WHERE tri.queue_id = q.queue_id
              AND s.room::text = ${roomText}
          ) AS in_room
        FROM queue_entries q
        WHERE q.queue_id = ${queue_id}
          AND (q.queue_id LIKE 'LAB-%' OR q.queue_id LIKE 'IMG-%') -- laboratory and imaging queues
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
    void notifyCalled(updated.patient_id, "laboratory", roomText);
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
          AND (q.queue_id LIKE 'LAB-%' OR q.queue_id LIKE 'IMG-%') -- laboratory and imaging queues
          AND LOWER(q.status) IN ('serving', 'completed')
          AND EXISTS (
            SELECT 1
            FROM test_request_items ri
            JOIN services item_service
              ON item_service.service_id = ri.service_id
            WHERE ri.queue_id = q.queue_id
              AND item_service.room::text = ${room}
          )
          AND (
            LOWER(q.status) = 'completed'
            OR EXISTS (
              SELECT 1
              FROM test_request_items ri
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
        UPDATE test_request_items ri
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
        RETURNING ri.item_id
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
            FROM test_request_items ri
            JOIN services s ON s.service_id = ri.service_id
            WHERE ri.queue_id = q.queue_id
              AND s.room::text = ${room}
          ) AS in_room
        FROM queue_entries q
        WHERE q.queue_id = ${queue_id}
          AND (q.queue_id LIKE 'LAB-%' OR q.queue_id LIKE 'IMG-%') -- laboratory and imaging queues
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

    // Find the patient's current queue entry. The EXISTS check makes sure this
    // is a laboratory queue and not a consultation one. The room comes from
    // the lab items attached to this queue, since queue_entries no longer has
    // a service_id.
    const queue = await sql`
      SELECT
        qe.queue_id,
        qe.queue_number,
        qe.status,
        (
          SELECT s.room::text
          FROM test_request_items tri
          JOIN services s ON s.service_id = tri.service_id
          WHERE tri.queue_id = qe.queue_id
          ORDER BY tri.item_id
          LIMIT 1
        ) AS room
      FROM queue_entries qe
      WHERE qe.queue_id = ${queue_id}
        AND EXISTS (
          SELECT 1
          FROM test_request_items tri
          WHERE tri.queue_id = qe.queue_id
        )
      LIMIT 1;
    `;

    // Stop if the queue entry doesn't exist (or isn't a laboratory queue).
    if (queue.length === 0) {
      return res.status(404).json({
        message: "Queue entry not found.",
      } as skipQueueEntry.error);
    }

    const { queue_number: currentQueueNumber, room, status } = queue[0];

    // Only waiting, serving or skipped entries can be skipped.
    if (
      !["waiting", "serving", "skipped"].includes(
        String(status).trim().toLowerCase(),
      )
    ) {
      return res.status(409).json({
        message: `Queue entry cannot be skipped because its status is ${status}.`,
      } as skipQueueEntry.error);
    }

    // Move the next waiting patient forward by one position.
    // "Same queue" means: same type (LAB- or IMG-, numbered separately),
    // items in the same room, and created today.
    await sql`
      UPDATE queue_entries q
      SET
        queue_number = q.queue_number - 1,
        updated_at = NOW()
      WHERE q.queue_number = ${currentQueueNumber + 1}
        AND LOWER(q.status) = 'waiting'
        AND LEFT(q.queue_id, 4) = LEFT(${queue_id}, 4)
        AND q.created_at >= CURRENT_DATE
        AND q.created_at <  CURRENT_DATE + INTERVAL '1 day'
        AND EXISTS (
          SELECT 1
          FROM test_request_items tri
          JOIN services s ON s.service_id = tri.service_id
          WHERE tri.queue_id = q.queue_id
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
    if (updatedQueue[0])
      void notifySkipped(updatedQueue[0].patient_id, "laboratory");
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
      UPDATE test_request_items
      SET
        reason = ${cancellationReason},
        updated_at = NOW()
      WHERE queue_id = ${queue_id}
      RETURNING item_id, request_id, queue_id, reason;
    `;

    publishQueueChange();
    void notifyCancelled(
      updatedQueue[0].patient_id,
      "laboratory",
      actorId(req),
      cancellationReason,
    );
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
  const { room, item_ids } = (req.body ?? {}) as startLaboratoryAnalysis.body;
  if (
    typeof room !== "string" ||
    !room.trim() ||
    !Array.isArray(item_ids) ||
    !item_ids.length ||
    item_ids.length > 100 ||
    item_ids.some((id) => typeof id !== "string" || !id.trim()) ||
    new Set(item_ids).size !== item_ids.length
  ) {
    return res.status(400).json({
      message: "A room and distinct laboratory item IDs are required.",
    } as startLaboratoryAnalysis.error);
  }
  try {
    const items = await sql`
      WITH eligible AS MATERIALIZED (
        SELECT ri.item_id FROM test_request_items ri
        JOIN services s ON s.service_id = ri.service_id
        WHERE ri.item_id = ANY(${item_ids}::text[]) AND s.room = ${room}
          AND ri.status IN ('Specimen Collected', 'In Progress')
          AND NOT EXISTS (SELECT 1 FROM test_results r WHERE r.item_id = ri.item_id)
        FOR UPDATE OF ri
      )
      UPDATE test_request_items ri SET status = 'In Progress',
        updated_at = CASE WHEN ri.status = 'In Progress' THEN ri.updated_at ELSE NOW() END
      WHERE ri.item_id IN (SELECT item_id FROM eligible)
        AND (SELECT count(*) FROM eligible) = ${item_ids.length}
      RETURNING ri.item_id, ri.status
    `;
    if (items.length !== item_ids.length)
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

// The lab's verification step: a staff member checks the saved result
// (Pending -> Verified). Release is only allowed after this.
export async function verifyLaboratoryResult(
  req: Request,
  res: Response<verifyLaboratoryResult.response | verifyLaboratoryResult.error>,
) {
  try {
    const { result_id } = req.params;
    const verifier =
      (req.user as { user_id?: string } | undefined)?.user_id ?? null;

    if (!result_id) {
      return res.status(400).json({ message: "Result ID is required." });
    }

    const [result] = await sql`
      UPDATE test_results
      SET
        status = 'Verified',
        verified_by = ${verifier},
        verified_at = NOW(),
        updated_at = NOW()
      WHERE result_id = ${result_id}
        AND status = 'Pending'
      RETURNING result_id, item_id, status, verified_by, verified_at, updated_at;
    `;

    if (!result) {
      const [existing] = await sql`
        SELECT status FROM test_results WHERE result_id = ${result_id} LIMIT 1
      `;
      if (!existing) {
        return res
          .status(404)
          .json({ message: "Laboratory result not found." });
      }
      return res.status(409).json({
        message: `Result cannot be verified because its status is ${existing.status}.`,
      });
    }

    return res.status(200).json({
      message: "Laboratory result verified.",
      result,
    });
  } catch (error) {
    console.error("Unable to verify laboratory result:", error);
    return res.status(500).json({ message: "Internal Server Error" });
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

    const releaser =
      (req.user as { user_id?: string } | undefined)?.user_id ?? null;

    // Only verified results can be released (the clinic verifies first).
    const [result] = await sql`
      UPDATE test_results
      SET
        status = 'Released',
        released_at = NOW(),
        released_by = ${releaser},
        updated_at = NOW()
      WHERE result_id = ${result_id}
        AND status = 'Verified'
      RETURNING result_id, item_id, status, released_at, updated_at;
    `;

    if (!result) {
      const [existing] = await sql`
        SELECT result_id, status
        FROM test_results
        WHERE result_id = ${result_id}
        LIMIT 1;
      `;

      if (!existing) {
        return res.status(404).json({
          message: "Laboratory result not found.",
        } as releaseLaboratoryResult.error);
      }

      return res.status(409).json({
        message:
          existing.status === "Pending"
            ? "Verify the result before releasing it."
            : `Result cannot be released because its status is ${existing.status}.`,
      } as releaseLaboratoryResult.error);
    }

    // Tell the patient (information only, not awaited).
    void notifyPatientResultReleased(String(result.item_id));

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

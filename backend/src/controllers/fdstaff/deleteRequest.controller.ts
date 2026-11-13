import { sql, pool } from "../../config/db.js";
import type { PoolClient } from "pg";
import type { Request, Response } from "express";
import type { deleteQueue, deletePatient } from "./dto/delete.dto.js";
import { publishQueueChange } from "../../services/queue-sse/index.js";
import { actorId, notifyCancelled } from "../../services/notifications/index.js";
export async function deleteQueue(
  req: Request,
  res: Response<deleteQueue.response | deleteQueue.error>,
) {
  let client: PoolClient | undefined;
  try {
    const { queue_id } = req.params;
    client = await pool.connect();
    await client.query("BEGIN");
    const {
      rows: [entry],
    } = await client.query(
      "SELECT status FROM queue_entries WHERE queue_id = $1 FOR UPDATE",
      [queue_id],
    );
    if (!entry) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Queue not found",
      } as deleteQueue.error);
    }
    if (
      !["waiting", "cancelled"].includes(String(entry.status).toLowerCase())
    ) {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({ error: "Only waiting queue entries can be cancelled." });
    }
    // Keep the queue and its linked clinical records for history. Deleting the
    // queue previously failed its laboratory/consultation foreign keys.
    await client.query(
      "UPDATE queue_entries SET status = 'Cancelled', updated_at = NOW() WHERE queue_id = $1",
      [queue_id],
    );
    await client.query(
      "UPDATE test_request_items SET status = 'Cancelled', updated_at = NOW() WHERE queue_id = $1 AND LOWER(status) = 'waiting'",
      [queue_id],
    );
    await client.query(
      "UPDATE consultation_records SET status = 'Cancelled', cancellation_reason = 'Cancelled by front desk' WHERE queue_id = $1 AND LOWER(status) IN ('created', 'in queue')",
      [queue_id],
    );
    await client.query("COMMIT");
    publishQueueChange();
    // LAB-/IMG-... queues belong to the laboratory, CON-/CONS-... to the doctors.
    if (String(entry.status).toLowerCase() === "waiting") {
      const kind = /^(LAB|IMG)-/.test(String(queue_id)) ? "laboratory" : "consultation";
      void notifyCancelled(entry.patient_id, kind, actorId(req), "Cancelled by front desk");
    }
    return res.status(200).json({
      message: "Queue entry cancelled successfully",
    } as deleteQueue.response);
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(console.error);
    console.error(error);

    return res.status(500).json({
      error: "Error deleting queue",
    } as deleteQueue.error);
  } finally {
    client?.release();
  }
}

export async function deletePatient(
  req: Request,
  res: Response<deletePatient.response | deletePatient.error>,
) {
  try {
    const { patient_id } = req.params;

    // Delete the patient record.
    // RETURNING returns the deleted row so we can verify it existed.
    const deletedPatient = await sql`
      DELETE FROM patients
      WHERE patient_id = ${patient_id}
      RETURNING patient_id;
    `;

    // If nothing was returned, no patient with that ID existed.
    if (deletedPatient.length === 0) {
      return res.status(404).json({
        message: "Patient not found",
        error: "Patient not found",
      } as deletePatient.error);
    }
    publishQueueChange();
    return res.status(200).json({
      message: "Patient deleted successfully",
    } as deletePatient.response);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Error deleting patient",
      error: "Error deleting patient",
    } as deletePatient.error);
  }
}

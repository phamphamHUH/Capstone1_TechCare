import bcrypt from "bcryptjs";
import cloudinary from "../../config/cloudinary.js";
import { sql, pool } from "../../config/db.js";
import type { PoolClient } from "@neondatabase/serverless";
import { generateLaboratoryQueueId, generateQueueNumberLaboratory } from "../../utils/generateId.js";
import { publishQueueChange } from "../../services/queue-sse/index.js";
import { calculateAge } from "../../utils/calculateAge.js";
import type { Request, Response } from "express";
import type {
  updatePatient,
  serveQueueEntry,
  skipQueueEntry,
  confirmLabRequestPayment,
} from "./dto/update.dto.js";

export async function updatePatient(
  req: Request,
  res: Response<updatePatient.response | updatePatient.error>,
) {
  // PUT /api/fdstaff/patients/:patient_id

  try {
    const { patient_id } = req.params;

    const {
      username,
      password,
      first_name,
      middle_name,
      last_name,
      suffix,
      sex,
      email,
      address,
      contact_number,
      civil_status,
      blood_type,
      birthdate,
      emergency_contact_name,
      emergency_contact,
    } = req.body as updatePatient.body;

    if (!patient_id) {
      return res.status(400).json({
        message: "Patient_id is missing.",
      } as updatePatient.error);
    }

    const existingPatient = await sql`
            SELECT patient_id
            FROM patients
            WHERE patient_id = ${patient_id}
        `;

    if (existingPatient.length === 0) {
      return res.status(404).json({
        message: "Patient not found.",
      } as updatePatient.error);
    }

    let hashedPassword = null;

    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const [updatedPatient] = await sql`
            UPDATE patients
            SET
                username = COALESCE(${username}, username),
                password_hash = COALESCE(${hashedPassword}, password_hash),
                first_name = COALESCE(${first_name}, first_name),
                middle_name = COALESCE(${middle_name}, middle_name),
                last_name = COALESCE(${last_name}, last_name),
                suffix = COALESCE(${suffix}, suffix),
                sex = COALESCE(${sex}, sex),
                email = COALESCE(${email}, email),
                address = COALESCE(${address}, address),
                birthdate = COALESCE(${birthdate}, birthdate),
                contact_number = COALESCE(${contact_number}, contact_number),
                emergency_contact_name =  COALESCE(${emergency_contact_name}, emergency_contact_name),
                emergency_contact = COALESCE(${emergency_contact}, emergency_contact),
                civil_status = COALESCE(${civil_status}, civil_status),
                blood_type = COALESCE(${blood_type}, blood_type),
                updated_at = CURRENT_TIMESTAMP
            WHERE patient_id = ${patient_id}
            RETURNING *;
        `;
    const age = calculateAge(updatedPatient.birthdate);

    return res.status(200).json({
      message: "Patient updated successfully.",
      patient: { ...updatedPatient, age } as unknown as updatePatient.patient,
    } as updatePatient.response);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error.",
    } as updatePatient.error);
  }
}

export async function serveQueueEntry(
  req: Request,
  res: Response<serveQueueEntry.response | serveQueueEntry.error>,
) {
  try {
    const { queue_id } = req.params;

    if (!queue_id) {
      return res.status(400).json({
        message: "queue_id is required.",
      } as serveQueueEntry.error);
    }

    // Get the queue entry first the queuenumvber and quee service type
    const queue = await sql`
      SELECT queue_number, service_type
      FROM queue_entries
      WHERE queue_id = ${queue_id};
    `;

    if (queue.length === 0) {
      return res.status(404).json({
        message: "Queue entry not found.",
      } as serveQueueEntry.error);
    }

    const { queue_number, service_type } = queue[0];

    // Mark the queue ids status to serving
    const existingQueueEntry = await sql`
      UPDATE queue_entries
      SET
        status = 'serving',
        queue_number = 0
      WHERE queue_id = ${queue_id}
      RETURNING *;
    `;

    // Shift everyone behind it
    const updateQueueBehind = await sql`
      UPDATE queue_entries
      SET queue_number = queue_number - 1
      WHERE
        queue_number > ${queue_number}
        AND service_type = ${service_type}
        AND status = 'waiting'
      RETURNING *;
    `;

    return res.status(200).json({
      message: "Queue entry called successfully.",
      existingQueueEntry,
      updateQueueBehind,
    } as serveQueueEntry.response);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error.",
    } as serveQueueEntry.error);
  }
}

export async function skipQueueEntry(
  req: Request,
  res: Response<skipQueueEntry.response | skipQueueEntry.error>,
) {
  try {
    // Get the queue_id of the patient who wants to skip.
    const { queue_id } = req.params;

    // Find the patient's current queue number and service type.
    // We need the service_type so we only touch the same queue,
    // and the queue_number so we know who is immediately behind them.
    const queue = await sql`
      SELECT queue_number, service_type
      FROM queue_entries
      WHERE queue_id = ${queue_id};
    `;

    // Stop if the queue entry doesn't exist.
    if (queue.length === 0) {
      return res.status(404).json({
        message: "Queue entry not found.",
      } as skipQueueEntry.error);
    }

    const { queue_number: currentQueueNumber, service_type } = queue[0];

    // Move the patient behind forward by one position.
    await sql`
      UPDATE queue_entries
      SET queue_number = queue_number - 1
      WHERE
        queue_number = ${currentQueueNumber + 1}
        AND service_type = ${service_type}
        AND status = 'waiting';
    `;

    // Move the skipped patient back by one position.
    const updatedQueue = await sql`
      UPDATE queue_entries
      SET queue_number = ${currentQueueNumber + 1}
      WHERE queue_id = ${queue_id}
      RETURNING *;
    `;

    return res.status(200).json({
      message: "Queue skipped successfully.",
      queue: updatedQueue[0],
    } as skipQueueEntry.response);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Error in skipQueueEntry controller.",
    } as skipQueueEntry.error);
  }
}

export async function confirmLabRequestPayment(
  req: Request,
  res: Response<confirmLabRequestPayment.response | confirmLabRequestPayment.error>,
) {
  const { request_id } = req.params;
  if (typeof request_id !== "string" || !request_id.trim()) {
    return res.status(400).json({ message: "Laboratory request ID is required." });
  }
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('queue_ids'))");
    const { rows: [request] } = await client.query(
      "SELECT * FROM laboratory_requests WHERE request_id = $1 FOR UPDATE",
      [request_id],
    );
    if (!request) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Laboratory request not found." });
    }
    if (["cancelled", "canceled", "rejected"].includes(String(request.status).trim().toLowerCase())) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "A cancelled or rejected request cannot be confirmed or sent to the laboratory." });
    }
    const { rows: items } = await client.query(
      `SELECT lri.lab_item_id, lri.queue_id, lri.status, s.room
       FROM laboratory_request_items lri
       JOIN services s ON s.service_id = lri.service_id
       WHERE lri.request_id = $1
       ORDER BY lri.lab_item_id
       FOR UPDATE OF lri`,
      [request_id],
    );
    const unsent = items.filter((item) => !item.queue_id);
    if (!items.length || unsent.some((item) => item.status !== "Requested" || typeof item.room !== "string" || !item.room.trim())) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "The request needs pending tests with assigned laboratory rooms before payment can be confirmed and forwarded." });
    }
    // One patient queue per room, with all of that room's tests linked to it.
    // Retrying also repairs previously paid requests without duplicating queues.
    const rooms = new Map<string, string[]>();
    for (const item of unsent) {
      const ids = rooms.get(item.room) ?? [];
      ids.push(item.lab_item_id);
      rooms.set(item.room, ids);
    }
    for (const [room, ids] of rooms) {
      const queueId = await generateLaboratoryQueueId(client);
      const queueNumber = await generateQueueNumberLaboratory(client, room);
      await client.query(
        `INSERT INTO queue_entries (queue_id, patient_id, queue_number, is_priority, status)
         VALUES ($1, $2, $3, $4, 'Waiting')`,
        [queueId, request.patient_id, queueNumber, request.is_priority === true],
      );
      const linked = await client.query(
        `UPDATE laboratory_request_items
         SET queue_id = $1, status = 'Waiting', updated_at = NOW()
         WHERE request_id = $2 AND lab_item_id = ANY($3::text[])
           AND queue_id IS NULL AND status = 'Requested'
         RETURNING lab_item_id`,
        [queueId, request_id, ids],
      );
      if (linked.rows.length !== ids.length) throw new Error("Some laboratory items changed while being forwarded.");
    }
    const { rows: updatedLabRequest } = await client.query(
      `UPDATE laboratory_requests SET is_paid = TRUE, status = 'Paid',
         updated_at = CASE WHEN is_paid = TRUE AND status = 'Paid' THEN updated_at ELSE NOW() END
       WHERE request_id = $1 RETURNING *`,
      [request_id],
    );
    const { rows: queues } = await client.query(
      `SELECT DISTINCT q.*, s.room FROM queue_entries q
       JOIN laboratory_request_items lri ON lri.queue_id = q.queue_id
       JOIN services s ON s.service_id = lri.service_id
       WHERE lri.request_id = $1 AND q.patient_id = $2
       ORDER BY q.queue_id, s.room`,
      [request_id, request.patient_id],
    );
    if (!updatedLabRequest.length || !queues.length) throw new Error("Laboratory forwarding could not be verified.");
    await client.query("COMMIT");
    if (rooms.size) publishQueueChange();
    return res.status(200).json({
      message: "Laboratory request payment confirmed and forwarded to the laboratory.",
      request: updatedLabRequest,
      queued: true,
      queues,
    } as confirmLabRequestPayment.response);
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(console.error);
    console.error("Unable to confirm payment and forward laboratory request:", error);
    return res.status(500).json({
      message: "Unable to confirm payment and forward the request. Refresh its status before trying again.",
    } as confirmLabRequestPayment.error);
  } finally {
    client?.release();
  }
}

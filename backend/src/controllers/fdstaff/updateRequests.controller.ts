import bcrypt from "bcryptjs";
import cloudinary from "../../config/cloudinary.js";
import { sql, pool } from "../../config/db.js";
import type { PoolClient } from "@neondatabase/serverless";
import {
  generateLaboratoryQueueId,
  generateQueueNumberLaboratory,
} from "../../utils/generateId.js";
import { publishQueueChange } from "../../services/queue-sse/index.js";
import { calculateAge } from "../../utils/calculateAge.js";
import type { Request, Response } from "express";
import type {
  updatePatient,
  serveQueueEntry,
  skipQueueEntry,
  confirmLabRequestPayment,
  confirmPayment,
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

export async function confirmPayment(
  req: Request,
  res: Response<confirmPayment.response | confirmPayment.error>,
) {
  const { bill_id } = req.params;
  const {
    payment_method,
    discount_type,
    amount_received,
    reference_num,
    priority,
  } = req.body;

  if (!["Cash", "Instapay/QRpH"].includes(payment_method)) {
    return res.status(400).json({
      message: "Invalid payment method.",
    } as confirmPayment.error);
  }

  if (!["Not Eligible", "Senior Citizen", "PWD"].includes(discount_type)) {
    return res.status(400).json({
      message: "Invalid discount type.",
    } as confirmPayment.error);
  }

  const isCash = payment_method === "Cash";
  const reference = String(reference_num ?? "").trim();

  if (!isCash && (reference === "" || reference.length > 50)) {
    return res.status(400).json({
      message: "A reference number (max 50 characters) is required.",
    } as confirmPayment.error);
  }

  let client: PoolClient | undefined;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // Same lock the lab flow uses, so queue ids and numbers can't collide.
    await client.query("SELECT pg_advisory_xact_lock(hashtext('queue_ids'))");

    // Roll back and respond in one step.
    const reject = async (status: number, message: string) => {
      await client!.query("ROLLBACK");
      return res.status(status).json({ message } as confirmPayment.error);
    };

    // ---- Lock the bill and read the patient's eligibility ----
    const {
      rows: [bill],
    } = await client.query(
      `SELECT
         b.status,
         COALESCE(DATE_PART('year', AGE(p.birthdate)) >= 60, false) AS is_senior,
         COALESCE(p.is_pwd, false) AS is_pwd
       FROM bills b
       JOIN patients p ON p.patient_id = b.patient_id
       WHERE b.bill_id = $1
       FOR UPDATE OF b`,
      [bill_id],
    );

    if (!bill) return reject(404, "Bill not found.");
    if (bill.status !== "Pending") {
      return reject(409, "This bill has already been processed.");
    }

    if (
      (discount_type === "Senior Citizen" && !bill.is_senior) ||
      (discount_type === "PWD" && !bill.is_pwd)
    ) {
      return reject(400, "Patient is not eligible for this discount.");
    }

    // ---- Recompute totals from the database ----
    const {
      rows: [{ subtotal }],
    } = await client.query(
      `SELECT COALESCE(SUM(price), 0)::float8 AS subtotal FROM (
         SELECT s.price
         FROM consultation_records cr
         JOIN services s ON s.service_id = cr.service_id
         WHERE cr.bill_id = $1
         UNION ALL
         SELECT s.price
         FROM laboratory_request_items lri
         JOIN services s ON s.service_id = lri.service_id
         WHERE lri.bill_id = $1
       ) lines`,
      [bill_id],
    );

    if (subtotal <= 0) return reject(400, "Bill has no billable items.");

    const discountRate = discount_type === "Not Eligible" ? 0 : 0.2;
    const discountAmount = Math.round(subtotal * discountRate * 100) / 100;
    const total = Math.round((subtotal - discountAmount) * 100) / 100;

    let change = 0;
    if (isCash) {
      const received = Number(amount_received);

      if (
        !Number.isFinite(received) ||
        Math.round(received * 100) < Math.round(total * 100)
      ) {
        return reject(400, "Amount received is less than the total.");
      }

      change = (Math.round(received * 100) - Math.round(total * 100)) / 100;
    }
    const { rows: labItems } = await client.query(
      `SELECT lri.lab_item_id, lri.request_id, lri.queue_id, lri.status, s.room
       FROM laboratory_request_items lri
       JOIN services s ON s.service_id = lri.service_id
       WHERE lri.bill_id = $1
       ORDER BY lri.request_id, lri.lab_item_id
       FOR UPDATE OF lri`,
      [bill_id],
    );

    const unsent = labItems.filter(
      (item) =>
        !item.queue_id &&
        !["cancelled", "canceled", "rejected"].includes(
          String(item.status).trim().toLowerCase(),
        ),
    );

    if (
      unsent.some(
        (item) =>
          item.status !== "Requested" ||
          typeof item.room !== "string" ||
          !item.room.trim(),
      )
    ) {
      return reject(
        409,
        "Some laboratory tests are not pending or have no assigned room, so payment can't be forwarded.",
      );
    }

    const byRequest = new Map<string, Map<string, string[]>>();
    for (const item of unsent) {
      const rooms =
        byRequest.get(item.request_id) ?? new Map<string, string[]>();
      const ids = rooms.get(item.room) ?? [];
      ids.push(item.lab_item_id);
      rooms.set(item.room, ids);
      byRequest.set(item.request_id, rooms);
    }

    let queuedCount = 0;

    for (const [request_id, rooms] of byRequest) {
      const {
        rows: [request],
      } = await client.query(
        "SELECT * FROM laboratory_requests WHERE request_id = $1 FOR UPDATE",
        [request_id],
      );

      if (!request) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          message: "Laboratory request not found.",
        } as confirmPayment.error);
      }

      if (
        ["cancelled", "canceled", "rejected"].includes(
          String(request.status).trim().toLowerCase(),
        )
      ) {
        return reject(
          409,
          "A cancelled or rejected request cannot be confirmed or sent to the laboratory.",
        );
      }

      for (const [room, ids] of rooms) {
        const queueId = await generateLaboratoryQueueId(client);
        const queueNumber = await generateQueueNumberLaboratory(client, room);

        await client.query(
          `INSERT INTO queue_entries (queue_id, patient_id, queue_number, is_priority, status)
           VALUES ($1, $2, $3, $4, 'Waiting')`,
          [
            queueId,
            request.patient_id,
            queueNumber,
            priority === true || request.is_priority === true,
          ],
        );

        const linked = await client.query(
          `UPDATE laboratory_request_items
           SET queue_id = $1, status = 'Waiting', updated_at = NOW()
           WHERE request_id = $2 AND lab_item_id = ANY($3::text[])
             AND queue_id IS NULL AND status = 'Requested'
           RETURNING lab_item_id`,
          [queueId, request_id, ids],
        );

        if (linked.rows.length !== ids.length) {
          throw new Error(
            "Some laboratory items changed while being forwarded.",
          );
        }

        queuedCount++;
      }

      await client.query(
        `UPDATE laboratory_requests
         SET is_paid = TRUE, status = 'Paid',
             updated_at = CASE WHEN is_paid = TRUE AND status = 'Paid' THEN updated_at ELSE NOW() END
         WHERE request_id = $1`,
        [request_id],
      );
    }

    const {
      rows: [updatedBill],
    } = await client.query(
      `UPDATE bills
       SET status = 'Paid',
           subtotal = $2,
           discount_type = $3,
           discount_rate = $4,
           discount_amount = $5,
           total_amount = $6,
           payment_method = $7,
           reference_num = $8,
           paid_at = NOW(),
           updated_at = NOW()
       WHERE bill_id = $1 AND status = 'Pending'
       RETURNING *`,
      [
        bill_id,
        subtotal,
        discount_type === "Not Eligible" ? null : discount_type,
        discountRate,
        discountAmount,
        total,
        payment_method,
        isCash ? null : reference,
      ],
    );

    if (!updatedBill) {
      return reject(409, "This bill has already been processed.");
    }
    const { rows: queues } = await client.query(
      `SELECT DISTINCT q.*, s.room
       FROM queue_entries q
       JOIN laboratory_request_items lri ON lri.queue_id = q.queue_id
       JOIN services s ON s.service_id = lri.service_id
       WHERE lri.bill_id = $1
       ORDER BY q.queue_id, s.room`,
      [bill_id],
    );

    await client.query("COMMIT");

    if (queuedCount > 0) publishQueueChange();

    return res.status(200).json({
      message: "Payment confirmed successfully.",
      bill: updatedBill,
      change,
      queues,
    } as confirmPayment.response);
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(console.error);
    console.error("Error in confirmPayment controller:", error);

    return res.status(500).json({
      message: "Error in confirmPayment controller.",
    } as confirmPayment.error);
  } finally {
    client?.release();
  }
}

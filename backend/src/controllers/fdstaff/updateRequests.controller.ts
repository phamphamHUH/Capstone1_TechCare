import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
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
    let imageUrl: string | null = null;
    if (req.file) {
      const uploaded = await cloudinary.uploader.upload(req.file.path, { folder: "techcare/patients" });
      imageUrl = uploaded.secure_url;
    }

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
                image_url = COALESCE(${imageUrl}, image_url),
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
  const paymentMethod = req.body?.payment_method ?? "Cash";
  const discount = req.body?.discount_pct ?? 0;
  const priority = req.body?.is_priority;
  if (typeof request_id !== "string" || !request_id.trim()) {
    return res.status(400).json({ message: "Laboratory request ID is required." });
  }
  if (!["Cash", "Instapay/QRph"].includes(paymentMethod)) {
    return res.status(400).json({ message: "A valid payment method is required." });
  }
  if (![0, 20].includes(discount) || (priority !== undefined && typeof priority !== "boolean")) {
    return res.status(400).json({ message: "A valid discount and queue priority are required." });
  }
  let client: PoolClient | undefined;
  let transactionOpen = false;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionOpen = true;
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
      `SELECT lri.lab_item_id, lri.queue_id, lri.status, lri.service_id,
         to_jsonb(lri)->>'bill_id' AS saved_bill_id,
         s.service_name, s.service_category, s.price, s.room
       FROM laboratory_request_items lri
       JOIN services s ON s.service_id = lri.service_id
       WHERE lri.request_id = $1
       ORDER BY lri.lab_item_id
       FOR UPDATE OF lri`,
      [request_id],
    );
    if (!items.length) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return res.status(409).json({ message: "This laboratory request has no tests to bill." });
    }

    // Commit the payment and invoice independently of lab queue forwarding. A
    // missing room or queue database failure must not undo an accepted payment.
    const { rows: existingBills } = await client.query(
      `SELECT * FROM bills
       WHERE patient_id = $1 AND LOWER(status) = 'paid'
       ORDER BY billed_at DESC`,
      [request.patient_id],
    );
    let bill = existingBills.find((candidate) => {
      if (items.some((item) => item.saved_bill_id === candidate.bill_id)) return true;
      let savedItems = candidate.items;
      if (typeof savedItems === "string") {
        try { savedItems = JSON.parse(savedItems); } catch { return false; }
      }
      return Array.isArray(savedItems) && savedItems.some((item) => item?.request_id === request_id);
    });
    if (!bill && request.is_paid !== true) {
      if (discount === 20) {
        const { rows: eligible } = await client.query(
          `SELECT patient_id FROM patients WHERE patient_id = $1
           AND birthdate::date <= ((NOW() AT TIME ZONE 'Asia/Manila')::date - INTERVAL '60 years')::date`,
          [request.patient_id],
        );
        if (!eligible.length) {
          await client.query("ROLLBACK");
          transactionOpen = false;
          return res.status(400).json({ message: "The patient is not eligible for the senior citizen discount." });
        }
      }
      if (items.some((item) => item.price === null || !Number.isFinite(Number(item.price)) || Number(item.price) < 0)) {
        await client.query("ROLLBACK");
        transactionOpen = false;
        return res.status(409).json({ message: "Some services do not have a valid price. Update their prices before recording payment." });
      }
      const invoiceItems = items.map((item) => ({
        request_id,
        service_id: item.service_id,
        service_name: item.service_name,
        service_category: item.service_category,
        price: Number(item.price),
        quantity: 1,
      }));
      const subtotal = invoiceItems.reduce(
        (total, item) => total + item.price * item.quantity,
        0,
      );
      const totalAmount = Math.round(subtotal * (1 - discount / 100) * 100) / 100;
      const billId = `B-${randomUUID()}`;
      const receiptId = `R-${randomUUID().slice(0, 12).toUpperCase()}`;
      const { rows: savedBills } = await client.query(
        `INSERT INTO bills (
           bill_id, patient_id, items, discount_pct, total_amount,
           payment_method, status, receipt_id, receipt_issued_at, billed_at
         ) VALUES ($1, $2, $3::jsonb, $7, $4, $5, 'Paid', $6, NOW(), NOW())
         RETURNING *`,
        [billId, request.patient_id, JSON.stringify(invoiceItems), totalAmount, paymentMethod, receiptId, discount],
      );
      bill = savedBills[0];
    }
    const { rows: updatedLabRequest } = await client.query(
      `UPDATE laboratory_requests SET is_paid = TRUE, status = 'Paid',
         is_priority = CASE WHEN is_paid = TRUE THEN is_priority ELSE COALESCE($2, is_priority) END,
         updated_at = CASE WHEN is_paid = TRUE AND status = 'Paid' THEN updated_at ELSE NOW() END
       WHERE request_id = $1 RETURNING *`,
      [request_id, priority ?? null],
    );
    if (!updatedLabRequest.length) throw new Error("Payment could not be saved.");

    await client.query("COMMIT");
    transactionOpen = false;

    let queues: Record<string, any>[] = [];
    let queued = false;
    let queueError: string | undefined;
    try {
      await client.query("BEGIN");
      transactionOpen = true;
      await client.query("SELECT pg_advisory_xact_lock(hashtext('queue_ids'))");
      const { rows: currentItems } = await client.query(
        `SELECT lri.lab_item_id, lri.queue_id, lri.status, s.room
         FROM laboratory_request_items lri
         JOIN services s ON s.service_id = lri.service_id
         WHERE lri.request_id = $1
         ORDER BY lri.lab_item_id
         FOR UPDATE OF lri`,
        [request_id],
      );
      const unsent = currentItems.filter((item) => !item.queue_id);
      const rooms = new Map<string, string[]>();
      if (unsent.some((item) => String(item.status).trim().toLowerCase() !== "requested" || typeof item.room !== "string" || !item.room.trim())) {
        queueError = "Payment was recorded, but some tests still need an assigned laboratory room before they can be forwarded.";
      } else {
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
            [queueId, request.patient_id, queueNumber, updatedLabRequest[0].is_priority === true],
          );
          const linked = await client.query(
            `UPDATE laboratory_request_items
             SET queue_id = $1, status = 'Waiting', updated_at = NOW()
             WHERE request_id = $2 AND lab_item_id = ANY($3::text[])
               AND queue_id IS NULL AND LOWER(TRIM(status)) = 'requested'
             RETURNING lab_item_id`,
            [queueId, request_id, ids],
          );
          if (linked.rows.length !== ids.length) throw new Error("Some laboratory items changed while being forwarded.");
        }
      }
      if (!queueError) {
        const result = await client.query(
          `SELECT DISTINCT q.*, s.room FROM queue_entries q
           JOIN laboratory_request_items lri ON lri.queue_id = q.queue_id
           JOIN services s ON s.service_id = lri.service_id
           WHERE lri.request_id = $1 AND q.patient_id = $2
           ORDER BY q.queue_id, s.room`,
          [request_id, request.patient_id],
        );
        queues = result.rows;
        queued = queues.length > 0;
        if (!queued) queueError = "Payment was recorded, but the laboratory queue could not be verified.";
      }
      if (queueError) await client.query("ROLLBACK");
      else await client.query("COMMIT");
      transactionOpen = false;
    } catch (error) {
      if (transactionOpen) await client.query("ROLLBACK").catch(console.error);
      transactionOpen = false;
      queueError = "Payment was recorded, but the request could not be forwarded to the laboratory. Retry forwarding from the paid request.";
      console.error("Unable to forward paid laboratory request:", { request_id, error });
    }

    if (queued) publishQueueChange();
    return res.status(200).json({
      message: queueError || "Laboratory request payment confirmed and forwarded to the laboratory.",
      request: updatedLabRequest,
      queued,
      queues,
      bill: bill ?? null,
    } as confirmLabRequestPayment.response);
  } catch (error) {
    if (client && transactionOpen) await client.query("ROLLBACK").catch(console.error);
    const databaseError = error as {
      code?: string;
      constraint?: string;
      detail?: string;
      message?: string;
      stack?: string;
    };
    console.error("Unable to record laboratory request payment:", {
      request_id,
      code: databaseError?.code,
      constraint: databaseError?.constraint,
      detail: databaseError?.detail,
      message: databaseError?.message,
      stack: databaseError?.stack,
    });
    const message = databaseError?.code === "42703" || databaseError?.code === "42P01"
      ? "Payment could not be recorded because the billing database schema is out of date. Contact an administrator."
      : databaseError?.code === "23503"
        ? "Payment could not be recorded because this request references missing patient or service data. Refresh the request and try again."
        : databaseError?.code === "23502"
          ? "Payment could not be recorded because required billing data is missing. Refresh the request and try again."
          : "Unable to confirm payment and forward the request. Refresh its status before trying again.";
    return res.status(500).json({
      message,
    } as confirmLabRequestPayment.error);
  } finally {
    client?.release();
  }
}

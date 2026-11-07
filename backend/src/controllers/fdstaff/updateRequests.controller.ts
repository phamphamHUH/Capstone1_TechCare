import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import cloudinary from "../../config/cloudinary.js";
import { sql, pool } from "../../config/db.js";
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
      street,
      barangay,
      city,
      province,
      zip_code,
      contact_number,
      civil_status,
      blood_type,
      birthdate,
      height_cm,
      weight_kg,
      allergies,
      existing_conditions,
      current_medications,
      previous_surgeries,
      previous_hospitalizations,
      family_medical_history,
      smoking_status,
      alcohol_consumption,
      guardian_name,
      guardian_relationship,
      guardian_contact,
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
      const uploaded = await cloudinary.uploader.upload(req.file.path, {
        folder: "techcare/patients",
      });
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
                street = COALESCE(${street}, street),
                barangay = COALESCE(${barangay}, barangay),
                city = COALESCE(${city}, city),
                province = COALESCE(${province}, province),
                zip_code = COALESCE(${zip_code}, zip_code),
                contact_number = COALESCE(${contact_number}, contact_number),
                civil_status = COALESCE(${civil_status}, civil_status),
                blood_type = COALESCE(${blood_type}, blood_type),
                birthdate = COALESCE(${birthdate}, birthdate),
                guardian_name = COALESCE(${guardian_name}, guardian_name),
                guardian_relationship = COALESCE(${guardian_relationship}, guardian_relationship),
                guardian_contact = COALESCE(${guardian_contact}, guardian_contact),
                allergies = COALESCE(${allergies}, allergies),
                existing_conditions = COALESCE(${existing_conditions}, existing_conditions),
                current_medications = COALESCE(${current_medications}, current_medications),
                previous_surgeries = COALESCE(${previous_surgeries}, previous_surgeries),
                previous_hospitalizations = COALESCE(${previous_hospitalizations}, previous_hospitalizations),
                family_medical_history = COALESCE(${family_medical_history}, family_medical_history),
                smoking_status = COALESCE(${smoking_status}, smoking_status),
                alcohol_consumption = COALESCE(${alcohol_consumption}, alcohol_consumption),
                height_cm = COALESCE(${height_cm}, height_cm),
                weight_kg = COALESCE(${weight_kg}, weight_kg),
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

    publishQueueChange();
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

    publishQueueChange();
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
  // PATCH /api/fdstaff/billings/:bill_id/pay
  // A pending bill is paid first, then its laboratory tests are forwarded.
  // A paid bill is never charged again: the same call only retries forwarding.
  const { bill_id } = req.params as { bill_id: string };
  const {
    payment_method = "Cash",
    discount_type = "Not Eligible",
    amount_received,
    reference_num,
    priority,
  } = (req.body ?? {}) as confirmPayment.body;

  if (
    !["Cash", "Instapay/QRpH"].includes(payment_method) ||
    !["Not Eligible", "Senior Citizen", "PWD"].includes(discount_type) ||
    (priority !== undefined && typeof priority !== "boolean")
  ) {
    return res.status(400).json({
      message: "A valid payment method, discount and priority are required.",
    });
  }

  const client = await pool.connect();
  try {
    // 1. Record the payment.
    await client.query("BEGIN");
    const {
      rows: [found],
    } = await client.query(
      `SELECT b.*,
         COALESCE(p.birthdate::date <= ((NOW() AT TIME ZONE 'Asia/Manila')::date - INTERVAL '60 years')::date, false) AS is_senior,
         COALESCE(p.is_pwd, false) AS is_pwd
       FROM bills b
       JOIN patients p ON p.patient_id = b.patient_id
       WHERE b.bill_id = $1
       FOR UPDATE OF b`,
      [bill_id],
    );

    if (!found) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Bill not found." });
    }

    const status = String(found.status).trim().toLowerCase();
    if (!["pending", "unpaid", "paid"].includes(status)) {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({ message: "A cancelled bill cannot be paid." });
    }

    const already_paid = status === "paid";
    let bill = found;
    let change = 0;

    if (!already_paid) {
      if (
        (discount_type === "Senior Citizen" && !found.is_senior) ||
        (discount_type === "PWD" && !found.is_pwd)
      ) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ message: "Patient is not eligible for this discount." });
      }

      const { rows: linkedItems } = await client.query(
        `SELECT 'consultation'::text AS line_type, cr.consultation_record_id AS item_id, NULL::text AS request_id,
           cr.service_id, s.service_name, s.service_category, s.price, 1 AS quantity
         FROM consultation_records cr
         JOIN services s ON s.service_id = cr.service_id
         WHERE cr.bill_id = $1 AND LOWER(TRIM(cr.status)) NOT IN ('cancelled', 'canceled', 'rejected')
         UNION ALL
         SELECT 'laboratory'::text, lri.lab_item_id, lri.request_id, lri.service_id, s.service_name, s.service_category, s.price, 1
         FROM laboratory_request_items lri
         JOIN services s ON s.service_id = lri.service_id
         JOIN laboratory_requests lr ON lr.request_id = lri.request_id
         WHERE lri.bill_id = $1 AND LOWER(TRIM(lri.status)) NOT IN ('cancelled', 'canceled', 'rejected')
           AND LOWER(TRIM(lr.status)) NOT IN ('cancelled', 'canceled', 'rejected')`,
        [bill_id],
      );

      // Legacy bills have no linked rows, only their saved item list.
      const source: Record<string, any>[] =
        linkedItems.length > 0
          ? linkedItems
          : Array.isArray(found.items)
            ? found.items
            : [];
      const items = source.map((item) => ({
        ...item,
        price:
          item.price === null || item.price === undefined
            ? NaN
            : Number(item.price),
        quantity: Number(item.quantity ?? 1),
      }));

      if (
        items.length === 0 ||
        items.some(
          (item) =>
            !Number.isFinite(item.price) ||
            item.price < 0 ||
            !Number.isInteger(item.quantity) ||
            item.quantity <= 0,
        )
      ) {
        await client.query("ROLLBACK");
        return res
          .status(409)
          .json({ message: "Bill has no valid billable items." });
      }

      const subtotal =
        Math.round(
          items.reduce((sum, item) => sum + item.price * item.quantity, 0) *
            100,
        ) / 100;
      const discount_rate = discount_type === "Not Eligible" ? 0 : 20;
      const total = Math.round(subtotal * (100 - discount_rate)) / 100;
      const reference = String(reference_num ?? "").trim();

      if (payment_method !== "Cash" && (!reference || reference.length > 50)) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message:
            "A transfer reference number of at most 50 characters is required.",
        });
      }

      if (payment_method === "Cash") {
        const received =
          amount_received === null ||
          amount_received === "" ||
          amount_received === undefined
            ? NaN
            : Number(amount_received);
        if (
          !Number.isFinite(received) ||
          Math.round(received * 100) < Math.round(total * 100)
        ) {
          await client.query("ROLLBACK");
          return res
            .status(400)
            .json({ message: "Amount received is less than the total." });
        }
        change = (Math.round(received * 100) - Math.round(total * 100)) / 100;
      }

      const { rows } = await client.query(
        `UPDATE bills
         SET status = 'Paid', subtotal = $2, discount_type = $3, discount_rate = $4,
             discount_amount = $5, total_amount = $6, payment_method = $7, reference_num = $8, items = $9::jsonb,
             invoice_id = COALESCE(invoice_id, $10), paid_at = NOW(), billed_at = NOW(), invoice_issued_at = NOW(),
             received_by = $11, updated_at = NOW()
         WHERE bill_id = $1
         RETURNING *`,
        [
          bill_id,
          subtotal,
          discount_rate ? discount_type : null,
          discount_rate,
          Math.round((subtotal - total) * 100) / 100,
          total,
          payment_method,
          payment_method === "Cash" ? null : reference,
          JSON.stringify(items),
          `R-${randomUUID().slice(0, 12).toUpperCase()}`,
          req.user?.user_id ?? null,
        ],
      );
      bill = rows[0];

      await client.query(
        "UPDATE consultation_records SET is_paid = TRUE WHERE bill_id = $1",
        [bill_id],
      );
      await client.query(
        `UPDATE laboratory_requests lr
         SET is_paid = TRUE, status = 'Paid', is_priority = COALESCE($2, lr.is_priority), updated_at = NOW()
         WHERE EXISTS (SELECT 1 FROM laboratory_request_items lri WHERE lri.request_id = lr.request_id AND lri.bill_id = $1)
           AND LOWER(TRIM(lr.status)) NOT IN ('cancelled', 'canceled', 'rejected')`,
        [bill_id, priority ?? null],
      );
    }
    await client.query("COMMIT");

    // 2. Forward laboratory tests in a separate transaction, so a forwarding
    // problem can never undo the payment. Each request gets one queue entry per room.
    let has_laboratory_items = false;
    let queued = true;
    let forwardingError = "";
    let queueChanged = false;
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext('queue_ids'))");
      const { rows: labItems } = await client.query(
        `SELECT lri.lab_item_id, lri.request_id, lri.queue_id, lri.status, lr.patient_id, lr.is_priority, s.room
         FROM laboratory_request_items lri
         JOIN services s ON s.service_id = lri.service_id
         JOIN laboratory_requests lr ON lr.request_id = lri.request_id
         WHERE lri.bill_id = $1 AND LOWER(TRIM(lri.status)) NOT IN ('cancelled', 'canceled', 'rejected')
           AND LOWER(TRIM(lr.status)) NOT IN ('cancelled', 'canceled', 'rejected')
         ORDER BY lri.request_id, lri.lab_item_id
         FOR UPDATE OF lri`,
        [bill_id],
      );
      has_laboratory_items = labItems.length > 0;

      const unforwarded = labItems.filter((item) => !item.queue_id);
      if (
        unforwarded.some(
          (item) =>
            String(item.status).trim().toLowerCase() !== "requested" ||
            !String(item.room ?? "").trim(),
        )
      ) {
        queued = false;
        forwardingError =
          "Payment was recorded, but some laboratory tests still need an assigned room before they can be forwarded.";
        await client.query("ROLLBACK");
      } else {
        // Group by room only (a bill belongs to one patient).
        const groups = new Map<string, typeof unforwarded>();
        for (const item of unforwarded) {
          groups.set(item.room, [...(groups.get(item.room) ?? []), item]);
        }

        for (const group of groups.values()) {
          const { patient_id, room } = group[0];
          const groupPriority = group.some((item) => item.is_priority === true);

          // Reuse the patient's open queue for this room, if there is one.
          const {
            rows: [existing],
          } = await client.query(
            `SELECT q.queue_id
             FROM queue_entries q
             WHERE q.patient_id = $1
               AND q.queue_id LIKE 'LAB-%'
               AND LOWER(TRIM(q.status)) IN ('waiting', 'serving')
               AND EXISTS (
                 SELECT 1
                 FROM laboratory_request_items lri
                 JOIN services s ON s.service_id = lri.service_id
                 WHERE lri.queue_id = q.queue_id AND s.room = $2
               )
             ORDER BY q.created_at
             LIMIT 1`,
            [patient_id, room],
          );

          let queue_id: string;

          if (existing) {
            queue_id = existing.queue_id;
            // A priority request makes the whole queue priority.
            if (groupPriority) {
              await client.query(
                `UPDATE queue_entries
                 SET is_priority = TRUE, updated_at = NOW()
                 WHERE queue_id = $1 AND is_priority = FALSE`,
                [queue_id],
              );
            }
          } else {
            queue_id = await generateLaboratoryQueueId(client);
            const queue_number = await generateQueueNumberLaboratory(
              client,
              room,
            );
            await client.query(
              `INSERT INTO queue_entries (queue_id, patient_id, queue_number, is_priority, status)
               VALUES ($1, $2, $3, $4, 'Waiting')`,
              [queue_id, patient_id, queue_number, groupPriority],
            );
          }

          const ids = group.map((item) => item.lab_item_id);
          const { rows: linked } = await client.query(
            `UPDATE laboratory_request_items
             SET queue_id = $1, status = 'Waiting', updated_at = NOW()
             WHERE lab_item_id = ANY($2::text[])
               AND queue_id IS NULL AND LOWER(TRIM(status)) = 'requested'
             RETURNING lab_item_id`,
            [queue_id, ids],
          );
          if (linked.length !== ids.length) {
            throw new Error(
              "Some laboratory items changed while being forwarded.",
            );
          }

          queueChanged = true;
        }
        await client.query("COMMIT");
      }
    } catch (error) {
      await client.query("ROLLBACK").catch(console.error);
      console.error("Unable to forward paid bill:", { bill_id, error });
      queued = false;
      queueChanged = false;
      forwardingError =
        "Payment was recorded, but laboratory forwarding failed. Retry forwarding from the paid bill.";
    }

    if (queueChanged) publishQueueChange();

    const { is_senior, is_pwd, ...savedBill } = bill;
    return res.status(200).json({
      message:
        forwardingError ||
        (already_paid
          ? "This bill is already paid. No new charge was recorded."
          : "Payment confirmed successfully."),
      bill: { ...savedBill, status: "Paid" },
      change,
      already_paid,
      queued,
      has_laboratory_items,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(console.error);
    console.error("Unable to record bill payment:", { bill_id, error });
    return res.status(500).json({
      message:
        "Payment could not be recorded. Refresh the bill status before trying again.",
    });
  } finally {
    client.release();
  }
}

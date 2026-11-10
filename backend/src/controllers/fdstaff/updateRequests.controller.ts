import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import cloudinary from "../../config/cloudinary.js";
import { sql, pool } from "../../config/db.js";
import {
  generateImagingQueueId,
  generateLaboratoryQueueId,
  generateQueueNumberImaging,
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
  resetPatientPassword,
} from "./dto/update.dto.js";
import { MIN_PASSWORD_LENGTH } from "../../utils/password.js";
import { sendEmailToPatient } from "../../services/email/sendEmail.js";
import { paymentReceiptEmail } from "../../services/email/emailTemplates.js";
import { actorId, notifyPriorityPatient, notifyQueued } from "../../services/notifications/index.js";

export async function updatePatient(
  req: Request,
  res: Response<updatePatient.response | updatePatient.error>,
) {
  // PUT /api/fdstaff/patients/:patient_id

  try {
    const { patient_id } = req.params;

    // Password isn't changed here; use PATCH /patients/:patient_id/password.
    const {
      username,
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

    // multipart/form-data sends everything as strings, so blank inputs arrive as "".
    // Numeric/date columns can't accept "", so convert blanks to null.
    const toNumberOrNull = (value: unknown): number | null => {
      if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
      ) {
        return null;
      }
      const n = Number(value);
      return Number.isFinite(n) ? n : NaN;
    };

    const height = toNumberOrNull(height_cm);
    const weight = toNumberOrNull(weight_kg);

    if (Number.isNaN(height) || Number.isNaN(weight)) {
      return res.status(400).json({
        message: "Height and weight must be valid numbers.",
      } as updatePatient.error);
    }

    const birthdateValue = birthdate?.trim() ? birthdate : null;

    const [existingPatient] = await sql`
            SELECT patient_id
            FROM patients
            WHERE patient_id = ${patient_id}
        `;

    if (!existingPatient) {
      return res.status(404).json({
        message: "Patient not found.",
      } as updatePatient.error);
    }

    // =========================
    // EMAIL CHANGE
    // =========================
    // Verified patient: keep their current email and put the new one in
    // pending_email until they confirm it (they stay verified meanwhile).
    // Unverified patient: just replace the email.
    // Either way a verification link is sent to the new email below.
    const emailChanged =
      Boolean(email?.trim()) &&
      email.trim().toLowerCase() !==
        String(existingPatient.email).toLowerCase();

    const newEmail =
      emailChanged && !existingPatient.is_verified ? email.trim() : null;
    const newPendingEmail =
      emailChanged && existingPatient.is_verified ? email.trim() : null;

    let imageUrl: string | null = null;
    if (req.file) {
      const uploaded = await cloudinary.uploader.upload(req.file.path, {
        folder: "techcare/patients",
      });
      imageUrl = uploaded.secure_url;
    }

    const [updatedPatient] = await sql`
      UPDATE patients
      SET
        username = COALESCE(${username}, username),
        first_name = COALESCE(${first_name}, first_name),
        middle_name = COALESCE(${middle_name}, middle_name),
        last_name = COALESCE(${last_name}, last_name),
        suffix = COALESCE(${suffix}, suffix),
        sex = COALESCE(${sex}, sex),
        email = COALESCE(${email?.trim() || null}, email),
        street = COALESCE(${street}, street),
        barangay = COALESCE(${barangay}, barangay),
        city = COALESCE(${city}, city),
        province = COALESCE(${province}, province),
        zip_code = COALESCE(${zip_code}, zip_code),
        contact_number = COALESCE(${contact_number}, contact_number),
        civil_status = COALESCE(${civil_status}, civil_status),
        blood_type = COALESCE(${blood_type}, blood_type),
        birthdate = COALESCE(${birthdateValue}, birthdate),
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
        height_cm = COALESCE(${height}, height_cm),
        weight_kg = COALESCE(${weight}, weight_kg),
        image_url = COALESCE(${imageUrl}, image_url),
        updated_at = CURRENT_TIMESTAMP
      WHERE patient_id = ${patient_id}
      RETURNING *;
    `;

    const age = calculateAge(updatedPatient.birthdate);

    // Don't send the password hash to the client.
    const { password_hash, ...safePatient } = updatedPatient;

    return res.status(200).json({
      message: "Patient updated successfully.",
      patient: { ...safePatient, age } as unknown as updatePatient.patient,
    } as updatePatient.response);
  } catch (error: any) {
    // 23505 = unique violation: another patient already uses this email.
    if (error?.code === "23505") {
      return res.status(409).json({
        message: "Another patient already uses this email.",
      } as updatePatient.error);
    }

    console.error(error);

    return res.status(500).json({
      message: "Internal server error.",
    } as updatePatient.error);
  }
}

// =========================
// RESET PATIENT PASSWORD
// =========================
// PATCH /api/fdstaff/patients/:patient_id/password
// The front desk types the new password and gives it to the patient.
// This is the only way a patient's password is reset.
export async function resetPatientPassword(
  req: Request,
  res: Response<resetPatientPassword.response | resetPatientPassword.error>,
) {
  try {
    const { patient_id } = req.params;
    const { password } = req.body as resetPatientPassword.body;

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [patient] = await sql`
      UPDATE patients
      SET password_hash = ${hashedPassword}, updated_at = NOW()
      WHERE patient_id = ${patient_id}
      RETURNING first_name, last_name
    `;

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    return res.status(200).json({
      message: `Password for ${patient.first_name} ${patient.last_name} has been reset.`,
    });
  } catch (error) {
    console.error("RESET PATIENT PASSWORD ERROR:", error);

    return res.status(500).json({ message: "Internal server error." });
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
  // A pending bill is paid first, then its laboratory and imaging tests are forwarded.
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

      // Package components cost 0; each package is billed once at its own price.
      const { rows: linkedItems } = await client.query(
        `SELECT
          'consultation'::text AS line_type,
          cr.consultation_record_id AS item_id,
          NULL::text AS request_id,
          cr.service_id,
          s.service_name,
          s.service_category,
          s.price,
          1 AS quantity,
          NULL::text AS package_id,
          NULL::jsonb AS components
        FROM consultation_records cr
        JOIN services s ON s.service_id = cr.service_id
        WHERE cr.bill_id = $1
          AND LOWER(TRIM(cr.status)) NOT IN ('cancelled', 'canceled', 'rejected')

        UNION ALL

        SELECT
          'laboratory'::text,
          MIN(tri.item_id)::text,
          tri.request_id,
          tri.service_id,
          s.service_name,
          s.service_category,
          s.price,
          COUNT(*)::int,
          NULL::text,
          NULL::jsonb
        FROM test_request_items tri
        JOIN services s ON s.service_id = tri.service_id
        JOIN test_requests tr ON tr.request_id = tri.request_id
        WHERE tri.bill_id = $1
          AND tri.package_id IS NULL
          AND LOWER(TRIM(tri.status)) NOT IN ('cancelled', 'canceled', 'rejected')
          AND LOWER(TRIM(tr.status)) NOT IN ('cancelled', 'canceled', 'rejected')
        GROUP BY tri.request_id, tri.service_id, s.service_name, s.service_category, s.price

        UNION ALL

        SELECT
          'package'::text,
          MIN(tri.item_id)::text,
          NULL::text,
          NULL::text,
          pkg.package_name,
          'Package',
          pkg.package_price,
          COUNT(DISTINCT tri.request_id)::int,
          tri.package_id,
          COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'service_id', s.service_id,
                'service_name', s.service_name,
                'service_type', LOWER(TRIM(s.service_type))
              )
            ) FILTER (WHERE s.service_id IS NOT NULL),
            '[]'::jsonb
          )
        FROM test_request_items tri
        JOIN packages pkg ON pkg.package_id = tri.package_id
        JOIN test_requests tr ON tr.request_id = tri.request_id
        LEFT JOIN services s ON s.service_id = tri.service_id
        WHERE tri.bill_id = $1
          AND tri.package_id IS NOT NULL
          AND LOWER(TRIM(tri.status)) NOT IN ('cancelled', 'canceled', 'rejected')
          AND LOWER(TRIM(tr.status)) NOT IN ('cancelled', 'canceled', 'rejected')
        GROUP BY tri.package_id, pkg.package_name, pkg.package_price`,
        [bill_id],
      );

      // Legacy bills have no linked rows, only their saved item list.
      const legacyItems: Record<string, any>[] = Array.isArray(found.items)
        ? found.items
        : [];

      const source: Record<string, any>[] =
        linkedItems.length > 0
          ? linkedItems
          : legacyItems.filter(
              (item) =>
                item?.line_type !== "laboratory" || item?.package_id == null,
            );
      const items = source.map((item) => ({
        ...item,
        price:
          item.price === null || item.price === undefined
            ? NaN
            : Number(item.price),
        quantity: Number(item.quantity ?? 1),
        components: Array.isArray(item.components) ? item.components : [],
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
        `UPDATE test_requests tr
         SET status = 'Paid', is_priority = COALESCE($2, tr.is_priority), updated_at = NOW()
         WHERE EXISTS (SELECT 1 FROM test_request_items tri WHERE tri.request_id = tr.request_id AND tri.bill_id = $1)
           AND LOWER(TRIM(tr.status)) NOT IN ('cancelled', 'canceled', 'rejected')`,
        [bill_id, priority ?? null],
      );
    }
    await client.query("COMMIT");

    // 2. Forward laboratory and imaging tests in a separate transaction, so a
    // forwarding problem can never undo the payment. Each request gets one
    // queue entry per service type and room. Package components are normal
    // items here, so they route by their own service type and room.
    // Receipt email for a new payment (information only, not awaited).
    if (!already_paid) {
      const paid = bill;
      void sendEmailToPatient(String(paid.patient_id), (to, firstName) =>
        paymentReceiptEmail(to, firstName, {
          receiptNumber: paid.invoice_id ?? paid.bill_id,
          paidAt: paid.paid_at,
          paymentMethod: paid.payment_method,
          referenceNumber: paid.reference_num,
          items: (Array.isArray(paid.items) ? paid.items : []).map((item: Record<string, any>) => ({
            name: String(item.service_name ?? "Service"),
            amount: Number(item.price ?? 0) * Number(item.quantity ?? 1),
          })),
          discountLabel: paid.discount_type,
          discountAmount: Number(paid.discount_amount ?? 0),
          total: Number(paid.total_amount ?? 0),
        }),
      );
    }

    // 2. Forward laboratory tests in a separate transaction, so a forwarding
    // problem can never undo the payment. Each request gets one queue entry per room.
    let has_laboratory_items = false;
    let queued = true;
    let forwardingError = "";
    let queueChanged = false;
    // For notifications once forwarding commits: new lab queues (patient) and
    // rooms that just got a priority patient (lab staff).
    const newLabQueues: { patient_id: string; queue_number: number }[] = [];
    const priorityRooms: { patient_id: string; room: string }[] = [];
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext('queue_ids'))");
      const { rows: labItems } = await client.query(
        `SELECT tri.item_id, tri.request_id, tri.queue_id, tri.status, tr.patient_id, tr.is_priority,
                s.room, LOWER(TRIM(s.service_type)) AS service_type
         FROM test_request_items tri
         JOIN services s ON s.service_id = tri.service_id
         JOIN test_requests tr ON tr.request_id = tri.request_id
         WHERE tri.bill_id = $1 AND LOWER(TRIM(tri.status)) NOT IN ('cancelled', 'canceled', 'rejected')
           AND LOWER(TRIM(tr.status)) NOT IN ('cancelled', 'canceled', 'rejected')
         ORDER BY tri.request_id, tri.item_id
         FOR UPDATE OF tri`,
        [bill_id],
      );
      has_laboratory_items = labItems.length > 0;

      const unforwarded = labItems.filter((item) => !item.queue_id);
      if (
        unforwarded.some(
          (item) =>
            String(item.status).trim().toLowerCase() !== "requested" ||
            !String(item.room ?? "").trim() ||
            !["laboratory", "imaging"].includes(item.service_type),
        )
      ) {
        queued = false;
        forwardingError =
          "Payment was recorded, but some tests still need an assigned room or a valid service type (laboratory or imaging) before they can be forwarded.";
        await client.query("ROLLBACK");
      } else {
        // Group by service type + room (a bill belongs to one patient).
        const groups = new Map<string, typeof unforwarded>();
        for (const item of unforwarded) {
          const key = `${item.service_type}|${item.room}`;
          groups.set(key, [...(groups.get(key) ?? []), item]);
        }

        for (const group of groups.values()) {
          const { patient_id, room, service_type } = group[0];
          const isImaging = service_type === "imaging";
          const groupPriority = group.some((item) => item.is_priority === true);

          // Reuse only today's open queue of the same type, since each page lists today's entries.
          const {
            rows: [existing],
          } = await client.query(
            `SELECT q.queue_id
             FROM queue_entries q
             WHERE q.patient_id = $1
               AND q.queue_id LIKE $3
               AND LOWER(TRIM(q.status)) IN ('waiting', 'serving')
               AND q.created_at >= CURRENT_DATE
               AND q.created_at < CURRENT_DATE + INTERVAL '1 day'
               AND EXISTS (
                 SELECT 1
                 FROM test_request_items tri
                 JOIN services s ON s.service_id = tri.service_id
                 WHERE tri.queue_id = q.queue_id AND s.room = $2
               )
             ORDER BY q.created_at
             LIMIT 1`,
            [patient_id, room, isImaging ? "IMG-%" : "LAB-%"],
          );

          let queue_id: string;

          if (existing) {
            queue_id = existing.queue_id;
            // A priority request makes the whole queue priority.
            if (groupPriority) {
              const upgraded = await client.query(
                `UPDATE queue_entries
                 SET is_priority = TRUE, updated_at = NOW()
                 WHERE queue_id = $1 AND is_priority = FALSE`,
                [queue_id],
              );
              if (upgraded.rowCount) priorityRooms.push({ patient_id, room });
            }
          } else {
            queue_id = isImaging
              ? await generateImagingQueueId(client)
              : await generateLaboratoryQueueId(client);
            const queue_number = isImaging
              ? await generateQueueNumberImaging(client, room)
              : await generateQueueNumberLaboratory(client, room);
            await client.query(
              `INSERT INTO queue_entries (queue_id, patient_id, queue_number, is_priority, status)
               VALUES ($1, $2, $3, $4, 'Waiting')`,
              [queue_id, patient_id, queue_number, groupPriority],
            );
            newLabQueues.push({ patient_id, queue_number });
            if (groupPriority) priorityRooms.push({ patient_id, room });
          }

          const ids = group.map((item) => item.item_id);
          const { rows: linked } = await client.query(
            `UPDATE test_request_items
             SET queue_id = $1, status = 'Waiting', updated_at = NOW()
             WHERE item_id = ANY($2::text[])
               AND queue_id IS NULL AND LOWER(TRIM(status)) = 'requested'
             RETURNING item_id`,
            [queue_id, ids],
          );
          if (linked.length !== ids.length) {
            throw new Error("Some items changed while being forwarded.");
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
        "Payment was recorded, but forwarding failed. Retry forwarding from the paid bill.";
    }

    if (queueChanged) {
      publishQueueChange();
      for (const { patient_id, queue_number } of newLabQueues) {
        void notifyQueued(patient_id, "laboratory", queue_number);
      }
      for (const { patient_id, room } of priorityRooms) {
        void notifyPriorityPatient(patient_id, "laboratory", actorId(req), room);
      }
    }

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

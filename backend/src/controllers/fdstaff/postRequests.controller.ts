import { randomUUID } from "node:crypto";
import { ENV } from "../../config/env.js";
import { sql } from "../../config/db.js";
import { pool } from "../../config/db.js";
import bcrypt from "bcryptjs";
import { calculateAge } from "./utils/calculateAge.js";
import { readFrontDeskVitals } from "./utils/vitalSigns.js";
import type { Request, Response } from "express";
import { uploadImage } from "../../config/s3.js";
import {
  generateConsultationQueueId,
  generateLaboratoryQueueId,
  generatePatientId,
  generateLaboratoryRequestID,
  generateQueueNumberConsultation,
  generateQueueNumberLaboratory,
  generateLaboratoryItemID,
  generateConsultationRecordId,
  generateBillId,
} from "../../utils/generateId.js";
import type {
  addPatient,
  addBills,
  addToQueue,
  addLaboratoryRequest,
  addConsultationRecord,
} from "./dto/post.dto.js";
import { publishQueueChange } from "../../services/queue-sse/index.js";
import {
  actorId,
  notifyPriorityPatient,
  notifyQueued,
} from "../../services/notifications/index.js";
import { sendEmail } from "../../services/email/sendEmail.js";
import { patientAccountCreatedEmail } from "../../services/email/emailTemplates.js";
import {
  createPasswordLink,
  PASSWORD_LINK_DAYS,
} from "../../utils/passwordLink.js";
import { recomputeBillTotals } from "../../utils/recomputeBills.js";
import { getOrCreateOpenBill } from "../../utils/getOrCreateBill.js";
export async function addPatient(
  req: Request,
  res: Response<addPatient.response | addPatient.error>,
) {
  // POST /api/fdstaff/patients
  try {
    const {
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
      guardian_name,
      guardian_relationship,
      guardian_contact,
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
    } = req.body as addPatient.body;

    // Validate required fields (matches NOT NULL columns on `patients`;
    // civil_status has a DB default so it's optional here)
    if (
      !first_name ||
      !last_name ||
      !birthdate ||
      !sex ||
      !email ||
      !contact_number
    ) {
      return res.status(400).json({
        message:
          "First name, last name, birthdate, sex, email, and contact number are required.",
      } as addPatient.error);
    }

    // Check if patient already exists
    const existingPatient = await sql`
      SELECT *
      FROM patients
      WHERE last_name = ${last_name}
        AND first_name = ${first_name}
        AND birthdate = ${birthdate}
        AND contact_number = ${contact_number}
        AND email = ${email}
    `;
    if (existingPatient.length > 0) {
      return res.status(400).json({
        message:
          "A patient with the same name, contact number, email, and date of birth already exists.",
      } as addPatient.error);
    }

    const patientId = await generatePatientId();

    // The front desk password (the last name; the front desk can reset it).
    // Patients with an email also get a link to change it to their own.
    const password = last_name;
    const hashedPassword = await bcrypt.hash(password, 10);
    const passwordLink = email ? createPasswordLink() : null;

    // Upload photo to S3 if one was attached (multer puts it on req.file)
    let imageUrl: string | null = null;
    if (req.file) {
      imageUrl = await uploadImage(req.file, "techcare/patients");
    }

    const response = await sql`
      INSERT INTO patients (
        patient_id,
        username,
        password_hash,
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
        guardian_name,
        guardian_relationship,
        guardian_contact,
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
        image_url,
        password_token_hash,
        password_token_expires_at
      )
      VALUES (
        ${patientId},
        ${patientId},
        ${hashedPassword},
        ${first_name},
        ${middle_name ?? null},
        ${last_name},
        ${suffix ?? null},
        ${sex},
        ${email},
        ${street},
        ${barangay},
        ${city},
        ${province},
        ${zip_code},
        ${contact_number},
        ${civil_status ?? "Single"},
        ${blood_type ?? null},
        ${birthdate},
        ${guardian_name ?? null},
        ${guardian_relationship ?? null},
        ${guardian_contact ?? null},
        ${height_cm ?? null},
        ${weight_kg ?? null},
        ${allergies ?? null},
        ${existing_conditions ?? null},
        ${current_medications ?? null},
        ${previous_surgeries ?? null},
        ${previous_hospitalizations ?? null},
        ${family_medical_history ?? null},
        ${smoking_status ?? null},
        ${alcohol_consumption ?? null},
        ${imageUrl},
        ${passwordLink?.hash ?? null},
        ${passwordLink?.expiresAt ?? null}
      )
      RETURNING *;
    `;

    const age = calculateAge(birthdate);

    // =========================
    // WELCOME EMAIL WITH "CHANGE YOUR PASSWORD" LINK
    // =========================
    // Not awaited: the patient shouldn't wait on the email provider.
    if (email && passwordLink) {
      void sendEmail(
        patientAccountCreatedEmail(
          email,
          first_name,
          patientId,
          passwordLink.url,
          PASSWORD_LINK_DAYS,
        ),
      );
    }

    // Don't send the password or link hashes to the client.
    const { password_hash, password_token_hash, ...safePatient } = response[0];

    return res.status(201).json({
      message: "Patient added successfully.",
      patient: { ...safePatient, age } as unknown as addPatient.patient,
    } as addPatient.response);
  } catch (error: any) {
    console.dir(error, { depth: null });
    return res
      .status(500)
      .json({ message: "Failed to add patient." } as addPatient.error);
  }
}

export async function addBills(
  req: Request,
  res: Response<addBills.response | addBills.error>,
) {
  try {
    const {
      patient_id,
      services_ids = [],
      discount_pct = 0,
      discount_amount,
      discount_type,
      payment_method = "Cash",
      status = "Paid",
      reference_num = "",
    } = req.body as addBills.body;

    const user_id =
      req.user?.user_id ?? (!ENV.IS_PRODUCTION ? "U-26-1001-0004" : undefined);

    const validPaymentMethods = ["Cash", "Instapay/QRpH"];
    const validStatuses = ["Paid", "Pending"];
    const discount = Number(discount_pct);
    const fixedDiscount =
      discount_amount === undefined ? null : Number(discount_amount);

    if (
      !patient_id ||
      !Array.isArray(services_ids) ||
      services_ids.length === 0 ||
      !Number.isFinite(discount) ||
      discount < 0 ||
      discount > 100 ||
      (discount_type !== undefined &&
        !["Not Eligible", "Senior Citizen", "PWD", "Custom"].includes(
          discount_type,
        )) ||
      ((discount_type === "Senior Citizen" || discount_type === "PWD") &&
        (discount !== 20 || fixedDiscount !== null)) ||
      (fixedDiscount !== null &&
        (!Number.isFinite(fixedDiscount) ||
          fixedDiscount < 0 ||
          discount !== 0)) ||
      !validPaymentMethods.includes(payment_method) ||
      (payment_method !== "Cash" &&
        (typeof reference_num !== "string" ||
          !reference_num.trim() ||
          reference_num.trim().length > 50)) ||
      !validStatuses.includes(status)
    ) {
      return res.status(400).json({
        message:
          "A patient, services, valid discount, payment method and status are required.",
      } as addBills.error);
    }

    const patient = await sql`SELECT patient_id,
      COALESCE(birthdate::date <= ((NOW() AT TIME ZONE 'Asia/Manila')::date - INTERVAL '60 years')::date, false) AS is_senior,
      COALESCE(is_pwd, false) AS is_pwd FROM patients WHERE patient_id = ${patient_id}`;
    if (!patient.length) {
      return res
        .status(404)
        .json({ message: "Patient not found." } as addBills.error);
    }
    if (
      (discount_type === "Senior Citizen" && !patient[0].is_senior) ||
      (discount_type === "PWD" && !patient[0].is_pwd)
    ) {
      return res
        .status(400)
        .json({ message: "Patient is not eligible for this discount." });
    }

    const selected = await sql`
      SELECT service_id, service_name, service_category, price
      FROM services
      WHERE service_id = ANY(${services_ids}) AND active = TRUE
    `;
    if (selected.length !== new Set(services_ids).size) {
      return res.status(400).json({
        message: "One or more selected services are unavailable.",
      } as addBills.error);
    }

    const items = selected.map((service) => ({
      service_id: service.service_id,
      service_name: service.service_name,
      service_category: service.service_category,
      price: Number(service.price),
      quantity: 1,
    }));
    const subtotal = items.reduce((sum, item) => sum + item.price, 0);
    if (
      items.some((item) => !Number.isFinite(item.price) || item.price < 0) ||
      (fixedDiscount !== null && fixedDiscount > subtotal)
    ) {
      return res.status(400).json({
        message:
          "Service prices must be valid and the discount cannot exceed the subtotal.",
      });
    }
    const total_amount =
      Math.round(
        (fixedDiscount === null
          ? subtotal * (1 - discount / 100)
          : subtotal - fixedDiscount) * 100,
      ) / 100;
    const savedDiscount =
      fixedDiscount === null
        ? discount
        : subtotal > 0
          ? Math.round((fixedDiscount / subtotal) * 10000) / 100
          : 0;
    const invoice_id =
      status === "Paid" ? `I-${randomUUID().slice(0, 12).toUpperCase()}` : null;
    const client = await pool.connect();
    let bill: Record<string, any>;
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext('bill_ids'))");
      const bill_id = await generateBillId(client);
      const { rows } = await client.query(
        `INSERT INTO bills (
           bill_id, patient_id, items,  total_amount, payment_method, status,
           invoice_id, invoice_issued_at, billed_at, subtotal, discount_type, discount_rate,
           discount_amount, paid_at, reference_num, received_by
         )
         VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, NOW(), $10, $11, $4, $12, $13, $14)
         RETURNING *`,
        [
          bill_id,
          patient_id,
          JSON.stringify(items),
          total_amount,
          payment_method,
          status,
          invoice_id,
          invoice_id ? new Date().toISOString() : null,
          subtotal,
          savedDiscount
            ? discount_type && discount_type !== "Not Eligible"
              ? discount_type
              : "Custom"
            : null,
          Math.round((subtotal - total_amount) * 100) / 100,
          status === "Paid" ? new Date().toISOString() : null,
          payment_method === "Cash" ? null : reference_num,
          user_id,
        ],
      );
      bill = rows[0];
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(console.error);
      throw error;
    } finally {
      client.release();
    }

    return res.status(201).json({
      message: "Bill created successfully",
      bill: {
        ...bill,
        items,
      } as unknown as addBills.bill,
    } as addBills.response);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error.",
    } as addBills.error);
  }
}

export async function addLaboratoryRequest(
  req: Request,
  res: Response<addLaboratoryRequest.response | addLaboratoryRequest.error>,
) {
  const {
    patient_id,
    services = [],
    packages = [],
  } = req.body as addLaboratoryRequest.body;
  const user_id =
    req.user?.user_id ?? (!ENV.IS_PRODUCTION ? "U-26-1001-0004" : undefined);

  if (
    !patient_id ||
    !user_id ||
    !Array.isArray(services) ||
    !Array.isArray(packages) ||
    services.length + packages.length === 0
  ) {
    return res.status(400).json({
      message:
        "Patient ID and User ID are required and at least one service or package must be provided.",
    } as addLaboratoryRequest.error);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('lab_ids'))");

    const request_id = await generateLaboratoryRequestID(client);
    const { rows: laboratory_request_result } = await client.query(
      `INSERT INTO test_requests (request_id, patient_id, requested_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [request_id, patient_id, user_id],
    );

    const { bill_id, is_new } = await getOrCreateOpenBill(client, patient_id);

    // Single services are added as they are; packages are expanded into
    // their component services and remember which package they came from.
    const packageIds = [...new Set(packages.map((p) => p.package_id))];
    const entries: { service_id: string; package_id: string | null }[] =
      services.map((s) => ({ service_id: s.service_id, package_id: null }));

    if (packageIds.length > 0) {
      const { rows: activePackages } = await client.query(
        `SELECT package_id FROM packages
         WHERE package_id = ANY($1::text[]) AND active = TRUE`,
        [packageIds],
      );
      if (activePackages.length !== packageIds.length) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: "Invalid or inactive package ID.",
        } as addLaboratoryRequest.error);
      }

      const { rows: components } = await client.query(
        `SELECT ps.package_id, ps.service_id, LOWER(TRIM(s.service_type)) AS service_type
         FROM package_services ps
         JOIN services s ON s.service_id = ps.service_id
         WHERE ps.package_id = ANY($1::text[])`,
        [packageIds],
      );

      for (const package_id of packageIds) {
        const own = components.filter((c) => c.package_id === package_id);
        if (
          own.length === 0 ||
          own.some((c) => !["laboratory", "imaging"].includes(c.service_type))
        ) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            message:
              "A package must contain at least one service, and only laboratory or imaging services.",
          } as addLaboratoryRequest.error);
        }
        for (const c of own) {
          entries.push({ service_id: c.service_id, package_id });
        }
      }
    }

    const laboratory_item_result = [];
    for (const entry of entries) {
      const item_id = await generateLaboratoryItemID(client);
      const { rows } = await client.query(
        `INSERT INTO test_request_items
           (item_id, request_id, service_id, status, bill_id, package_id)
         VALUES ($1, $2, $3, 'Requested', $4, $5)
         RETURNING *`,
        [item_id, request_id, entry.service_id, bill_id, entry.package_id],
      );
      laboratory_item_result.push(rows[0]);
    }

    const bill = await recomputeBillTotals(client, bill_id);

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Laboratory request added successfully.",
      request: laboratory_request_result,
      items: laboratory_item_result,
      bill,
      is_new_bill: is_new,
    } as addLaboratoryRequest.response);
  } catch (error: any) {
    console.error(error);
    await client.query("ROLLBACK").catch(console.error);
    if (error.code === "23503") {
      return res.status(400).json({
        message: "Invalid patient, service or package ID.",
      } as addLaboratoryRequest.error);
    }
    return res.status(500).json({
      message: "Internal server error.",
    } as addLaboratoryRequest.error);
  } finally {
    client.release();
  }
}

export async function addConsultationRecord(
  req: Request,
  res: Response<addConsultationRecord.response | addConsultationRecord.error>,
) {
  const {
    patient_id,
    service_id,
    is_priority = false,
    vital_signs,
  } = req.body as addConsultationRecord.body;
  const user_id =
    req.user?.user_id ?? (!ENV.IS_PRODUCTION ? "U-26-1001-0004" : undefined);

  if (!patient_id || !user_id || !service_id) {
    return res.status(400).json({
      message: "Patient ID and service ID are required.",
    } as addConsultationRecord.error);
  }

  // Temperature, height and weight are taken before every consultation.
  const vitals = readFrontDeskVitals(vital_signs);
  if (!vitals.ok) {
    return res.status(400).json({
      message: vitals.message,
    } as addConsultationRecord.error);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('consultation_ids'))",
    );

    const consultation_record_id = await generateConsultationRecordId(client);
    const queue_id = await generateConsultationQueueId(client);
    const queue_number = await generateQueueNumberConsultation(client);

    const {
      rows: [queue_result],
    } = await client.query(
      `INSERT INTO queue_entries (queue_id, patient_id, queue_number, is_priority)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [queue_id, patient_id, queue_number, is_priority],
    );

    const { bill_id, is_new } = await getOrCreateOpenBill(client, patient_id);

    const {
      rows: [consultation_record_result],
    } = await client.query(
      `INSERT INTO consultation_records
     (consultation_record_id, patient_id, service_id, requested_by, queue_id, status, bill_id, vital_signs)
   VALUES ($1, $2, $3, $4, $5, 'In Queue', $6, $7::jsonb)
   RETURNING *`,
      [
        consultation_record_id,
        patient_id,
        service_id,
        user_id,
        queue_id,
        bill_id,
        JSON.stringify(vitals.value),
      ],
    );

    // Keep the patient's latest height and weight on their record.
    await client.query(
      `UPDATE patients
       SET height_cm = $2, weight_kg = $3, updated_at = NOW()
       WHERE patient_id = $1`,
      [patient_id, vitals.numbers.height, vitals.numbers.weight],
    );

    const bill = await recomputeBillTotals(client, bill_id);

    await client.query("COMMIT");
    publishQueueChange();
    void notifyQueued(patient_id, "consultation", queue_result.queue_number);
    if (is_priority === true) {
      void notifyPriorityPatient(patient_id, "consultation", actorId(req));
    }

    return res.status(201).json({
      message: "Consultation record added successfully.",
      consultation_record: consultation_record_result,
      queue: queue_result,
      bill,
      is_new_bill: is_new,
    } as addConsultationRecord.response);
  } catch (error: any) {
    await client.query("ROLLBACK").catch(console.error);
    console.error(error);

    if (error.code === "23503") {
      return res.status(400).json({
        message: "Invalid patient or service ID.",
      } as addConsultationRecord.error);
    }

    return res.status(500).json({
      message: "Internal server error.",
    } as addConsultationRecord.error);
  } finally {
    client.release();
  }
}

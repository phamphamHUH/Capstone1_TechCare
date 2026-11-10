import { randomUUID } from "node:crypto";
import { ENV } from "../../config/env.js";
import { sql } from "../../config/db.js";
import { pool } from "../../config/db.js";
import bcrypt from "bcryptjs";
import { calculateAge } from "../../utils/calculateAge.js";
import type { Request, Response } from "express";
import cloudinary from "../../config/cloudinary.js";
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
import { sendEmail } from "../../services/email/sendEmail.js";
import { patientAccountCreatedEmail } from "../../services/email/emailTemplates.js";
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

    const password = last_name;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Upload photo to Cloudinary if one was attached (multer puts it on req.file)
    let imageUrl: string | null = null;
    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "techcare/patients",
      });
      imageUrl = uploadResult.secure_url;
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
        image_url
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
        ${imageUrl}
      )
      RETURNING *;
    `;

    const age = calculateAge(birthdate);

    // =========================
    // WELCOME EMAIL (information only)
    // =========================
    // Not awaited: the patient shouldn't wait on the email provider.
    if (email) void sendEmail(patientAccountCreatedEmail(email, first_name, patientId));

    // Don't send the password hash to the client.
    const { password_hash, ...safePatient } = response[0];

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

// export async function addToQueue(
//   req: Request,
//   res: Response<addToQueue.response | addToQueue.error>,
// ) {
//   const { record_type, record_id, is_priority } = req.body as addToQueue.body;

//   if (
//     (record_type !== "laboratory" && record_type !== "consultation") ||
//     !record_id ||
//     typeof is_priority !== "boolean"
//   ) {
//     return res.status(400).json({
//       message: "record_type, record_id and is_priority are required.",
//     } as addToQueue.error);
//   }

//   const client = await pool.connect();
//   try {
//     await client.query("BEGIN");
//     await client.query("SELECT pg_advisory_xact_lock(hashtext('queue_ids'))");

//     // 1. load the source record (patient, service, current queue_id)
//     const { rows } =
//       record_type === "laboratory"
//         ? await client.query(
//             `SELECT lr.patient_id, lri.service_id, lri.queue_id
//              FROM laboratory_request_items lri
//              JOIN laboratory_requests lr ON lr.request_id = lri.request_id
//              WHERE lri.lab_item_id = $1
//              FOR UPDATE OF lri`,
//             [record_id],
//           )
//         : await client.query(
//             `SELECT patient_id, service_id, queue_id
//              FROM consultation_records
//              WHERE consultation_record_id = $1
//              FOR UPDATE`,
//             [record_id],
//           );

//     if (rows.length === 0) {
//       await client.query("ROLLBACK");
//       return res
//         .status(404)
//         .json({ message: "Record not found." } as addToQueue.error);
//     }
//     if (rows[0].queue_id) {
//       await client.query("ROLLBACK");
//       return res
//         .status(409)
//         .json({ message: "Already added to the queue." } as addToQueue.error);
//     }

//     const { patient_id, service_id } = rows[0];

//     // 2. generate the queue ID and number (same transaction, after the lock)
//     const isLab = record_type === "laboratory";

//     const queue_id = isLab
//       ? await generateLaboratoryQueueId()
//       : await generateConsultationQueueId();

//     const queue_number = isLab
//       ? await generateQueueNumberLaboratory()
//       : await generateQueueNumberConsultation();

//     // 3. create the queue entry
//     const { rows: queueRows } = await client.query(
//       `INSERT INTO queue_entries
//          (queue_id, patient_id, service_id, queue_number, is_priority, status)
//        VALUES ($1, $2, $3, $4, $5, 'Waiting')
//        RETURNING *`,
//       [queue_id, patient_id, service_id, queue_number, is_priority],
//     );

//     // 4. link it back to the source record
//     if (isLab) {
//       await client.query(
//         `UPDATE laboratory_request_items
//          SET queue_id = $1, updated_at = NOW(), status = 'Waiting'
//          WHERE lab_item_id = $2`,
//         [queue_id, record_id],
//       );
//     } else {
//       await client.query(
//         `UPDATE consultation_records
//          SET queue_id = $1, status = 'Waiting'
//          WHERE consultation_record_id = $2`,
//         [queue_id, record_id],
//       );
//     }

//     await client.query("COMMIT");
//     return res.status(201).json({
//       message: "Added to queue.",
//       queue: queueRows[0] as unknown as addToQueue.queue,
//     } as addToQueue.response);
//   } catch (error) {
//     await client.query("ROLLBACK").catch(console.error);
//     console.error("Error adding to queue:", error);
//     if ((error as { code?: string }).code === "23503") {
//       return res
//         .status(400)
//         .json({ message: "Invalid patient or service." } as addToQueue.error);
//     }
//     return res
//       .status(500)
//       .json({ message: "Internal server error." } as addToQueue.error);
//   } finally {
//     client.release();
//   }
// }

export async function addLaboratoryRequest(
  req: Request,
  res: Response<addLaboratoryRequest.response | addLaboratoryRequest.error>,
) {
  const { patient_id, services } = req.body as addLaboratoryRequest.body;
  const user_id =
    req.user?.user_id ?? (!ENV.IS_PRODUCTION ? "U-26-1001-0004" : undefined);

  if (
    !patient_id ||
    !user_id ||
    !Array.isArray(services) ||
    services.length === 0
  ) {
    return res.status(400).json({
      message:
        "Patient ID and User ID are required and at least one service must be provided.",
    } as addLaboratoryRequest.error);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('lab_ids'))");

    const request_id = await generateLaboratoryRequestID(client);
    const { rows: laboratory_request_result } = await client.query(
      `INSERT INTO laboratory_requests (request_id, patient_id, requested_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [request_id, patient_id, user_id],
    );

    const { bill_id, is_new } = await getOrCreateOpenBill(client, patient_id);

    const laboratory_item_result = [];
    for (const service of services) {
      const lab_item_id = await generateLaboratoryItemID(client);
      const { rows } = await client.query(
        `INSERT INTO laboratory_request_items
           (lab_item_id, request_id, service_id, status, bill_id)
         VALUES ($1, $2, $3, 'Requested', $4)
         RETURNING *`,
        [lab_item_id, request_id, service.service_id, bill_id],
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
        message: "Invalid patient or service ID.",
      } as addLaboratoryRequest.error);
    }
    console.error(error);
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
  } = req.body as addConsultationRecord.body;
  const user_id =
    req.user?.user_id ?? (!ENV.IS_PRODUCTION ? "U-26-1001-0004" : undefined);

  if (!patient_id || !user_id || !service_id) {
    return res.status(400).json({
      message: "Patient ID and service ID are required.",
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
     (consultation_record_id, patient_id, service_id, requested_by, queue_id, status, bill_id)
   VALUES ($1, $2, $3, $4, $5, 'In Queue', $6)
   RETURNING *`,
      [
        consultation_record_id,
        patient_id,
        service_id,
        user_id,
        queue_id,
        bill_id,
      ],
    );

    const bill = await recomputeBillTotals(client, bill_id);

    await client.query("COMMIT");
    publishQueueChange();

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

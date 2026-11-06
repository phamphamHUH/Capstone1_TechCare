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

export { confirmPayment } from "./billPayment.controller.js";

import bcrypt from "bcryptjs";
import cloudinary from "../../config/cloudinary.js";
import { sql } from "../../config/db.js";
import { calculateAge } from "../../utils/calculateAge.js";
import { json, Request, response, Response } from "express";

export async function updatePatient(req: Request, res: Response) {
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
    } = req.body;

    if (!patient_id) {
      return res.status(400).json({
        message: "Patient_id is missing.",
      });
    }

    const existingPatient = await sql`
            SELECT patient_id
            FROM patients
            WHERE patient_id = ${patient_id}
        `;

    if (existingPatient.length === 0) {
      return res.status(404).json({
        message: "Patient not found.",
      });
    }

    // Only replace image_url if a new file was actually uploaded;
    // otherwise keep whatever is already on the record.
    // let imageUrl = existingPatient[0].image_url;

    // if (req.file) {
    //   const uploadResult = await cloudinary.uploader.upload(req.file.path, {
    //     folder: "products",
    //   });
    //   imageUrl = uploadResult.secure_url;
    // }

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
      patient: { ...updatedPatient, age },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
}
export async function serveQueueEntry(req: Request, res: Response) {
  try {
    const { queue_id } = req.params;

    if (!queue_id) {
      return res.status(400).json({
        message: "queue_id is required.",
      });
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
      });
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
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
}

export async function skipQueueEntry(req: Request, res: Response) {
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
      });
    }

    const { queue_number: currentQueueNumber, service_type } = queue[0];

    // Move the patient behind forward by one position.
    //
    // Example:
    // Charlie = #3
    // David = #4
    //
    // David becomes #3.
    //
    // Scoped to the same service_type and status = 'waiting' so this
    // doesn't accidentally shift patients in other queues (e.g. Lab)
    // or already-served/cancelled entries that happen to share the
    // same queue_number.
    await sql`
      UPDATE queue_entries
      SET queue_number = queue_number - 1
      WHERE
        queue_number = ${currentQueueNumber + 1}
        AND service_type = ${service_type}
        AND status = 'waiting';
    `;

    // Move the skipped patient back by one position.
    //
    // Charlie becomes #4.
    const updatedQueue = await sql`
      UPDATE queue_entries
      SET queue_number = ${currentQueueNumber + 1}
      WHERE queue_id = ${queue_id}
      RETURNING *;
    `;

    return res.status(200).json({
      message: "Queue skipped successfully.",
      queue: updatedQueue[0],
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Error in skipQueueEntry controller.",
    });
  }
}

export async function confirmLabRequestPayment(req: Request, res: Response) {
  try {
    const { request_id } = req.params;

    const updatedLabRequest = await sql`
    UPDATE laboratory_requests
    SET is_paid = true,
        status = 'Paid'
    WHERE request_id = ${request_id}
        AND is_paid = FALSE
    RETURNING *;
    `;

    if (updatedLabRequest.length === 0) {
      return res.status(404).json({
        message: "Laboratory request not found.",
      });
    }

    return res.status(200).json({
      message: "Laboratory request payment confirmed.",
      request: updatedLabRequest,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Error in Confirming Laboratory Request Payment",
    });
  }
}

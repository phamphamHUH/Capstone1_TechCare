import { pool, sql } from "../../config/db.js";
import type { Request, Response } from "express";
import {
  generateLaboratoryRequestID,
  generateLaboratoryItemID,
  generatePrescriptionId,
} from "../../utils/generateId.js";
import { validateLabRequest } from "../../utils/consultationValidation.js";
import { resolveDoctorId } from "../../utils/resolveDoctorId.js";
import { getOrCreateOpenBill } from "../../utils/getOrCreateBill.js";
import { recomputeBillTotals } from "../../utils/recomputeBills.js";
import type { addLaboratoryRequest, addPrescriptions } from "./dto/post.dto.js";

type PrescriptionItem = {
  medication: string;
  dosage: string;
  frequency: string;
  duration?: string;
  quantity?: number;
  instructions?: string;
};

export async function addLaboratoryRequest(
  req: Request,
  res: Response<addLaboratoryRequest.response | addLaboratoryRequest.error>,
) {
  const validation = validateLabRequest(req.body);
  if (!validation.ok) {
    return res.status(400).json({
      message: "Validation failed.",
      errors: validation.errors,
    } as addLaboratoryRequest.error);
  }

  const requested_by = resolveDoctorId(req);
  if (!requested_by) {
    return res.status(401).json({
      message: "Doctor could not be identified.",
    } as addLaboratoryRequest.error);
  }

  const {
    patient_id,
    consultation_record_id,
    service_ids,
    priority,
    request_date,
    estimated_release_date,
  } = validation.value;

  try {
    // Only active laboratory-type services can be ordered.
    const services = await sql`
      SELECT service_id, service_type, active
      FROM services
      WHERE service_id = ANY(${service_ids}::text[])
    `;
    const found = new Map(services.map((s) => [s.service_id as string, s]));
    const unknown = service_ids.filter((id) => !found.has(id));
    if (unknown.length > 0) {
      return res.status(400).json({
        message: "Validation failed.",
        errors: { services: `Unknown service: ${unknown.join(", ")}` },
      } as addLaboratoryRequest.error);
    }
    const notLab = service_ids.filter((id) => {
      const s = found.get(id)!;
      return (
        !s.active ||
        !String(s.service_type).toLowerCase().startsWith("laboratory")
      );
    });
    if (notLab.length > 0) {
      return res.status(400).json({
        message: "Validation failed.",
        errors: {
          services: `Selected services must be active laboratory services: ${notLab.join(", ")}`,
        },
      } as addLaboratoryRequest.error);
    }

    if (consultation_record_id) {
      const consultation = await sql`
        SELECT patient_id, consulted_by
        FROM consultation_records
        WHERE consultation_record_id = ${consultation_record_id}
      `;
      if (consultation.length === 0) {
        return res.status(404).json({
          message: "Consultation record not found.",
        } as addLaboratoryRequest.error);
      }
      if (consultation[0].patient_id !== patient_id) {
        return res.status(400).json({
          message:
            "Consultation record does not belong to the selected patient.",
        } as addLaboratoryRequest.error);
      }
      if (
        consultation[0].consulted_by &&
        consultation[0].consulted_by !== requested_by
      ) {
        return res.status(403).json({
          message:
            "You can only order laboratory requests for your own consultations.",
        } as addLaboratoryRequest.error);
      }
    }

    const patient =
      await sql`SELECT 1 FROM patients WHERE patient_id = ${patient_id}`;
    if (patient.length === 0) {
      return res
        .status(404)
        .json({ message: "Patient not found." } as addLaboratoryRequest.error);
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext('lab_ids'))");

      const request_id = await generateLaboratoryRequestID(client);
      const { rows: laboratory_request_result } = await client.query(
        `INSERT INTO test_requests (
           request_id,
           patient_id,
           consultation_record_id,
           requested_by,
           is_priority,
           requested_at,
           estimated_release_date
         )
         VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamp, CURRENT_TIMESTAMP), $7)
         RETURNING *`,
        [
          request_id,
          patient_id,
          consultation_record_id || null,
          requested_by,
          priority === "Yes",
          request_date,
          estimated_release_date,
        ],
      );

      const { bill_id, is_new } = await getOrCreateOpenBill(client, patient_id);

      const laboratory_item_result = [];
      for (const service_id of service_ids) {
        const item_id = await generateLaboratoryItemID(client);
        const { rows } = await client.query(
          `INSERT INTO test_request_items (item_id, request_id, service_id, status, bill_id)
           VALUES ($1, $2, $3, 'Requested', $4)
           RETURNING *`,
          [item_id, request_id, service_id, bill_id],
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
          message: "Invalid patient, doctor or service ID.",
        } as addLaboratoryRequest.error);
      }
      return res.status(500).json({
        message: "Internal server error.",
      } as addLaboratoryRequest.error);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error adding laboratory request:", error);
    return res.status(500).json({
      message: "Internal server error.",
    } as addLaboratoryRequest.error);
  }
}

export async function addPrescriptions(
  req: Request,
  res: Response<addPrescriptions.response | addPrescriptions.error>,
) {
  const { consultation_record_id } = req.params;
  const {
    items,
    valid_until = null,
    notes = null,
  } = req.body as addPrescriptions.body;
  const user_id = req.user?.user_id;

  if (!consultation_record_id) {
    return res.status(400).json({
      message: "Consultation record ID is required.",
    } as addPrescriptions.error);
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: "At least one medication is required.",
    } as addPrescriptions.error);
  }

  const cleanItems: PrescriptionItem[] = [];
  for (const item of items) {
    const medication = item?.medication?.trim();
    const dosage = item?.dosage?.trim();
    const frequency = item?.frequency?.trim();
    const duration = item?.duration?.trim();
    const instructions = item?.instructions?.trim();

    if (!medication || !dosage || !frequency) {
      return res.status(400).json({
        message: "Each medication needs a name, dosage, and frequency.",
      } as addPrescriptions.error);
    }
    cleanItems.push({
      medication,
      dosage,
      frequency,
      duration,
      instructions,
    });
  }

  if (valid_until && !/^\d{4}-\d{2}-\d{2}$/.test(valid_until)) {
    return res.status(400).json({
      message: "valid_until must be YYYY-MM-DD.",
    } as addPrescriptions.error);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: consultation } = await client.query(
      `SELECT patient_id, consulted_by
       FROM consultation_records
       WHERE consultation_record_id = $1`,
      [consultation_record_id],
    );

    if (consultation.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Consultation record not found.",
      } as addPrescriptions.error);
    }

    if (
      consultation[0].consulted_by &&
      consultation[0].consulted_by !== user_id
    ) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        message: "You can only prescribe for your own consultations.",
      } as addPrescriptions.error);
    }

    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('prescription_ids'))",
    );
    const prescription_id = await generatePrescriptionId();

    const { rows } = await client.query(
      `INSERT INTO prescription_records
         (prescription_id, consultation_record_id, patient_id, prescriber_id,
          valid_until, prescription_items, notes)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
       RETURNING *`,
      [
        prescription_id,
        consultation_record_id,
        consultation[0].patient_id,
        user_id,
        valid_until,
        JSON.stringify(cleanItems),
        notes,
      ],
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Prescription added successfully.",
      prescription: rows[0],
    } as addPrescriptions.response);
  } catch (error) {
    await client.query("ROLLBACK").catch(console.error);
    console.error("Error adding prescription:", error);

    if ((error as { code?: string }).code === "23503") {
      return res.status(400).json({
        message: "Invalid consultation, patient, or user.",
      } as addPrescriptions.error);
    }
    return res
      .status(500)
      .json({ message: "Internal server error." } as addPrescriptions.error);
  } finally {
    client.release();
  }
}

// POST /api/doctor/consultations
// Body: { patient_id, service_id, consultation_type?, doctor_id? (dev only),
//         presenting_complaint: { hpi }, diagnosis: [{diagnosis, icd10, type}],
//         physical_examination: { general_appearance, heent, ... } }

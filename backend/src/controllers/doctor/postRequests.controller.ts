import { pool, sql } from "../../config/db.js";
import type { Request, Response } from "express";
import {
  generateLaboratoryRequestID,
  generateLaboratoryItemID,
  generatePrescriptionId,
} from "../../utils/generateId.js";
import { validateLabRequest } from "./utils/consultationValidation.js";
import { resolveDoctorId } from "./utils/resolveDoctorId.js";
import { getOrCreateOpenBill } from "../../utils/getOrCreateBill.js";
import { recomputeBillTotals } from "../../utils/recomputeBills.js";
import type { addLaboratoryRequest, addPrescriptions } from "./dto/post.dto.js";
import { ENV } from "../../config/env.js";

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
         VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, CURRENT_TIMESTAMP), $7)
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

export async function addPrescription(
  req: Request,
  res: Response<addPrescriptions.response | addPrescriptions.error>,
) {
  // POST /api/doctor/prescriptions
  const {
    consultation_record_id,
    prescription_items,
    notes,
    valid_until,
    prescriber_id: bodyPrescriberId,
  } = req.body as addPrescriptions.body;

  // Production: always the logged-in user. Otherwise: what the frontend sends.
  const prescriber_id = ENV.IS_PRODUCTION
    ? req.user?.user_id
    : (bodyPrescriberId ?? req.user?.user_id);

  const text = (v: unknown) => typeof v === "string" && v.trim().length > 0;

  if (!text(prescriber_id) || !text(consultation_record_id)) {
    return res.status(400).json({
      message: "Consultation record and prescriber are required.",
    } as addPrescriptions.error);
  }
  if (
    !Array.isArray(prescription_items) ||
    prescription_items.length === 0 ||
    prescription_items.some(
      (i) =>
        !text(i?.name) ||
        !text(i?.dosage) ||
        !text(i?.frequency) ||
        !text(i?.duration),
    )
  ) {
    return res.status(400).json({
      message:
        "Add at least one medication with a name, dosage, frequency and duration.",
    } as addPrescriptions.error);
  }
  if (valid_until && !/^\d{4}-\d{2}-\d{2}$/.test(valid_until)) {
    return res.status(400).json({
      message: "valid_until must be a YYYY-MM-DD date.",
    } as addPrescriptions.error);
  }

  // Store only the known fields, trimmed.
  const cleanItems = prescription_items.map((i) => ({
    name: i.name.trim(),
    dosage: i.dosage.trim(),
    frequency: i.frequency.trim(),
    duration: i.duration.trim(),
    instructions: (i.instructions ?? "").trim(),
  }));

  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const item of cleanItems) {
    const key = normalize(item.name);
    if (seen.has(key)) duplicates.add(item.name);
    seen.add(key);
  }

  if (duplicates.size > 0) {
    return res.status(400).json({
      message: `Duplicate medication: ${[...duplicates].join(", ")}. Each medication can only be listed once.`,
    } as addPrescriptions.error);
  }

  try {
    // Delete the existing prescription for this consultation.
    await sql`
    DELETE FROM prescription_records
    WHERE consultation_record_id = ${consultation_record_id}
  `;

    const prescription_id = await generatePrescriptionId();

    const rows = await sql`
    INSERT INTO prescription_records
      (prescription_id, consultation_record_id, patient_id, prescriber_id,
       valid_until, prescription_items, notes)
    SELECT ${prescription_id}, cr.consultation_record_id, cr.patient_id,
           ${prescriber_id}, ${valid_until ?? null},
           ${JSON.stringify(cleanItems)}::jsonb, ${notes?.trim() || null}
    FROM consultation_records cr
    WHERE cr.consultation_record_id = ${consultation_record_id}
    RETURNING *
  `;

    const prescription = rows[0];

    if (!prescription) {
      return res
        .status(404)
        .json({ message: "Consultation not found." } as addPrescriptions.error);
    }

    return res.status(201).json({
      message: "Prescription saved successfully.",
      prescription,
    } as addPrescriptions.response);
  } catch (error: any) {
    console.error("Unable to save prescription:", error);

    if (error.code === "23503") {
      return res.status(400).json({
        message: "Invalid patient or prescriber ID.",
      } as addPrescriptions.error);
    }

    return res
      .status(500)
      .json({ message: "Internal server error." } as addPrescriptions.error);
  }
}

// POST /api/doctor/consultations
// Body: { patient_id, service_id, consultation_type?, doctor_id? (dev only),
//         presenting_complaint: { hpi }, diagnosis: [{diagnosis, type}],
//         physical_examination: { general_appearance, heent, ... } }

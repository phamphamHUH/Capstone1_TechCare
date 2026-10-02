import { Request, Response } from "express";
import { pool, sql } from "../../config/db.js";
import { generateConsultationRecordID } from "../../utils/generateConsultationId.js";
import { validateFindings } from "../../utils/consultationValidation.js";
import { resolveDoctorId } from "../../utils/resolveDoctorId.js";

// POST /api/doctor/consultations
// Body: { patient_id, service_id, consultation_type?, doctor_id? (dev only),
//         presenting_complaint: { hpi }, diagnosis: [{diagnosis, icd10, type}],
//         physical_examination: { general_appearance, heent, ... } }
export async function addConsultationFindings(req: Request, res: Response) {
  const patient_id =
    typeof req.body?.patient_id === "string" ? req.body.patient_id.trim() : "";
  if (!patient_id) {
    return res.status(400).json({
      message: "Validation failed.",
      errors: { patient_id: "Patient is required." },
    });
  }

  const validation = validateFindings(req.body);
  if (!validation.ok) {
    return res
      .status(400)
      .json({ message: "Validation failed.", errors: validation.errors });
  }

  const doctor_id = resolveDoctorId(req);
  if (!doctor_id) {
    return res.status(401).json({ message: "Doctor could not be identified." });
  }

  const consultation_type =
    typeof req.body?.consultation_type === "string" && req.body.consultation_type.trim()
      ? req.body.consultation_type.trim().slice(0, 255)
      : "Initial";

  try {
    // consultation_records.service_id is NOT NULL. For now the caller supplies it
    // directly; queue linking can be added later (queue_id stays NULL).
    const service_id =
      typeof req.body?.service_id === "string" ? req.body.service_id.trim() : "";
    if (!service_id) {
      return res.status(400).json({
        message: "Validation failed.",
        errors: { service_id: "A consultation service_id is required." },
      });
    }

    const service = await sql`
      SELECT service_type FROM services WHERE service_id = ${service_id}
    `;
    if (service.length === 0) {
      return res.status(400).json({ message: "Invalid service ID." });
    }
    if (!String(service[0].service_type).toLowerCase().startsWith("consultation")) {
      return res
        .status(400)
        .json({ message: "Service is not a consultation service." });
    }

    const patient = await sql`SELECT 1 FROM patients WHERE patient_id = ${patient_id}`;
    if (patient.length === 0) {
      return res.status(404).json({ message: "Patient not found." });
    }

    const { presenting_complaint, diagnosis, physical_examination } = validation.value;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext('consultation_ids'))");

      const consultation_record_id = await generateConsultationRecordID(client);
      const { rows } = await client.query(
        `INSERT INTO consultation_records (
           consultation_record_id, patient_id, doctor_id, service_id,
           consultation_type, diagnosis, presenting_complaint, physical_examination
         )
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb)
         RETURNING *`,
        [
          consultation_record_id,
          patient_id,
          doctor_id,
          service_id,
          consultation_type,
          JSON.stringify(diagnosis),
          JSON.stringify(presenting_complaint),
          JSON.stringify(physical_examination),
        ],
      );
      await client.query("COMMIT");

      return res.status(201).json({
        message: "Consultation findings saved successfully.",
        consultation: rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK").catch(console.error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error saving consultation findings:", error);
    if (error?.code === "23503") {
      return res
        .status(400)
        .json({ message: "Invalid patient, doctor or service ID." });
    }
    return res.status(500).json({ message: "Failed to save consultation findings." });
  }
}

// GET /api/doctor/laboratory-services
// Active laboratory-type services a doctor can order (service_type starting
// with "Laboratory"; Radiology etc. are not offered here).
export async function getLaboratoryServices(_req: Request, res: Response) {
  try {
    const services = await sql`
      SELECT service_id, service_name, service_type, price, room
      FROM services
      WHERE active = TRUE
        AND LOWER(service_type) LIKE 'laboratory%'
      ORDER BY service_name ASC
    `;
    return res.status(200).json({ services });
  } catch (error) {
    console.error("Error fetching laboratory services:", error);
    return res.status(500).json({ message: "Failed to fetch laboratory services." });
  }
}

// GET /api/doctor/consultation-patients/:patient_id
// Basic demographics for the consultation header (doctor-accessible).
export async function getConsultationPatient(req: Request, res: Response) {
  try {
    const { patient_id } = req.params;
    const rows = await sql`
      SELECT patient_id, first_name, middle_name, last_name, suffix, sex,
             to_char(birthdate, 'YYYY-MM-DD') AS birthdate,
             contact_number, address, image_url
      FROM patients
      WHERE patient_id = ${patient_id}
    `;
    if (rows.length === 0) {
      return res.status(404).json({ message: "Patient not found." });
    }
    return res.status(200).json({ patient: rows[0] });
  } catch (error) {
    console.error("Error fetching consultation patient:", error);
    return res.status(500).json({ message: "Failed to fetch patient." });
  }
}

import { pool } from "../../config/db.js";
import { Request, Response } from "express";
import {
  generateLaboratoryRequestID,
  generateLaboratoryItemID,
  generatePrescriptionId,
} from "../../utils/generateId.js";

type PrescriptionItem = {
  medication: string;
  dosage: string;
  frequency: string;
  duration?: string;
  quantity?: number;
  instructions?: string;
};

export async function addLaboratoryRequest(req: Request, res: Response) {
  const { patient_id, services } = req.body;

  if (!patient_id || !Array.isArray(services) || services.length === 0) {
    return res.status(400).json({
      message:
        "Patient ID is required and at least one service must be provided.",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('lab_ids'))");

    const request_id = await generateLaboratoryRequestID(client);
    const { rows: laboratory_request_result } = await client.query(
      `INSERT INTO laboratory_requests (request_id, patient_id, is_paid)
       VALUES ($1, $2, TRUE)
       RETURNING *`,
      [request_id, patient_id],
    );

    const laboratory_item_result = [];
    for (const service of services) {
      const lab_item_id = await generateLaboratoryItemID(client);
      const { rows } = await client.query(
        `INSERT INTO laboratory_request_items (lab_item_id, request_id, service_id, status)
         VALUES ($1, $2, $3, 'Requested')
         RETURNING *`,
        [lab_item_id, request_id, service.service_id],
      );
      laboratory_item_result.push(rows[0]);
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Laboratory request added successfully.",
      request: laboratory_request_result,
      items: laboratory_item_result,
    });
  } catch (error: any) {
    console.error(error);
    await client.query("ROLLBACK").catch(console.error);
    if (error.code === "23503") {
      return res
        .status(400)
        .json({ message: "Invalid patient or service ID." });
    }
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  } finally {
    client.release();
  }
}

export async function addPrescriptions(req: Request, res: Response) {
  const { consultation_record_id } = req.params;
  const {
    items,
    valid_until = null,
    notes = null,
  } = req.body as {
    items: PrescriptionItem[];
    valid_until?: string | null;
    notes?: string | null;
  };
  const user_id = req.user?.user_id;

  if (!consultation_record_id) {
    return res
      .status(400)
      .json({ message: "Consultation record ID is required." });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ message: "At least one medication is required." });
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
      });
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
    return res.status(400).json({ message: "valid_until must be YYYY-MM-DD." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: consultation } = await client.query(
      `SELECT patient_id, doctor_id
       FROM consultation_records
       WHERE consultation_record_id = $1`,
      [consultation_record_id],
    );

    if (consultation.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ message: "Consultation record not found." });
    }

    if (consultation[0].doctor_id !== user_id) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        message: "You can only prescribe for your own consultations.",
      });
    }

    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('prescription_ids'))",
    );
    const prescription_id = await generatePrescriptionId(client);

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
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(console.error);
    console.error("Error adding prescription:", error);

    if ((error as { code?: string }).code === "23503") {
      return res
        .status(400)
        .json({ message: "Invalid consultation, patient, or user." });
    }
    return res.status(500).json({ message: "Internal server error." });
  } finally {
    client.release();
  }
}

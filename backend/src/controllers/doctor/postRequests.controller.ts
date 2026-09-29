import { pool } from "../../config/db.js";
import { Request, Response } from "express";
import {
  generateLaboratoryRequestID,
  generateLaboratoryItemID,
} from "../../utils/generateId.js";

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
      `INSERT INTO lab_requests (request_id, patient_id, is_paid)
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

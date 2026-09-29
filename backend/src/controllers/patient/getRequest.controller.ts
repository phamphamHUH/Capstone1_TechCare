import { sql } from "../../config/db.js";
import { Request, Response } from "express";

export async function getAllConsultations(req: Request, res: Response) {
  try {
    const { patient_id } = req.params;

    if (!patient_id) {
      return res.status(400).json("Patient ID is required!");
    }

    const consultations = await sql`
        SELECT * FROM consultation_records
        WHERE patient_id = ${patient_id}
        ORDER BY consulted_at DESC
      `;

    return res.status(200).json({
      message: "Consultations successfully fetched.",
      consultations,
    });
  } catch (error) {
    console.error("Error fetching consultations:", error);
    return res.status(500).json({ message: "Failed to fetch consultations" });
  }
}

export async function getCurrentPrescriptions(req: Request, res: Response) {}

import { sql } from "../../config/db.js";
import { Request, Response } from "express";

export async function getAllConsultations(req: Request, res: Response) {
  try {
    const { patient_id } = req.params;
    const { doctor_id, consultation_type } = req.query;

    if (!patient_id) {
      return res.status(400).json("Patient ID is required.");
    }

    // const consultations = await sql`
    //     SELECT * FROM consultation_records
    //     WHERE patient_id = ${patient_id}
    //     ORDER BY consulted_at DESC
    //   `;

    let consultations;

    // IDK IF GOODS TO, PARA SANA SA SERVER-SIDE NA RIN FILTERING
    // IF EKIS TO THEN USE THE COMMENTED SQL LOGIC SA TAASs
    if (doctor_id && consultation_type) {
      consultations = await sql`
        SELECT * FROM consultation_records
        WHERE patient_id = ${patient_id}
          AND doctor_id = ${doctor_id}
          AND consultation_type = ${consultation_type}
        ORDER BY consulted_at DESC
      `;
    } else if (doctor_id) {
      consultations = await sql`
        SELECT * FROM consultation_records
        WHERE patient_id = ${patient_id}
          AND doctor_id = ${doctor_id}
        ORDER BY consulted_at DESC
      `;
    } else if (consultation_type) {
      consultations = await sql`
        SELECT * FROM consultation_records
        WHERE patient_id = ${patient_id}
          AND consultation_type = ${consultation_type}
        ORDER BY consulted_at DESC
      `;
    } else {
      consultations = await sql`
        SELECT * FROM consultation_records
        WHERE patient_id = ${patient_id}
        ORDER BY consulted_at DESC
      `;
    }

    return res.status(200).json({
      message: "Consultations successfully fetched.",
      consultations,
    });
  } catch (error) {
    console.error("Error fetching consultations:", error);
    return res.status(500).json({ message: "Failed to fetch consultations" });
  }
}

export async function getCurrentPrescriptions(req: Request, res: Response) {
  try {
    const { patient_id } = req.params;

    if (!patient_id) {
      return res.status(400).json("Patient ID is required.");
    }

    const prescriptions = await sql`
      SELECT * FROM prescription_records
      WHERE patient_id = ${patient_id}
        AND status = 'Active'
        AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
      ORDER BY prescribed_at DESC
    `;

    return res
      .status(200)
      .json({ message: "Prescriptions successfully fetched.", prescriptions });
  } catch (error) {
    console.error("Error fetching current prescriptions:", error);
    return res.status(500).json({ message: "Failed to fetch prescriptions" });
  }
}

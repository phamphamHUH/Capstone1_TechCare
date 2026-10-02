import { sql } from "../../config/db.js";
import { Request, Response } from "express";

export async function getMedicalHistory(req: Request, res: Response) {
  try {
    const { patient_id } = req.params;
    const {
      search,
      service_category,
      status,
      start_date,
      end_date,
      page = "1",
      limit = "10",
    } = req.query as Record<string, string | undefined>;

    if (!patient_id) {
      return res.status(400).json({ message: "Patient ID is required." });
    }

    const pageNum = Math.max(parseInt(page as string) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit as string) || 10, 1), 50);
    const offset = (pageNum - 1) * limitNum;

    const rows = await sql`
      WITH history AS (
      SELECT
        'consultation'::text                AS record_type,
        cr.consultation_record_id::text     AS record_id,
        s.service_name::text                AS service_name,
        s.room::text                        AS room,
        'Consultation'::text                AS service_category,
        'Completed'::text                   AS status,
        cr.consulted_at                     AS occurred_at
      FROM consultation_records cr
      JOIN services s ON s.service_id = cr.service_id
      WHERE cr.patient_id = ${patient_id}

      UNION ALL

      SELECT
        'laboratory'::text,
        lri.lab_item_id::text,
        s.service_name::text,
        s.room::text,
        'Laboratory'::text,
        lri.status::text,
        lr.requested_at
      FROM laboratory_request_items lri
      JOIN laboratory_requests lr ON lr.request_id = lri.request_id
      JOIN services s             ON s.service_id = lri.service_id
      WHERE lr.patient_id = ${patient_id}
    )
      SELECT *, COUNT(*) OVER() AS total_count
      FROM history
      WHERE TRUE
        ${search ? sql`AND service_name ILIKE ${"%" + search + "%"}` : sql``}
        ${service_category ? sql`AND service_category = ${service_category}` : sql``}
        ${status ? sql`AND status = ${status}` : sql``}
        ${start_date ? sql`AND occurred_at >= ${start_date}::date` : sql``}
        ${end_date ? sql`AND occurred_at < (${end_date}::date + INTERVAL '1 day')` : sql``}
      ORDER BY occurred_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const total = rows.length ? Number(rows[0].total_count) : 0;

    return res.status(200).json({
      message: "Medical history successfully fetched.",
      records: rows.map(({ total_count, ...r }) => r),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) { 
    console.error("Error fetching medical history:", error);
    return res.status(500).json({
      message: "Failed to fetch medical history",
      detail: error instanceof Error ? error.message : String(error),
    });
  
  }
}

export async function getMedicalHistoryDetails(req: Request, res: Response) {
  try {
    const { record_type, record_id } = req.params;

    if (record_type === "laboratory") {
      const [labDetails] = await sql`
        SELECT
          lri.lab_item_id, lri.status, lri.updated_at,
          s.service_name, s.room,
          CONCAT_WS(' ', req_u.first_name, req_u.last_name)   AS requested_by,
          req_u.role                                          AS requested_by_role,
          CONCAT_WS(' ', proc_u.first_name, proc_u.last_name) AS processed_by,
          proc_u.role                                         AS processed_by_role
        FROM laboratory_request_items lri
        JOIN services s                                       ON s.service_id = lri.service_id
        JOIN laboratory_requests lr                           ON lr.request_id = lri.request_id
        LEFT JOIN users req_u                                 ON req_u.user_id = lr.requested_by
        LEFT JOIN users proc_u                                ON proc_u.user_id = lri.processed_by
        WHERE lri.lab_item_id = ${record_id}
      `;

      if (!labDetails)
        return res.status(404).json({ message: "Laboratory record not found." });

      const results = await sql`
        SELECT result_id, result_value, unit, reference_range, flag, remarks,
              verified_by, verified_at, image_url, created_at
        FROM laboratory_results
        WHERE lab_item_id = ${record_id}
        ORDER BY created_at
      `;

      return res.status(200).json({
        message: "Laboratory record and result/s successfully fetched",
        record_type,
        ...labDetails,
        results,
      });
    }

    if (record_type === "consultation") {
      const [consDetails] = await sql`
        SELECT 
          cr.consultation_record_id,  cr.consultation_type, cr.diagnosis, cr.notes,
          cr.consulted_at,
          s.service_name, s.room,
          CONCAT_WS(' ', u.first_name, u.last_name)                                AS consulted_by
          FROM consultation_records cr
          JOIN services s                                                           ON s.service_id = cr.service_id
          LEFT JOIN users u                                                         ON u.user_id = cr.doctor_id
          WHERE cr.consultation_record_id = ${record_id}
      `;

      if (!consDetails)
        return res
          .status(404)
          .json({ message: "Consultation record not found." });

      const prescription = await sql`
        SELECT 
          p.prescription_id, p.prescription_items, p.notes, p.valid_until, p.prescribed_at,
          CONCAT_WS(' ', u.first_name, u.last_name)                                         AS prescribed_by
        FROM prescription_records p
        JOIN users u                                                                        ON u.user_id = p.prescriber_id
        WHERE consultation_record_id = ${record_id}
        ORDER BY p.id
      `;

      return res.status(200).json({
        message: "Consultation record and prescription/s successfully fetched",
        record_type,
        ...consDetails,
        prescription,
      });
    }

    return res.status(400).json({ message: "Invalid record type." });
  } catch (error) {
    console.error("Error fetching current prescriptions:", error);
    return res.status(500).json({ message: "Failed to fetch prescriptions" });
  }
}

export async function getMedicalHistoryFull(req: Request, res: Response) {
  try {
    const { record_type, record_id } = req.params;

    if (record_type === "laboratory") {
      const [fullLab] = await sql`
        SELECT
          lri.lab_item_id, lri.status, lri.updated_at,
          lr.result_value, lr.remarks, lr.verified_by, lr.verified_at,
          s.service_name, s.room,
          CONCAT_WS(' ', req_u.first_name, req_u.last_name)   AS requested_by,
          req_u.role                                          AS requested_by_role,
          CONCAT_WS(' ', proc_u.first_name, proc_u.last_name) AS processed_by,  
          proc_u.role                                         AS processed_by_role
          FROM laboratory_request_items lri
          JOIN services s                                     ON s.service_id = lri.service_id
          JOIN laboratory_requests lr                         ON lr.request_id = lri.request_id
          LEFT JOIN users req_u                               ON req_u.user_id = lr.requested_by
          LEFT JOIN users proc_u                              ON proc_u.user_id = lri.processed_by
          WHERE lri.lab_item_id = ${record_id}

      `;

      if (!fullLab)
        return res.status(404).json({ message: "Laboratory record not found" });

      return res.status(200).json({
        message: "Full laboratory details successfully fetched",
        record_type,
        ...fullLab,
      });
    }
    if (record_type === "consultation") {
      const [consDetails] = await sql`
        SELECT 
          cr.consultation_record_id,  cr.consultation_type, cr.diagnosis, cr.notes,
          cr.consulted_at, cr.presenting_complaint, cr.vital_signs, cr.physical_examination, 
          s.service_name, s.room,
          CONCAT_WS(' ', u.first_name, u.last_name)                                         AS consulted_by
          FROM consultation_records cr
          JOIN services s                                                                   ON s.service_id = cr.service_id
          LEFT JOIN users u                                                                 ON u.user_id = cr.doctor_id
          WHERE cr.consultation_record_id = ${record_id}
      `;

      if (!consDetails)
        return res
          .status(404)
          .json({ message: "Consultation record not found." });

      const prescription = await sql`
        SELECT 
          p.prescription_id, p.prescription_items, p.notes, p.valid_until, p.prescribed_at,
          CONCAT_WS(' ', u.first_name, u.last_name)                                         AS prescribed_by
        FROM prescription_records p
        JOIN users u                                                                        ON u.user_id = p.prescriber_id
        WHERE consultation_record_id = ${record_id}
        ORDER BY p.id
      `;

      return res.status(200).json({
        message: "Consultation record and prescription/s successfully fetched",
        record_type,
        ...consDetails,
        prescription,
      });
    }

    return res.status(400).json({ message: "Invalid record type." });
  } catch (error) {
    console.error("Error fetching full medical history:", error);
    return res.status(500).json({ message: "Failed to fetch full medical history" });
  }
}

import { sql } from "../../config/db.js";
import type { Request, Response } from "express";
import type {
  getMedicalHistory,
  getMedicalHistoryDetails,
  getMedicalHistoryFull,
  getConsultationRequests,
  getRoomSpecificServices,
  getConsultationQueueDetails,
  getAllServices,
} from "./dto/get.dto.js";
import { selectLabResultLines } from "./utils/selectLabResultLines.js";

export async function getRoomSpecificServices(
  req: Request,
  res: Response<
    getRoomSpecificServices.response | getRoomSpecificServices.error
  >,
) {
  const { room } = req.params;
  if (!room) {
    return res.status(400).json({
      message: "Room field is required.",
    } as getRoomSpecificServices.error);
  }
  try {
    const services = await sql`
    SELECT * FROM services
    WHERE room = ${room}
    ORDER BY service_id ASC
      `;

    return res.status(200).json({
      message: "Successfully fetched services.",
      services,
    } as getRoomSpecificServices.response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
    } as getRoomSpecificServices.error);
  }
}

export async function getConsultationQueues(
  req: Request,
  res: Response<
    getConsultationRequests.response | getConsultationRequests.error
  >,
) {
  try {
    const { room } = req.params;

    const queues = await sql`
      SELECT
        q.*,
        cr.consultation_record_id,
        cr.consultation_type,
        cr.service_id,
        cr.vital_signs, -- temperature/height/weight from the front desk
        s.service_name,
        s.service_type,
        s.service_category,
        s.room,
        p.patient_id,
        CONCAT_WS(' ', p.first_name, p.last_name)  AS patient_name,
        p.birthdate,
        p.contact_number,
        p.image_url,
        p.is_pwd,
        p.sex
      FROM queue_entries q
      JOIN consultation_records cr ON cr.queue_id = q.queue_id
      JOIN services s              ON s.service_id = cr.service_id
      JOIN patients p              ON p.patient_id = q.patient_id
      WHERE (q.queue_id LIKE 'CON-%' OR q.queue_id LIKE 'CONS-%')
        AND s.room = ${room}
        AND q.created_at >= CURRENT_DATE
        AND q.created_at <  CURRENT_DATE + INTERVAL '1 day'
      ORDER BY q.queue_number ASC
    `;
    return res.status(200).json({
      message: "Successfully fetched consultation queues.",
      queueEntries: queues,
    } as unknown as getConsultationRequests.response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
    } as getConsultationRequests.error);
  }
}

export async function getConsultationQueueDetails(
  req: Request,
  res: Response<
    getConsultationQueueDetails.response | getConsultationQueueDetails.error
  >,
) {
  // GET /api/doctor/consultation-queues/:queue_id/details
  try {
    const { queue_id } = req.params;

    if (!queue_id) {
      return res.status(400).json({
        message: "queue_id is required.",
      } as getConsultationQueueDetails.error);
    }

    const rows = await sql`
      SELECT
        -- queue
        q.queue_id,
        q.queue_number,
        q.is_priority,
        q.status                                     AS queue_status,
        q.created_at                                 AS queued_at,

        -- consultation record
        cr.consultation_record_id,
        cr.consultation_type,
        cr.status                                    AS consultation_status,
        cr.is_paid,
        cr.requested_at,

        -- service
        s.service_id,
        s.service_name,
        s.service_category,
        s.service_type,
        s.room,
        s.price,

        -- patient
        p.patient_id,
        p.image_url,
        CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name, p.suffix)
                                                     AS patient_name,
        p.sex,
        p.birthdate,
        DATE_PART('year', AGE(p.birthdate))::int     AS age,
        p.is_pwd,
        (DATE_PART('year', AGE(p.birthdate)) >= 60)  AS is_senior,
        p.contact_number,
        p.blood_type,
        p.civil_status,
        p.allergies,
        p.existing_conditions,
        p.current_medications,
        p.guardian_name,
        p.guardian_relationship,
        p.guardian_contact
      FROM queue_entries q
      JOIN consultation_records cr ON cr.queue_id = q.queue_id
      JOIN services s              ON s.service_id = cr.service_id
      JOIN patients p              ON p.patient_id = q.patient_id
      WHERE q.queue_id = ${queue_id}
    `;

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Queue entry not found.",
      } as getConsultationQueueDetails.error);
    }

    return res.status(200).json({
      message: "Successfully fetched queue details.",
      details: rows[0],
    } as unknown as getConsultationQueueDetails.response);
  } catch (error) {
    console.error("GET CONSULTATION QUEUE DETAILS ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch queue details",
    } as getConsultationQueueDetails.error);
  }
}

export async function getMedicalHistory(
  req: Request,
  res: Response<getMedicalHistory.response | getMedicalHistory.error>,
) {
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
    } = req.query as getMedicalHistory.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 50);
    const offset = (pageNum - 1) * limitNum;

    const rows = await sql`
      WITH history AS (
        SELECT
          'consultation'::text AS record_type,
          cr.consultation_record_id::text AS record_id,
          s.service_name::text AS service_name,
          s.room::text AS room,
          'Consultation'::text AS service_category,
          'Completed'::text AS status,
          cr.consulted_at AS occurred_at
        FROM consultation_records cr
        JOIN services s ON s.service_id = cr.service_id
        WHERE cr.patient_id = ${patient_id}

        UNION ALL

        SELECT
          'laboratory'::text,
          tri.item_id::text,
          s.service_name::text,
          s.room::text,
          'Laboratory'::text,
          tri.status::text,
          tr.requested_at
        FROM test_request_items tri
        JOIN test_requests tr ON tr.request_id = tri.request_id
        JOIN services s ON s.service_id = tri.service_id
        WHERE tr.patient_id = ${patient_id}
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
      records: rows.map((row) => ({
        record_type: row.record_type,
        record_id: row.record_id,
        service_name: row.service_name,
        room: row.room,
        service_category: row.service_category,
        status: row.status,
        occurred_at: String(row.occurred_at),
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum),
      },
    } as getMedicalHistory.response);
  } catch (error) {
    console.error("Error fetching medical history:", error);

    return res.status(500).json({
      message: "Failed to fetch medical history",
      detail: error instanceof Error ? error.message : String(error),
    } as getMedicalHistory.error);
  }
}

export async function getMedicalHistoryDetails(
  req: Request,
  res: Response<
    getMedicalHistoryDetails.response | getMedicalHistoryDetails.error
  >,
) {
  try {
    const { record_type, record_id } = req.params;

    if (record_type === "laboratory") {
      const [labDetails] = await sql`
        SELECT
          tri.item_id,
          tri.status,
          tri.updated_at,
          s.service_name,
          s.room,
          CONCAT_WS(' ', req_u.first_name, req_u.last_name) AS requested_by,
          req_u.role AS requested_by_role,
          CONCAT_WS(' ', proc_u.first_name, proc_u.last_name) AS processed_by,
          proc_u.role AS processed_by_role
        FROM test_request_items tri
        JOIN services s ON s.service_id = tri.service_id
        JOIN test_requests tr ON tr.request_id = tri.request_id
        LEFT JOIN users req_u ON req_u.user_id = tr.requested_by
        LEFT JOIN users proc_u ON proc_u.user_id = tri.processed_by
        WHERE tri.item_id = ${record_id}
      `;

      if (!labDetails) {
        return res.status(404).json({
          message: "Laboratory record not found.",
        } as getMedicalHistoryDetails.error);
      }

      const results = await selectLabResultLines(String(record_id));

      return res.status(200).json({
        message: "Laboratory record and result/s successfully fetched",
        record_type: "laboratory",
        item_id: String(labDetails.item_id),
        status: String(labDetails.status),
        updated_at: String(labDetails.updated_at),
        service_name: String(labDetails.service_name),
        room: labDetails.room,
        requested_by: labDetails.requested_by,
        requested_by_role: labDetails.requested_by_role,
        processed_by: labDetails.processed_by,
        processed_by_role: labDetails.processed_by_role,
        results,
      } as getMedicalHistoryDetails.laboratoryResponse);
    }

    if (record_type === "consultation") {
      const [consDetails] = await sql`
        SELECT
          cr.consultation_record_id,
          cr.consultation_type,
          cr.diagnosis,
          cr.notes,
          cr.consulted_at,
          s.service_name,
          s.room,
          CONCAT_WS(' ', u.first_name, u.last_name) AS consulted_by
        FROM consultation_records cr
        JOIN services s ON s.service_id = cr.service_id
        LEFT JOIN users u ON u.user_id = cr.consulted_by
        WHERE cr.consultation_record_id = ${record_id}
      `;

      if (!consDetails) {
        return res.status(404).json({
          message: "Consultation record not found.",
        } as getMedicalHistoryDetails.error);
      }

      const prescription = await sql`
        SELECT
          p.prescription_id,
          p.prescription_items,
          p.notes,
          p.valid_until,
          p.prescribed_at,
          CONCAT_WS(' ', u.first_name, u.last_name) AS prescribed_by
        FROM prescription_records p
        LEFT JOIN users u ON u.user_id = p.prescriber_id
        WHERE p.consultation_record_id = ${record_id}
        ORDER BY p.id
      `;

      return res.status(200).json({
        message: "Consultation record and prescription/s successfully fetched",
        record_type: "consultation",
        consultation_record_id: String(consDetails.consultation_record_id),
        consultation_type: String(consDetails.consultation_type),
        diagnosis: consDetails.diagnosis,
        notes: consDetails.notes,
        consulted_at: String(consDetails.consulted_at),
        service_name: String(consDetails.service_name),
        room: consDetails.room,
        consulted_by: consDetails.consulted_by,
        prescription: prescription.map((row) => ({
          prescription_id: String(row.prescription_id),
          prescription_items: row.prescription_items,
          notes: row.notes,
          valid_until: row.valid_until,
          prescribed_at: String(row.prescribed_at),
          prescribed_by: row.prescribed_by,
        })) as getMedicalHistoryDetails.prescription[],
      } as getMedicalHistoryDetails.consultationResponse);
    }

    return res.status(400).json({
      message: "Invalid record type.",
    });
  } catch (error) {
    console.error("Error fetching medical history details:", error);

    return res.status(500).json({
      message: "Failed to fetch medical history details",
    } as getMedicalHistoryDetails.error);
  }
}

export async function getMedicalHistoryFull(
  req: Request,
  res: Response<getMedicalHistoryFull.response | getMedicalHistoryFull.error>,
) {
  try {
    const { record_type, record_id } = req.params;

    if (record_type === "laboratory") {
      const [fullLab] = await sql`
        SELECT
          tri.item_id,
          tri.status,
          tri.updated_at,
          s.service_name,
          s.room,
          CONCAT_WS(' ', req_u.first_name, req_u.last_name) AS requested_by,
          req_u.role AS requested_by_role,
          CONCAT_WS(' ', proc_u.first_name, proc_u.last_name) AS processed_by,
          proc_u.role AS processed_by_role
        FROM test_request_items tri
        JOIN services s ON s.service_id = tri.service_id
        JOIN test_requests tr ON tr.request_id = tri.request_id
        LEFT JOIN users req_u ON req_u.user_id = tr.requested_by
        LEFT JOIN users proc_u ON proc_u.user_id = tri.processed_by
        WHERE tri.item_id = ${record_id}
      `;

      if (!fullLab) {
        return res.status(404).json({
          message: "Laboratory record not found.",
        } as getMedicalHistoryFull.error);
      }

      return res.status(200).json({
        message: "Full laboratory details successfully fetched",
        record_type: "laboratory",
        item_id: String(fullLab.item_id),
        status: String(fullLab.status),
        updated_at: String(fullLab.updated_at),
        results: await selectLabResultLines(String(record_id)),
        service_name: String(fullLab.service_name),
        room: fullLab.room,
        requested_by: fullLab.requested_by,
        requested_by_role: fullLab.requested_by_role,
        processed_by: fullLab.processed_by,
        processed_by_role: fullLab.processed_by_role,
      } as getMedicalHistoryFull.laboratoryResponse);
    }

    if (record_type === "consultation") {
      const [consDetails] = await sql`
        SELECT
          cr.consultation_record_id,
          cr.consultation_type,
          cr.diagnosis,
          cr.notes,
          cr.consulted_at,
          cr.presenting_complaint,
          cr.vital_signs,
          cr.physical_examination,
          s.service_name,
          s.room,
          CONCAT_WS(' ', u.first_name, u.last_name) AS consulted_by
        FROM consultation_records cr
        JOIN services s ON s.service_id = cr.service_id
        LEFT JOIN users u ON u.user_id = cr.consulted_by
        WHERE cr.consultation_record_id = ${record_id}
      `;

      if (!consDetails) {
        return res.status(404).json({
          message: "Consultation record not found.",
        } as getMedicalHistoryFull.error);
      }

      const prescription = await sql`
        SELECT
          p.prescription_id,
          p.prescription_items,
          p.notes,
          p.valid_until,
          p.prescribed_at,
          CONCAT_WS(' ', u.first_name, u.last_name) AS prescribed_by
        FROM prescription_records p
        LEFT JOIN users u ON u.user_id = p.prescriber_id
        WHERE p.consultation_record_id = ${record_id}
        ORDER BY p.id
      `;

      return res.status(200).json({
        message: "Full consultation details successfully fetched",
        record_type: "consultation",
        consultation_record_id: String(consDetails.consultation_record_id),
        consultation_type: String(consDetails.consultation_type),
        diagnosis: consDetails.diagnosis,
        notes: consDetails.notes,
        consulted_at: String(consDetails.consulted_at),
        presenting_complaint: consDetails.presenting_complaint,
        vital_signs: consDetails.vital_signs,
        physical_examination: consDetails.physical_examination,
        service_name: String(consDetails.service_name),
        room: consDetails.room,
        consulted_by: consDetails.consulted_by,
        prescription: prescription.map((row) => ({
          prescription_id: String(row.prescription_id),
          prescription_items: row.prescription_items,
          notes: row.notes,
          valid_until: row.valid_until,
          prescribed_at: String(row.prescribed_at),
          prescribed_by: row.prescribed_by,
        })) as getMedicalHistoryFull.prescription[],
      } as getMedicalHistoryFull.consultationResponse);
    }

    return res.status(400).json({
      message: "Invalid record type.",
    } as getMedicalHistoryFull.error);
  } catch (error) {
    console.error("Error fetching full medical history:", error);

    return res.status(500).json({
      message: "Failed to fetch full medical history",
    } as getMedicalHistoryFull.error);
  }
}

export async function getAllservices(
  req: Request,
  res: Response<getAllServices.response | getAllServices.error>,
) {
  try {
    const services = await sql`
      SELECT *
      FROM services
      WHERE LOWER(TRIM(service_type)) <> 'consultation'
            AND status = TRUE
      ORDER BY service_id ASC
    `;

    const packages = await sql`
      SELECT
        p.id,
        p.package_id                              AS service_id,
        p.package_name                            AS service_name,
        'package'::text                           AS service_type,
        'Package'::text                           AS service_category,
        p.package_price                           AS price,
        '-'::text                                 AS room,
        p.active,
        COALESCE(
          ARRAY_AGG(ps.service_id ORDER BY ps.service_id)
            FILTER (WHERE ps.service_id IS NOT NULL),
          '{}'::text[]
        )                                         AS service_ids,
        COALESCE(
          ARRAY_AGG(s.service_name ORDER BY s.service_name)
            FILTER (WHERE s.service_name IS NOT NULL),
          '{}'::text[]
        )                                         AS service_names,
        p.created_at,
        p.updated_at
      FROM packages p
      WHERE active = TRUE
      LEFT JOIN package_services ps ON ps.package_id = p.package_id
      LEFT JOIN services s          ON s.service_id = ps.service_id
      GROUP BY p.id
      ORDER BY p.package_id ASC
    `;
    return res.status(200).json({
      services,
      packages,
    } as getAllServices.response);
  } catch (error) {
    console.error("GET ALL SERVICES ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    } as getAllServices.error);
  }
}

export async function getPrescriptionPreviewDetails(
  req: Request,
  res: Response,
) {
  try {
    const { consultation_record_id } = req.params;

    if (!consultation_record_id) {
      return res.status(400).json({
        message: "Consultation record ID is required.",
      });
    }

    const prescription = await sql`
      SELECT
        pr.prescription_id,
        pr.consultation_record_id,
        pr.prescribed_at,
        pr.valid_until,
        pr.status,
        pr.prescription_items,
        pr.notes,

        p.patient_id,
        CONCAT_WS(
          ' ',
          p.first_name,
          p.middle_name,
          p.last_name,
          p.suffix
        ) AS patient_name,
        p.birthdate,
        p.sex,

        DATE_PART('year', AGE(CURRENT_DATE, p.birthdate))::INT AS age,

        u.user_id AS prescriber_id,
        CONCAT_WS(
          ' ',
          u.first_name,
          u.middle_name,
          u.last_name,
          u.suffix
        ) AS prescriber_name,
        u.prc_license_number,
        u.medical_specialty

      FROM prescription_records pr

      INNER JOIN patients p
        ON p.patient_id = pr.patient_id

      INNER JOIN users u
        ON u.user_id = pr.prescriber_id

      INNER JOIN consultation_records cr
        ON cr.consultation_record_id = pr.consultation_record_id

      WHERE pr.consultation_record_id = ${consultation_record_id}

      ORDER BY pr.prescribed_at DESC
      LIMIT 1
    `;

    if (prescription.length === 0) {
      return res.status(404).json({
        message: "Prescription record not found.",
      });
    }

    return res.status(200).json({
      prescription: prescription[0],
    });
  } catch (error) {
    console.error("GET PRESCRIPTION PREVIEW ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

import { sql } from "../../config/db.js";
import type { Request, Response } from "express";
import type {
  getMedicalHistory,
  getMedicalHistoryDetails,
  getMedicalHistoryFull,
  getConsultationRequests,
  getRoomSpecificServices,
  getConsultationQueueDetails,
} from "./dto/get.dto.js";

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
        s.service_name,
        s.service_type,
        s.service_category,
        s.room,
        CONCAT_WS(' ', p.first_name, p.last_name)  AS patient_name,
        DATE_PART('year', AGE(p.birthdate))::int   AS age
      FROM queue_entries q
      JOIN consultation_records cr ON cr.queue_id = q.queue_id
      JOIN services s              ON s.service_id = cr.service_id
      JOIN patients p              ON p.patient_id = q.patient_id
      WHERE q.queue_id LIKE 'CONS-%'
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
          lri.lab_item_id::text,
          s.service_name::text,
          s.room::text,
          'Laboratory'::text,
          lri.status::text,
          lr.requested_at
        FROM laboratory_request_items lri
        JOIN laboratory_requests lr ON lr.request_id = lri.request_id
        JOIN services s ON s.service_id = lri.service_id
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

// laboratory_results stores one row per lab item with a JSON list of tests.
// The doctor's history screen shows one line per test.
async function selectLabResultLines(lab_item_id: string) {
  const rows = await sql`
    SELECT result_id, results, remarks, verified_by, verified_at, image_url, created_at
    FROM laboratory_results
    WHERE lab_item_id = ${lab_item_id}
    ORDER BY created_at
  `;

  return rows.flatMap((row) => {
    const tests: Record<string, any>[] = Array.isArray(row.results)
      ? row.results
      : [];
    const components: Record<string, any>[] =
      tests[0]?.template_snapshot?.components ?? [];

    return tests.map((test, index) => {
      const settings =
        components.find((c) => c.fieldKey === test.field_key)?.settings ?? {};
      const isLast = index === tests.length - 1;
      return {
        result_id: `${row.result_id}-${index}`,
        result_value: `${test.name}: ${test.result}`,
        unit: settings.unit || null,
        reference_range: settings.referenceRange || null,
        flag: null,
        // Remarks and verification belong to the whole result, so show them once.
        remarks: isLast ? row.remarks : null,
        verified_by: isLast ? row.verified_by : null,
        verified_at: isLast && row.verified_at ? String(row.verified_at) : null,
        image_url: row.image_url,
        created_at: String(row.created_at),
      };
    });
  });
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
          lri.lab_item_id,
          lri.status,
          lri.updated_at,
          s.service_name,
          s.room,
          CONCAT_WS(' ', req_u.first_name, req_u.last_name) AS requested_by,
          req_u.role AS requested_by_role,
          CONCAT_WS(' ', proc_u.first_name, proc_u.last_name) AS processed_by,
          proc_u.role AS processed_by_role
        FROM laboratory_request_items lri
        JOIN services s ON s.service_id = lri.service_id
        JOIN laboratory_requests lr ON lr.request_id = lri.request_id
        LEFT JOIN users req_u ON req_u.user_id = lr.requested_by
        LEFT JOIN users proc_u ON proc_u.user_id = lri.processed_by
        WHERE lri.lab_item_id = ${record_id}
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
        lab_item_id: String(labDetails.lab_item_id),
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
          lri.lab_item_id,
          lri.status,
          lri.updated_at,
          s.service_name,
          s.room,
          CONCAT_WS(' ', req_u.first_name, req_u.last_name) AS requested_by,
          req_u.role AS requested_by_role,
          CONCAT_WS(' ', proc_u.first_name, proc_u.last_name) AS processed_by,
          proc_u.role AS processed_by_role
        FROM laboratory_request_items lri
        JOIN services s ON s.service_id = lri.service_id
        JOIN laboratory_requests lr ON lr.request_id = lri.request_id
        LEFT JOIN users req_u ON req_u.user_id = lr.requested_by
        LEFT JOIN users proc_u ON proc_u.user_id = lri.processed_by
        WHERE lri.lab_item_id = ${record_id}
      `;

      if (!fullLab) {
        return res.status(404).json({
          message: "Laboratory record not found.",
        } as getMedicalHistoryFull.error);
      }

      return res.status(200).json({
        message: "Full laboratory details successfully fetched",
        record_type: "laboratory",
        lab_item_id: String(fullLab.lab_item_id),
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

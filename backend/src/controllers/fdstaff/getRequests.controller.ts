import { sql } from "../../config/db.js";
import type { Request, Response } from "express";
import type {
  getAllPatients,
  getPrintablePatientRecord,
  getAllQueueEntries,
  getAllServices,
  getLaboratoryRequest,
  getQueueRequests,
  getMedicalHistory,
  getMedicalHistoryDetails,
  getMedicalHistoryFull,
  getBills,
  getBillDetails,
} from "./dto/get.dto.js";

export async function getAllPatients(
  req: Request,
  res: Response<getAllPatients.response | getAllPatients.error>,
) {
  // get /api/fdstaff/patients
  try {
    const patients = await sql`SELECT * FROM patients`;
    if (!patients) {
      return res.json({
        message: "there are no patients",
        patients: [],
      } as getAllPatients.response);
    }
    // Never send password or "set your password" link hashes to the browser.
    const safePatients = patients.map(
      ({ password_hash, password_token_hash, ...patient }) => patient,
    );
    return res.status(200).json({
      patients: safePatients as unknown as getAllPatients.patient[],
    } as getAllPatients.response);
  } catch (error) {
    console.error("Error fetching patients:", error);
    return res
      .status(500)
      .json({ error: "error on fetching patients" } as getAllPatients.error);
  }
}

export async function getPrintablePatientRecord(
  req: Request,
  res: Response<
    getPrintablePatientRecord.response | getPrintablePatientRecord.error
  >,
) {
  try {
    const { patient_id } = req.params;

    if (!patient_id) {
      return res.status(400).json({
        message: "Patient ID is required.",
      } as getPrintablePatientRecord.error);
    }

    const patientRows = await sql`
      SELECT *
      FROM patients
      WHERE patient_id = ${patient_id}
      LIMIT 1
    `;

    if (!patientRows.length) {
      return res.status(404).json({
        message: "Patient not found.",
      } as getPrintablePatientRecord.error);
    }

    const patient = patientRows[0];

    const queueEntries = await sql`
      SELECT *
      FROM queue_entries
      WHERE patient_id = ${patient_id}
      ORDER BY created_at DESC
    `;

    const labRequests = await sql`
      SELECT *
      FROM lab_requests
      WHERE patient_id = ${patient_id}
      ORDER BY requested_at DESC
    `;

    const billing = await sql`
      SELECT *
      FROM bills
      WHERE patient_id = ${patient_id}
      ORDER BY billed_at DESC
    `;

    const printableRecord = buildPrintablePatientRecord(
      patient,
      queueEntries,
      labRequests,
      billing,
    );

    return res.status(200).json({
      patientRecord: printableRecord,
    } as getPrintablePatientRecord.response);
  } catch (error) {
    console.error("Error fetching printable patient record:", error);
    return res.status(500).json({
      error: "Error fetching printable patient record.",
    } as getPrintablePatientRecord.error);
  }
}

export async function getAllQueueEntries(
  req: Request,
  res: Response<getAllQueueEntries.response | getAllQueueEntries.error>,
) {
  try {
    const queueEntries = await sql`
        SELECT
          qe.id,
          qe.queue_id,
          qe.patient_id,
          CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name) AS patient_name,
          to_char(p.birthdate, 'YYYY-MM-DD')                       AS birthdate,
          qe.queue_number,
          COALESCE(cs.service_type, lab.service_type)              AS service_type,
          COALESCE(cs.service_category, lab.service_category) AS service_category,
          COALESCE(cs.room::text,   lab.room)                      AS room,
          qe.is_priority,
          qe.status,
          qe.created_at,
          qe.updated_at
        FROM queue_entries qe
        JOIN patients p ON p.patient_id = qe.patient_id
        LEFT JOIN consultation_records cr ON cr.queue_id = qe.queue_id
        LEFT JOIN services cs             ON cs.service_id = cr.service_id
        LEFT JOIN LATERAL (
          SELECT ls.service_type, ls.service_category, ls.room::text AS room
          FROM test_request_items tri
          JOIN services ls ON ls.service_id = tri.service_id
          WHERE tri.queue_id = qe.queue_id
          ORDER BY tri.item_id
          LIMIT 1
        ) lab ON TRUE
        WHERE qe.created_at >= CURRENT_DATE
          AND qe.created_at <  CURRENT_DATE + INTERVAL '1 day'
        ORDER BY qe.queue_number ASC, qe.id ASC
      `;

    return res.status(200).json({
      queueEntries: queueEntries as unknown as getAllQueueEntries.queueEntry[],
    } as getAllQueueEntries.response);
  } catch (error) {
    console.error("Error fetching queue entries:", error);
    return res.status(500).json({
      message: "Failed to fetch queue entries",
    } as getAllQueueEntries.error);
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
      ORDER BY service_id ASC
    `;

    const packages = await sql`w
      SELECT
        p.id,
        p.package_id                              AS service_id,
        p.package_name                            AS service_name,
        'package'::text                           AS service_type,
        'Package'::text                           AS service_category,
        p.package_price                           AS price,
        '-'::text                                 AS room,
        (LOWER(TRIM(p.status)) = 'active')        AS active,
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

export async function getQueueRequests(
  req: Request,
  res: Response<getQueueRequests.response | getQueueRequests.error>,
) {
  try {
    const rows = await sql`
      SELECT * FROM (
        SELECT
          'laboratory'::text                          AS record_type,
          tri.item_id                                 AS record_id,
          tr.patient_id,
          CONCAT_WS(' ', p.first_name, p.last_name)   AS patient_name,
          s.service_id,
          s.service_name,
          CONCAT_WS(' ', u.first_name, u.last_name)   AS created_by,
          tr.requested_at                             AS created_at,
          tr.request_id,
          tr.status                                   AS request_status,
          s.room
        FROM test_request_items tri
        JOIN test_requests tr ON tr.request_id = tri.request_id
        JOIN patients p       ON p.patient_id = tr.patient_id
        JOIN services s       ON s.service_id = tri.service_id
        LEFT JOIN users u     ON u.user_id = tr.requested_by
        WHERE tr.status = 'Paid'
          AND tri.status = 'Requested'
          AND tri.queue_id IS NULL
          AND tr.requested_at >= CURRENT_DATE
          AND tr.requested_at <  CURRENT_DATE + INTERVAL '1 day'

        UNION ALL

        SELECT
          'consultation'::text,
          cr.consultation_record_id,
          cr.patient_id,
          CONCAT_WS(' ', p.first_name, p.last_name),
          s.service_id,
          s.service_name,
          CONCAT_WS(' ', u.first_name, u.last_name),
          cr.consulted_at,
          NULL::text,
          cr.status,
          s.room
        FROM consultation_records cr
        JOIN patients p   ON p.patient_id = cr.patient_id
        JOIN services s   ON s.service_id = cr.service_id
        LEFT JOIN users u ON u.user_id = cr.consulted_by
        WHERE cr.status = 'Created'
          AND cr.queue_id IS NULL
          AND cr.consulted_at >= CURRENT_DATE
          AND cr.consulted_at <  CURRENT_DATE + INTERVAL '1 day'
      ) requests
      ORDER BY created_at DESC
    `;

    return res.status(200).json({
      requests: rows as unknown as getQueueRequests.queueRequest[],
    } as getQueueRequests.response);
  } catch (error) {
    console.error("Error fetching queue requests:", error);
    return res.status(500).json({
      message: "Failed to fetch queue requests",
    } as getQueueRequests.error);
  }
}

export async function getBills(
  req: Request,
  res: Response<getBills.response | getBills.error>,
) {
  // GET /api/fdstaff/billings
  try {
    const rows = await selectBills(null, 3);
    const bills = rows.map(
      ({ items, ...bill }) => bill,
    ) as unknown as getBills.bill[];
    return res.status(200).json({ bills });
  } catch (error) {
    console.error("Unable to load bills:", error);
    return res.status(500).json({ message: "Bills could not be loaded." });
  }
}

export async function getBillDetails(
  req: Request,
  res: Response<getBillDetails.response | getBillDetails.error>,
) {
  // GET /api/fdstaff/billings/:bill_id/details
  const bill_id = String(req.params.bill_id);

  try {
    const [rows, linkedItems] = await Promise.all([
      selectBills(bill_id),
      sql`
        SELECT * FROM (
          SELECT
            'consultation'::text AS line_type,
            cr.consultation_record_id AS item_id,
            NULL::text AS request_id,
            cr.service_id,
            s.service_name,
            s.service_category,
            s.price,
            1 AS quantity,
            cr.status,
            cr.requested_at AS created_at,
            NULL::text AS package_id,
            NULL::jsonb AS components
          FROM consultation_records cr
          JOIN services s ON s.service_id = cr.service_id
          WHERE cr.bill_id = ${bill_id}
            AND LOWER(TRIM(cr.status)) NOT IN (
              'cancelled',
              'canceled',
              'rejected'
            )

          UNION ALL

          SELECT
            'laboratory'::text,
            tri.item_id,
            tri.request_id,
            tri.service_id,
            s.service_name,
            s.service_category,
            CASE
              WHEN tri.package_id IS NULL THEN s.price
              ELSE 0
            END,
            1,
            tri.status,
            tri.created_at,
            tri.package_id,
            NULL::jsonb
          FROM test_request_items tri
          JOIN services s ON s.service_id = tri.service_id
          JOIN test_requests tr ON tr.request_id = tri.request_id
          WHERE tri.bill_id = ${bill_id}
            AND LOWER(TRIM(tri.status)) NOT IN (
              'cancelled',
              'canceled',
              'rejected'
            )
            AND LOWER(TRIM(tr.status)) NOT IN (
              'cancelled',
              'canceled',
              'rejected'
            )

          UNION ALL

          SELECT
            'package'::text,
            MIN(tri.item_id)::text,
            NULL::text,
            NULL::text,
            pkg.package_name,
            'Package',
            pkg.package_price,
            COUNT(DISTINCT tri.request_id)::int,
            NULL::text,
            MIN(tri.created_at),
            tri.package_id,
            COALESCE(
              jsonb_agg(
                jsonb_build_object(
                  'item_id', tri.item_id,
                  'service_id', s.service_id,
                  'service_name', s.service_name,
                  'service_category', s.service_category,
                  'service_type', LOWER(TRIM(s.service_type))
                )
                ORDER BY tri.created_at, tri.item_id
              ) FILTER (WHERE s.service_id IS NOT NULL),
              '[]'::jsonb
            )
          FROM test_request_items tri
          JOIN packages pkg ON pkg.package_id = tri.package_id
          JOIN test_requests tr ON tr.request_id = tri.request_id
          LEFT JOIN services s ON s.service_id = tri.service_id
          WHERE tri.bill_id = ${bill_id}
            AND tri.package_id IS NOT NULL
            AND LOWER(TRIM(tri.status)) NOT IN (
              'cancelled',
              'canceled',
              'rejected'
            )
            AND LOWER(TRIM(tr.status)) NOT IN (
              'cancelled',
              'canceled',
              'rejected'
            )
          GROUP BY
            tri.package_id,
            pkg.package_name,
            pkg.package_price
        ) lines
        ORDER BY
          created_at,
          item_id
      `,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Bill not found.",
      });
    }

    const { items: savedItems, ...bill } = rows[0];
    const saved = Array.isArray(savedItems) ? savedItems : [];

    // Paid bills retain the exact prices charged at payment time.
    // Legacy bills with no linked rows fall back to their saved item list.
    const items =
      bill.status === "Paid" || linkedItems.length === 0 ? saved : linkedItems;

    return res.status(200).json({
      bill: bill as unknown as getBills.bill,
      items: items as getBillDetails.BillItem[],
    });
  } catch (error) {
    console.error("Unable to load bill details:", error);

    return res.status(500).json({
      message: "Bill details could not be loaded.",
    });
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

    if (!patient_id) {
      return res.status(400).json({
        message: "Patient ID is required.",
      } as getMedicalHistory.error);
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
        tri.item_id::text,
        s.service_name::text,
        s.room::text,
        'Laboratory'::text,
        tri.status::text,
        tr.requested_at
      FROM test_request_items tri
      JOIN test_requests tr ON tr.request_id = tri.request_id
      JOIN services s             ON s.service_id = tri.service_id
      WHERE tr.patient_id = ${patient_id}
    )
      SELECT *, COUNT(*) OVER() AS total_count
      FROM history
      WHERE TRUE
        ${search ? sql`AND service_name ILIKE ${"%" + search + "%"}` : sql``}
        ${service_category ? sql`AND LOWER(service_category) = LOWER(${service_category})` : sql``}
        ${status ? sql`AND LOWER(REPLACE(status, ' ', '-')) = LOWER(${status})` : sql``}
        ${start_date ? sql`AND occurred_at >= ${start_date}::date` : sql``}
        ${end_date ? sql`AND occurred_at < (${end_date}::date + INTERVAL '1 day')` : sql``}
      ORDER BY occurred_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const total = rows.length ? Number(rows[0].total_count) : 0;

    return res.status(200).json({
      message: "Medical history successfully fetched.",
      records: rows.map(
        ({ total_count, ...r }) => r as getMedicalHistory.record,
      ),
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
  const { record_type, record_id } = req.params;
  try {
    if (record_type === "laboratory") {
      const [labDetails] = await sql`
        SELECT
          tri.item_id, tri.status, tri.updated_at,
          s.service_name, s.room,
          CONCAT_WS(' ', req_u.first_name, req_u.last_name)   AS requested_by,
          req_u.role                                          AS requested_by_role,
          CONCAT_WS(' ', proc_u.first_name, proc_u.last_name) AS processed_by,
          proc_u.role                                         AS processed_by_role
        FROM test_request_items tri
        JOIN services s                                       ON s.service_id = tri.service_id
        JOIN test_requests tr                          ON tr.request_id = tri.request_id
        LEFT JOIN users req_u                                 ON req_u.user_id = tr.requested_by
        LEFT JOIN users proc_u                                ON proc_u.user_id = tri.processed_by
        WHERE tri.item_id = ${record_id}
      `;

      if (!labDetails)
        return res.status(404).json({
          message: "Laboratory record not found.",
        } as getMedicalHistoryDetails.error);

      const results = await sql`
        SELECT result_id, results, remarks,
              verified_by, verified_at, image_url, created_at
        FROM test_results
        WHERE item_id = ${record_id}
        ORDER BY created_at
      `;

      return res.status(200).json({
        message: "Laboratory record and result/s successfully fetched",
        record_type,
        ...labDetails,
        results,
      } as getMedicalHistoryDetails.laboratoryResponse);
    }

    if (record_type === "consultation") {
      const [consDetails] = await sql`
        SELECT 
          cr.consultation_record_id,  cr.consultation_type, cr.diagnosis, cr.notes,
          cr.consulted_at,
          s.service_name, s.room,
          CONCAT_WS(' ', u.first_name, u.last_name)                                 AS consulted_by
          FROM consultation_records cr
          JOIN services s                                                           ON s.service_id = cr.service_id
          LEFT JOIN users u                                                         ON u.user_id = cr.consulted_by
          WHERE cr.consultation_record_id = ${record_id}
      `;

      if (!consDetails)
        return res.status(404).json({
          message: "Consultation record not found.",
        } as getMedicalHistoryDetails.error);

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
      } as getMedicalHistoryDetails.consultationResponse);
    }

    return res.status(400).json({
      message: "Invalid record type.",
    } as getMedicalHistoryDetails.error);
  } catch (error) {
    if (record_type === "consultation") {
      console.error("Error fetching prescriptions:", error);
      return res.status(500).json({
        message: "Failed to fetch prescriptions",
      } as getMedicalHistoryDetails.error);
    } else {
      console.error("Error fetching laboratory results:", error);
      return res.status(500).json({
        message: "Failed to fetch laboratory results",
      } as getMedicalHistoryDetails.error);
    }
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
          tri.item_id, tri.status, tri.updated_at,
          tr.result_value, tr.remarks, tr.verified_by, tr.verified_at,
          s.service_name, s.room,
          CONCAT_WS(' ', req_u.first_name, req_u.last_name)   AS requested_by,
          req_u.role                                          AS requested_by_role,
          CONCAT_WS(' ', proc_u.first_name, proc_u.last_name) AS processed_by,  
          proc_u.role                                         AS processed_by_role
          FROM test_request_items tri
          JOIN services s                                     ON s.service_id = tri.service_id
          JOIN test_requests tr                        ON tr.request_id = tri.request_id
          LEFT JOIN users req_u                               ON req_u.user_id = tr.requested_by
          LEFT JOIN users proc_u                              ON proc_u.user_id = tri.processed_by
          WHERE tri.item_id = ${record_id}

      `;

      if (!fullLab)
        return res.status(404).json({
          message: "Laboratory record not found",
        } as getMedicalHistoryFull.error);

      return res.status(200).json({
        message: "Full laboratory details successfully fetched",
        record_type,
        ...fullLab,
      } as getMedicalHistoryFull.laboratoryResponse);
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
          LEFT JOIN users u                                                                 ON u.user_id = cr.consulted_by
          WHERE cr.consultation_record_id = ${record_id}
      `;

      if (!consDetails)
        return res.status(404).json({
          message: "Consultation record not found.",
        } as getMedicalHistoryFull.error);

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
      } as getMedicalHistoryFull.consultationResponse);
    }

    return res
      .status(400)
      .json({ message: "Invalid record type." } as getMedicalHistoryFull.error);
  } catch (error) {
    console.error("Error fetching full medical history:", error);
    return res.status(500).json({
      message: "Failed to fetch full medical history",
    } as getMedicalHistoryFull.error);
  }
}
////////////////  --------- GET medical history controller ---------  //////////////////
import type { getPatientMedicalHistory as MedicalHistoryDTO } from "./dto/get.dto.js";
import { buildFullName } from "./utils/buildFullName.js";
import { resolveLabItemsTable } from "./utils/resolveLabItemsTable.js";
import { selectBills } from "./utils/selectBills.js";
import { buildPrintablePatientRecord } from "./utils/buildPrintablePatientRecord.js";

// DATABASE ROW TYPES
// =======================================================================

type MedicalHistoryConsultationRow = {
  consultation_record_id: string;
  queue_id: string | null;
  findings: unknown;
  status: string;
  consulted_at: string;
  updated_at: string;
  doctor_user_id: string | null;
  doctor_first_name: string | null;
  doctor_middle_name: string | null;
  doctor_last_name: string | null;
  doctor_suffix: string | null;
  doctor_department: string | null;
  doctor_role: string | null;
  queue_number: number | null;
  is_priority: boolean | null;
  queue_status: string | null;
  service_id: string | null;
  service_name: string | null;
  service_type: string | null;
  room: string | null;
};

type MedicalHistoryLabRequestRow = {
  request_id: string;
  consultation_record_id: string | null;
  doctor_id: string | null;
  status: string;
  is_paid: boolean;
  requested_at: string;
  updated_at: string;
  doctor_first_name: string | null;
  doctor_middle_name: string | null;
  doctor_last_name: string | null;
  doctor_suffix: string | null;
  doctor_department: string | null;
  doctor_role: string | null;
};

type MedicalHistoryLabItemRow = {
  item_id: string;
  request_id: string;
  service_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  queue_id?: string | null;
  service_name: string;
  service_type: string;
  room: string;
};

type MedicalHistoryLabResultRow = {
  result_id: string;
  item_id: string;
  result_value: string;
  unit: string | null;
  reference_range: string | null;
  flag: string | null;
  remarks: string | null;
  verified_by: string | null;
  image_url: string | null;
  verified_at: string | null;
  created_at: string;
};

// HELPERS
// =======================================================================

// GET PATIENT MEDICAL HISTORY
// =======================================================================

export async function getPatientMedicalHistory(
  req: Request<{ patient_id: string }>,
  res: Response<MedicalHistoryDTO.response | MedicalHistoryDTO.error>,
) {
  try {
    const { patient_id } = req.params;

    if (!patient_id) {
      return res.status(400).json({
        message: "Patient ID is required.",
      });
    }

    // PATIENT
    // ===================================================================

    const patientRows = (await sql`
      SELECT *
      FROM patients
      WHERE patient_id = ${patient_id}
      LIMIT 1
    `) as Record<string, unknown>[];

    const patient = patientRows[0];

    if (!patient) {
      return res.status(404).json({
        message: "Patient not found.",
      });
    }

    // CONSULTATION HISTORY
    // ===================================================================

    const consultations = (await sql`
      SELECT
        cr.consultation_record_id,
        cr.queue_id,
        cr.findings,
        cr.status,
        cr.consulted_at,
        cr.updated_at,

        u.user_id AS doctor_user_id,
        u.first_name AS doctor_first_name,
        u.middle_name AS doctor_middle_name,
        u.last_name AS doctor_last_name,
        u.suffix AS doctor_suffix,
        u.department AS doctor_department,
        u.role AS doctor_role,

        q.queue_number,
        q.is_priority,
        q.status AS queue_status,

        s.service_id,
        s.service_name,
        s.service_type,
        s.room

      FROM consultation_records cr
      LEFT JOIN users u ON u.user_id = cr.doctor_id
      LEFT JOIN queue_entries q ON q.queue_id = cr.queue_id
      LEFT JOIN services s ON s.service_id = q.service_id

      WHERE cr.patient_id = ${patient_id}

      ORDER BY cr.consulted_at DESC, cr.updated_at DESC
    `) as MedicalHistoryConsultationRow[];

    // LABORATORY REQUESTS
    // ===================================================================

    const labRequests = (await sql`
      SELECT
        tr.request_id,
        tr.consultation_record_id,
        tr.doctor_id,
        tr.status,
        tr.is_paid,
        tr.requested_at,
        tr.updated_at,

        u.first_name AS doctor_first_name,
        u.middle_name AS doctor_middle_name,
        u.last_name AS doctor_last_name,
        u.suffix AS doctor_suffix,
        u.department AS doctor_department,
        u.role AS doctor_role

      FROM lab_requests lr
      LEFT JOIN users u ON u.user_id = tr.doctor_id

      WHERE tr.patient_id = ${patient_id}

      ORDER BY tr.requested_at DESC, tr.updated_at DESC
    `) as MedicalHistoryLabRequestRow[];

    // LABORATORY ITEMS AND RESULTS
    // ===================================================================

    const labItemsTable = await resolveLabItemsTable();

    let labItems: MedicalHistoryLabItemRow[] = [];
    let labResults: MedicalHistoryLabResultRow[] = [];

    if (labItemsTable === "test_request_items") {
      labItems = (await sql`
        SELECT
          li.item_id,
          li.request_id,
          li.service_id,
          li.queue_id,
          li.status,
          li.created_at,
          li.updated_at,

          s.service_name,
          s.service_type,
          s.room

        FROM test_request_items li
        LEFT JOIN services s ON s.service_id = li.service_id
        JOIN lab_requests tr ON tr.request_id = li.request_id

        WHERE tr.patient_id = ${patient_id}

        ORDER BY li.created_at DESC, li.updated_at DESC
      `) as MedicalHistoryLabItemRow[];

      labResults = (await sql`
        SELECT
          r.result_id,
          r.item_id,
          r.result_value,
          r.unit,
          r.reference_range,
          r.flag,
          r.remarks,
          r.verified_by,
          r.image_url,
          r.verified_at,
          r.created_at

        FROM test_results r
        JOIN test_request_items li
          ON li.item_id = r.item_id
        JOIN lab_requests lr
          ON tr.request_id = li.request_id

        WHERE tr.patient_id = ${patient_id}

        ORDER BY r.created_at DESC
      `) as MedicalHistoryLabResultRow[];
    } else if (labItemsTable === "request_items") {
      labItems = (await sql`
        SELECT
          li.item_id,
          li.request_id,
          li.service_id,
          li.status,
          li.created_at,
          li.updated_at,

          s.service_name,
          s.service_type,
          s.room

        FROM request_items li
        LEFT JOIN services s ON s.service_id = li.service_id
        JOIN lab_requests tr ON tr.request_id = li.request_id

        WHERE tr.patient_id = ${patient_id}

        ORDER BY li.created_at DESC, li.updated_at DESC
      `) as MedicalHistoryLabItemRow[];

      labResults = (await sql`
        SELECT
          r.result_id,
          r.item_id,
          r.result_value,
          r.unit,
          r.reference_range,
          r.flag,
          r.remarks,
          r.verified_by,
          r.image_url,
          r.verified_at,
          r.created_at

        FROM test_results r
        JOIN request_items li
          ON li.item_id = r.item_id
        JOIN lab_requests lr
          ON tr.request_id = li.request_id

        WHERE tr.patient_id = ${patient_id}

        ORDER BY r.created_at DESC
      `) as MedicalHistoryLabResultRow[];
    }

    // GROUP LAB RESULTS BY LAB ITEM
    // ===================================================================

    const resultsByLabItemId = new Map<string, MedicalHistoryLabResultRow[]>();

    for (const result of labResults) {
      const existing = resultsByLabItemId.get(result.item_id) ?? [];

      existing.push(result);

      resultsByLabItemId.set(result.item_id, existing);
    }

    // GROUP LAB ITEMS BY REQUEST
    // ===================================================================

    const itemsByRequestId = new Map<string, MedicalHistoryLabItemRow[]>();

    for (const item of labItems) {
      const existing = itemsByRequestId.get(item.request_id) ?? [];

      existing.push(item);

      itemsByRequestId.set(item.request_id, existing);
    }

    // BUILD CONSULTATION RESPONSE
    // ===================================================================

    const consultationHistory: MedicalHistoryDTO.response["consultations"] =
      consultations.map((consultation) => ({
        consultation_record_id: consultation.consultation_record_id,
        queue_id: consultation.queue_id,
        findings: consultation.findings,
        status: consultation.status,
        consulted_at: consultation.consulted_at,
        updated_at: consultation.updated_at,

        doctor: {
          user_id: consultation.doctor_user_id,
          full_name: buildFullName([
            consultation.doctor_first_name,
            consultation.doctor_middle_name,
            consultation.doctor_last_name,
            consultation.doctor_suffix,
          ]),
          department: consultation.doctor_department,
          role: consultation.doctor_role,
        },

        visit: {
          queue_id: consultation.queue_id,
          queue_number: consultation.queue_number,
          is_priority: consultation.is_priority,
          status: consultation.queue_status,

          service: {
            service_id: consultation.service_id,
            service_name: consultation.service_name,
            service_type: consultation.service_type,
            room: consultation.room,
          },
        },
      }));

    // BUILD LABORATORY RESPONSE
    // ===================================================================

    const labRequestHistory: MedicalHistoryDTO.response["labRequests"] =
      labRequests.map((request) => {
        const items = (itemsByRequestId.get(request.request_id) ?? []).map(
          (item) => ({
            item_id: item.item_id,
            request_id: item.request_id,
            service_id: item.service_id,
            queue_id: item.queue_id,
            status: item.status,
            created_at: item.created_at,
            updated_at: item.updated_at,
            service_name: item.service_name,
            service_type: item.service_type,
            room: item.room,

            results: resultsByLabItemId.get(item.item_id) ?? [],
          }),
        );

        return {
          request_id: request.request_id,
          consultation_record_id: request.consultation_record_id,
          doctor_id: request.doctor_id,
          status: request.status,
          is_paid: request.is_paid,
          requested_at: request.requested_at,
          updated_at: request.updated_at,

          doctor: {
            user_id: request.doctor_id,
            full_name: buildFullName([
              request.doctor_first_name,
              request.doctor_middle_name,
              request.doctor_last_name,
              request.doctor_suffix,
            ]),
            department: request.doctor_department,
            role: request.doctor_role,
          },

          items,
        };
      });

    // FINAL RESPONSE
    // ===================================================================

    const response: MedicalHistoryDTO.response = {
      patient,
      consultations: consultationHistory,
      labRequests: labRequestHistory,

      summary: {
        consultations: consultationHistory.length,
        labRequests: labRequestHistory.length,
        labItems: labItems.length,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("getPatientMedicalHistory error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

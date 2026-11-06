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

function calculateAge(dateOfBirth: string | Date): number | "Invalid Age" {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const hasHadBirthday =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() >= birthDate.getDate());

  if (!hasHadBirthday) {
    age--;
  }

  if (age < 0) {
    return "Invalid Age";
  }

  return age;
}

export function buildPrintablePatientRecord(
  patient: Record<string, any>,
  queueEntries: Record<string, any>[] = [],
  labRequests: Record<string, any>[] = [],
  billing: Record<string, any>[] = [],
) {
  const fullName = [
    patient.first_name,
    patient.middle_name,
    patient.last_name,
    patient.suffix,
  ]
    .filter(Boolean)
    .join(" ");

  const summary = {
    age: calculateAge(patient.birthdate ?? patient.date_of_birth),
    sex: patient.sex ?? "N/A",
    blood_type: patient.blood_type ?? "N/A",
    civil_status: patient.civil_status ?? "N/A",
    total_visits: Array.isArray(queueEntries) ? queueEntries.length : 0,
    total_lab_requests: Array.isArray(labRequests) ? labRequests.length : 0,
    total_billing: billing
      .reduce((sum, item) => sum + Number(item.total_amount ?? 0), 0)
      .toFixed(2),
    pending_balance: billing
      .filter((item) => String(item.status ?? "").toLowerCase() !== "paid")
      .reduce((sum, item) => sum + Number(item.total_amount ?? 0), 0)
      .toFixed(2),
  };

  return {
    patient: {
      patient_id: patient.patient_id,
      full_name: fullName,
      first_name: patient.first_name,
      middle_name: patient.middle_name,
      last_name: patient.last_name,
      suffix: patient.suffix,
      sex: patient.sex,
      email: patient.email,
      address: patient.address,
      contact_number: patient.contact_number,
      birthdate: patient.birthdate ?? patient.date_of_birth,
      blood_type: patient.blood_type,
      civil_status: patient.civil_status,
      image_url: patient.image_url,
      created_at: patient.created_at,
      updated_at: patient.updated_at,
    },
    summary,
    visits: queueEntries.map((visit) => ({
      queue_id: visit.queue_id,
      service_id: visit.service_id,
      status: visit.status,
      created_at: visit.created_at,
      updated_at: visit.updated_at,
    })),
    labRequests: labRequests.map((request) => ({
      request_id: request.request_id,
      status: request.status,
      is_paid: request.is_paid,
      requested_at: request.requested_at,
      updated_at: request.updated_at,
    })),
    billing: billing.map((bill) => ({
      bill_id: bill.bill_id,
      total_amount: Number(bill.total_amount ?? 0).toFixed(2),
      status: bill.status,
      payment_method: bill.payment_method,
      billed_at: bill.billed_at,
    })),
  };
}

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
    return res.status(200).json({
      patients: patients as unknown as getAllPatients.patient[],
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
          FROM laboratory_request_items lri
          JOIN services ls ON ls.service_id = lri.service_id
          WHERE lri.queue_id = qe.queue_id
          ORDER BY lri.lab_item_id
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

export async function getAllServices(
  req: Request,
  res: Response<getAllServices.response | getAllServices.error>,
) {
  try {
    const services = await sql`
      SELECT service_id, service_name, price, service_type, room
      FROM services
      WHERE active = TRUE
      ORDER BY service_type, service_name
    `;

    return res.status(200).json({
      services: services as unknown as getAllServices.service[],
    } as getAllServices.response);
  } catch (error) {
    console.error("Error fetching services:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch services" } as getAllServices.error);
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
          lri.lab_item_id                             AS record_id,
          lr.patient_id,
          CONCAT_WS(' ', p.first_name, p.last_name)   AS patient_name,
          s.service_id,
          s.service_name,
          CONCAT_WS(' ', u.first_name, u.last_name)   AS created_by,
          lr.requested_at                             AS created_at,
          lr.request_id,
          lr.is_paid,
          lr.status AS request_status,
          s.room
        FROM laboratory_request_items lri
        JOIN laboratory_requests lr ON lr.request_id = lri.request_id
        JOIN patients p             ON p.patient_id = lr.patient_id
        JOIN services s             ON s.service_id = lri.service_id
        LEFT JOIN users u           ON u.user_id = lr.requested_by
        WHERE lr.is_paid = TRUE
          AND lr.status = 'Paid'
          AND lri.status = 'Requested'
          AND lri.queue_id IS NULL

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
          cr.is_paid,
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

// Shared by the bill list and the bill details so both always agree.
// Legacy "Unpaid" rows come out as "Pending". The stored value is left alone.
function selectBills(billId: string | null) {
  return sql`
    SELECT b.bill_id, b.patient_id, b.items, b.discount_type, b.discount_amount, b.payment_method,
      b.reference_num, b.receipt_id, b.paid_at, b.created_at,
      CASE WHEN LOWER(TRIM(b.status)) = 'paid' THEN 'Paid' ELSE 'Pending' END AS status,
      CASE WHEN LOWER(TRIM(b.status)) <> 'paid' AND lines.count > 0 THEN lines.subtotal ELSE b.subtotal END AS subtotal,
      CASE WHEN LOWER(TRIM(b.status)) <> 'paid' AND lines.count > 0 THEN lines.subtotal ELSE b.total_amount END AS total_amount,
      COALESCE(
        CASE WHEN LOWER(TRIM(b.status)) = 'paid' OR lines.count = 0 THEN (
          SELECT ARRAY_AGG(item->>'service_name')
          FROM jsonb_array_elements(CASE WHEN jsonb_typeof(b.items) = 'array' THEN b.items ELSE '[]'::jsonb END) item
        ) END,
        lines.names,
        '{}'::text[]
      ) AS services,
      CASE
        WHEN NOT lab.has_items THEN 'No laboratory tests'
        WHEN LOWER(TRIM(b.status)) <> 'paid' THEN 'Waiting for payment'
        WHEN lab.has_unforwarded THEN 'Needs forwarding'
        ELSE 'Forwarded'
      END AS laboratory_status,
      lab.has_priority AS is_priority,
      CONCAT_WS(' ', p.first_name, p.last_name) AS patient_name,
      p.sex, p.birthdate, DATE_PART('year', AGE(p.birthdate))::int AS age,
      COALESCE(DATE_PART('year', AGE(p.birthdate)) >= 60, false) AS is_senior,
      COALESCE(p.is_pwd, false) AS is_pwd
    FROM bills b
    JOIN patients p ON p.patient_id = b.patient_id
    LEFT JOIN LATERAL (
      SELECT ARRAY_AGG(l.service_name::text ORDER BY l.created_at, l.service_name) AS names,
        SUM(l.price) AS subtotal, COUNT(*) AS count
      FROM (
        SELECT s.service_name, s.price, cr.requested_at AS created_at
        FROM consultation_records cr JOIN services s ON s.service_id = cr.service_id
        WHERE cr.bill_id = b.bill_id AND LOWER(TRIM(cr.status)) NOT IN ('cancelled', 'canceled', 'rejected')
        UNION ALL
        SELECT s.service_name, s.price, lri.created_at
        FROM laboratory_request_items lri JOIN services s ON s.service_id = lri.service_id
        JOIN laboratory_requests lr ON lr.request_id = lri.request_id
        WHERE lri.bill_id = b.bill_id AND LOWER(TRIM(lri.status)) NOT IN ('cancelled', 'canceled', 'rejected')
          AND LOWER(TRIM(lr.status)) NOT IN ('cancelled', 'canceled', 'rejected')
      ) l
    ) lines ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) > 0 AS has_items,
        COALESCE(BOOL_OR(lri.queue_id IS NULL AND LOWER(TRIM(lri.status)) = 'requested'), false) AS has_unforwarded,
        COALESCE(BOOL_OR(lr.is_priority), false) AS has_priority
      FROM laboratory_request_items lri JOIN laboratory_requests lr ON lr.request_id = lri.request_id
      WHERE lri.bill_id = b.bill_id AND LOWER(TRIM(lri.status)) NOT IN ('cancelled', 'canceled', 'rejected')
        AND LOWER(TRIM(lr.status)) NOT IN ('cancelled', 'canceled', 'rejected')
    ) lab ON TRUE
    WHERE LOWER(TRIM(b.status)) IN ('pending', 'unpaid', 'paid')
      AND (${billId}::text IS NULL OR b.bill_id = ${billId})
    ORDER BY CASE WHEN LOWER(TRIM(b.status)) = 'paid' THEN 1 ELSE 0 END, COALESCE(b.paid_at, b.created_at) DESC
    LIMIT 1000`;
}

export async function getBills(
  req: Request,
  res: Response<getBills.response | getBills.error>,
) {
  // GET /api/fdstaff/billings
  try {
    const rows = await selectBills(null);
    const bills = rows.map(({ items, ...bill }) => bill) as unknown as getBills.bill[];
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
      sql`SELECT * FROM (
        SELECT 'consultation'::text AS line_type, cr.consultation_record_id AS item_id, NULL::text AS request_id,
          cr.service_id, s.service_name, s.service_category, s.price, 1 AS quantity, cr.status, cr.requested_at AS created_at
        FROM consultation_records cr JOIN services s ON s.service_id = cr.service_id
        WHERE cr.bill_id = ${bill_id} AND LOWER(TRIM(cr.status)) NOT IN ('cancelled', 'canceled', 'rejected')
        UNION ALL
        SELECT 'laboratory'::text, lri.lab_item_id, lri.request_id, lri.service_id, s.service_name, s.service_category,
          s.price, 1, lri.status, lri.created_at
        FROM laboratory_request_items lri JOIN services s ON s.service_id = lri.service_id
        JOIN laboratory_requests lr ON lr.request_id = lri.request_id
        WHERE lri.bill_id = ${bill_id} AND LOWER(TRIM(lri.status)) NOT IN ('cancelled', 'canceled', 'rejected')
          AND LOWER(TRIM(lr.status)) NOT IN ('cancelled', 'canceled', 'rejected')
      ) lines ORDER BY created_at, item_id`,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Bill not found." });
    }

    const { items: savedItems, ...bill } = rows[0];
    const saved = Array.isArray(savedItems) ? savedItems : [];
    // Paid bills keep the prices that were charged, never today's catalog prices.
    const items = bill.status === "Paid" || linkedItems.length === 0 ? saved : linkedItems;

    return res.status(200).json({
      bill: bill as unknown as getBills.bill,
      items: items as getBillDetails.BillItem[],
    });
  } catch (error) {
    console.error("Unable to load bill details:", error);
    return res.status(500).json({ message: "Bill details could not be loaded." });
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
        return res.status(404).json({
          message: "Laboratory record not found.",
        } as getMedicalHistoryDetails.error);

      const results = await sql`
        SELECT result_id, results, remarks,
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
  lab_item_id: string;
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
  lab_item_id: string;
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

async function resolveLabItemsTable(): Promise<
  "laboratory_request_items" | "request_items" | null
> {
  const laboratoryRequestItems = (await sql`
    SELECT to_regclass('public.laboratory_request_items') AS table_name
  `) as { table_name: string | null }[];

  if (laboratoryRequestItems[0]?.table_name) {
    return "laboratory_request_items";
  }

  const requestItems = (await sql`
    SELECT to_regclass('public.request_items') AS table_name
  `) as { table_name: string | null }[];

  if (requestItems[0]?.table_name) {
    return "request_items";
  }

  return null;
}

function buildFullName(
  parts: Array<string | null | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}

// GET PATIENT MEDICAL HISTORY
// =======================================================================

export async function getPatientMedicalHistory(
  req: Request<{ patient_id: string }>,
  res: Response<
    MedicalHistoryDTO.response | MedicalHistoryDTO.error
  >
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
        lr.request_id,
        lr.consultation_record_id,
        lr.doctor_id,
        lr.status,
        lr.is_paid,
        lr.requested_at,
        lr.updated_at,

        u.first_name AS doctor_first_name,
        u.middle_name AS doctor_middle_name,
        u.last_name AS doctor_last_name,
        u.suffix AS doctor_suffix,
        u.department AS doctor_department,
        u.role AS doctor_role

      FROM lab_requests lr
      LEFT JOIN users u ON u.user_id = lr.doctor_id

      WHERE lr.patient_id = ${patient_id}

      ORDER BY lr.requested_at DESC, lr.updated_at DESC
    `) as MedicalHistoryLabRequestRow[];

    // LABORATORY ITEMS AND RESULTS
    // ===================================================================

    const labItemsTable = await resolveLabItemsTable();

    let labItems: MedicalHistoryLabItemRow[] = [];
    let labResults: MedicalHistoryLabResultRow[] = [];

    if (labItemsTable === "laboratory_request_items") {
      labItems = (await sql`
        SELECT
          li.lab_item_id,
          li.request_id,
          li.service_id,
          li.queue_id,
          li.status,
          li.created_at,
          li.updated_at,

          s.service_name,
          s.service_type,
          s.room

        FROM laboratory_request_items li
        LEFT JOIN services s ON s.service_id = li.service_id
        JOIN lab_requests lr ON lr.request_id = li.request_id

        WHERE lr.patient_id = ${patient_id}

        ORDER BY li.created_at DESC, li.updated_at DESC
      `) as MedicalHistoryLabItemRow[];

      labResults = (await sql`
        SELECT
          r.result_id,
          r.lab_item_id,
          r.result_value,
          r.unit,
          r.reference_range,
          r.flag,
          r.remarks,
          r.verified_by,
          r.image_url,
          r.verified_at,
          r.created_at

        FROM laboratory_results r
        JOIN laboratory_request_items li
          ON li.lab_item_id = r.lab_item_id
        JOIN lab_requests lr
          ON lr.request_id = li.request_id

        WHERE lr.patient_id = ${patient_id}

        ORDER BY r.created_at DESC
      `) as MedicalHistoryLabResultRow[];

    } else if (labItemsTable === "request_items") {
      labItems = (await sql`
        SELECT
          li.lab_item_id,
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
        JOIN lab_requests lr ON lr.request_id = li.request_id

        WHERE lr.patient_id = ${patient_id}

        ORDER BY li.created_at DESC, li.updated_at DESC
      `) as MedicalHistoryLabItemRow[];

      labResults = (await sql`
        SELECT
          r.result_id,
          r.lab_item_id,
          r.result_value,
          r.unit,
          r.reference_range,
          r.flag,
          r.remarks,
          r.verified_by,
          r.image_url,
          r.verified_at,
          r.created_at

        FROM laboratory_results r
        JOIN request_items li
          ON li.lab_item_id = r.lab_item_id
        JOIN lab_requests lr
          ON lr.request_id = li.request_id

        WHERE lr.patient_id = ${patient_id}

        ORDER BY r.created_at DESC
      `) as MedicalHistoryLabResultRow[];
    }

    // GROUP LAB RESULTS BY LAB ITEM
    // ===================================================================

    const resultsByLabItemId = new Map<
      string,
      MedicalHistoryLabResultRow[]
    >();

    for (const result of labResults) {
      const existing =
        resultsByLabItemId.get(result.lab_item_id) ?? [];

      existing.push(result);

      resultsByLabItemId.set(result.lab_item_id, existing);
    }

    // GROUP LAB ITEMS BY REQUEST
    // ===================================================================

    const itemsByRequestId = new Map<
      string,
      MedicalHistoryLabItemRow[]
    >();

    for (const item of labItems) {
      const existing =
        itemsByRequestId.get(item.request_id) ?? [];

      existing.push(item);

      itemsByRequestId.set(item.request_id, existing);
    }

    // BUILD CONSULTATION RESPONSE
    // ===================================================================

    const consultationHistory: MedicalHistoryDTO.response["consultations"] =
      consultations.map((consultation) => ({
        consultation_record_id:
          consultation.consultation_record_id,
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
        const items = (
          itemsByRequestId.get(request.request_id) ?? []
        ).map((item) => ({
          lab_item_id: item.lab_item_id,
          request_id: item.request_id,
          service_id: item.service_id,
          queue_id: item.queue_id,
          status: item.status,
          created_at: item.created_at,
          updated_at: item.updated_at,
          service_name: item.service_name,
          service_type: item.service_type,
          room: item.room,

          results:
            resultsByLabItemId.get(item.lab_item_id) ?? [],
        }));

        return {
          request_id: request.request_id,
          consultation_record_id:
            request.consultation_record_id,
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

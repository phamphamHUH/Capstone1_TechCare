import { Request, Response } from "express";
import { sql } from "../../config/db.js";

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

async function resolveLabItemsTable() {
  const laboratoryRequestItems = await sql<{ table_name: string | null }[]>`
    SELECT to_regclass('public.laboratory_request_items') AS table_name
  `;

  if (laboratoryRequestItems[0]?.table_name) {
    return "laboratory_request_items" as const;
  }

  const requestItems = await sql<{ table_name: string | null }[]>`
    SELECT to_regclass('public.request_items') AS table_name
  `;

  if (requestItems[0]?.table_name) {
    return "request_items" as const;
  }

  return null;
}

function buildFullName(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export async function getPatientMedicalHistory(req: Request, res: Response) {
  try {
    const { patient_id } = req.params;

    if (!patient_id) {
      return res.status(400).json({ message: "Patient ID is required." });
    }

    const patientRows = await sql`
      SELECT *
      FROM patients
      WHERE patient_id = ${patient_id}
      LIMIT 1
    `;

    const patient = patientRows[0];

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    const consultations = await sql<MedicalHistoryConsultationRow[]>`
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
    `;

    const labRequests = await sql<MedicalHistoryLabRequestRow[]>`
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
    `;

    const labItemsTable = await resolveLabItemsTable();

    let labItems: MedicalHistoryLabItemRow[] = [];
    let labResults: MedicalHistoryLabResultRow[] = [];

    if (labItemsTable === "laboratory_request_items") {
      labItems = await sql<MedicalHistoryLabItemRow[]>`
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
      `;

      labResults = await sql<MedicalHistoryLabResultRow[]>`
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
        JOIN laboratory_request_items li ON li.lab_item_id = r.lab_item_id
        JOIN lab_requests lr ON lr.request_id = li.request_id
        WHERE lr.patient_id = ${patient_id}
        ORDER BY r.created_at DESC
      `;
    } else if (labItemsTable === "request_items") {
      labItems = await sql<MedicalHistoryLabItemRow[]>`
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
      `;

      labResults = await sql<MedicalHistoryLabResultRow[]>`
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
        JOIN request_items li ON li.lab_item_id = r.lab_item_id
        JOIN lab_requests lr ON lr.request_id = li.request_id
        WHERE lr.patient_id = ${patient_id}
        ORDER BY r.created_at DESC
      `;
    }

    const resultsByLabItemId = new Map<string, MedicalHistoryLabResultRow[]>();

    for (const result of labResults) {
      const existingResults = resultsByLabItemId.get(result.lab_item_id) ?? [];
      existingResults.push(result);
      resultsByLabItemId.set(result.lab_item_id, existingResults);
    }

    const itemsByRequestId = new Map<string, MedicalHistoryLabItemRow[]>();

    for (const item of labItems) {
      const existingItems = itemsByRequestId.get(item.request_id) ?? [];
      existingItems.push(item);
      itemsByRequestId.set(item.request_id, existingItems);
    }

    const consultationHistory = consultations.map((consultation) => ({
      ...consultation,
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

    const labRequestHistory = labRequests.map((request) => {
      const items = (itemsByRequestId.get(request.request_id) ?? []).map((item) => ({
        ...item,
        results: resultsByLabItemId.get(item.lab_item_id) ?? [],
      }));

      return {
        ...request,
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

    return res.status(200).json({
      patient,
      consultations: consultationHistory,
      labRequests: labRequestHistory,
      summary: {
        consultations: consultationHistory.length,
        labRequests: labRequestHistory.length,
        labItems: labItems.length,
      },
    });
  } catch (error) {
    console.error("getPatientMedicalHistory error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
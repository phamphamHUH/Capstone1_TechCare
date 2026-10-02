import { sql } from "../../config/db.js";
import bcrypt from "bcryptjs";
import { json, Request, Response } from "express";
import jwt from "jsonwebtoken";

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

export async function getAllPatients(req: Request, res: Response) {
  // get /api/fdstaff/patients
  try {
    const patients = await sql`SELECT * FROM patients`;
    if (!patients) {
      res.json({ message: "there are no patients" });
    }
    res.status(200).json({ patients });
    //[
    // {
    //     "patient_id":1,
    //     "last_name":"Doe",
    //     "first_name":"John",
    //     "date_of_birth":"1990-01-01",
    //     "contact_number":"1234567890",
    //     "email":"patient@gmail.com",
    //     "address":"123 Main St",
    //     "emergency_contact":"Jane Doe",
    //     "image_url":"https://example.com/patient.jpg",
    //     "created_at":"2026-07-02T00:00:00.000Z",
    //     "updated_at":"2026-07-02T00:00:00.000Z"
    // },
    // {
    //     "patient_id":2,
    //     "last_name":"Smith",
    //     "first_name":"Jane",
    //     "date_of_birth":"1995-05-15",
    //     "contact_number":"0987654321",
    //     "email":"
    //     "created_at":"2026-07-02T00:00:00.000Z",
    //     "updated_at":"2026-07-02T00:00:00.000Z"
    // }
    //]
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ error: "error on fetching patients" });
  }
}

export async function getPrintablePatientRecord(req: Request, res: Response) {
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

    if (!patientRows.length) {
      return res.status(404).json({ message: "Patient not found." });
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

    return res.status(200).json({ patientRecord: printableRecord });
  } catch (error) {
    console.error("Error fetching printable patient record:", error);
    return res
      .status(500)
      .json({ error: "Error fetching printable patient record." });
  }
}

export async function getAllBilling(req: Request, res: Response) {
  // get /api/fdstaff/billing
  try {
    const billing = await sql`SELECT * FROM billing`;
    if (!billing) {
      res.json({ message: "there are no billing records" });
    }
    res.status(200).json({ billing });
    // {
    //     "billing": [
    //         {
    //         "bill_id": 1,
    //         "patient_id": 1,
    //         "discount_pct": 0,
    //         "total_amount": 1000,
    //         "payment_method": "Cash",
    //         "status": "Paid",
    //         "receipt_id": "2026-07-02-0001",
    //         "billed_at": "2026-07-02T00:00:00.000Z"
    //         },
    //         {
    //         "bill_id": 2,
    //         "patient_id": 2,
    //         "discount_pct": 10,
    //         "total_amount": 900,
    //         "payment_method": "Credit Card",
    //         "status": "Unpaid",

    //     ]
    // }
  } catch (error) {
    res.status(500).json({ error: "error on fetching billing records" });
  }
}

export async function getAllQueueEntries(req: Request, res: Response) {
  try {
    const queueEntries = await sql`
      SELECT
        qe.id,
        qe.queue_id,
        qe.patient_id,
        CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name) AS patient_name,
        to_char(p.birthdate, 'YYYY-MM-DD')                       AS birthdate,
        qe.queue_number,
        qe.service_id,
        s.service_name,
        s.service_type,
        s.service_category,
        s.room,
        qe.is_priority,
        qe.status,
        qe.created_at,
        qe.updated_at
      FROM queue_entries qe
      JOIN patients p ON p.patient_id = qe.patient_id
      JOIN services s ON s.service_id = qe.service_id
      ORDER BY qe.queue_number ASC, qe.id ASC
    `;

    return res.status(200).json({ queueEntries });
  } catch (error) {
    console.error("Error fetching queue entries:", error);
    return res.status(500).json({ message: "Failed to fetch queue entries" });
  }
}

export async function getAllServices(req: Request, res: Response) {
  try {
    const services = await sql`
      SELECT service_id, service_name, price, service_type, room
      FROM services
      WHERE active = TRUE
      ORDER BY service_type, service_name
    `;

    return res.status(200).json({ services });
  } catch (error) {
    console.error("Error fetching services:", error);
    return res.status(500).json({ message: "Failed to fetch services" });
  }
}

export async function getLaboratoryRequest(req: Request, res: Response) {
  try {
    const { patient_id } = req.params;

    const lab_reqs = await sql`
        SELECT * FROM laboratory_requests
        WHERE patient_id = ${patient_id} AND is_paid = 'FALSE
        AND requested_at >= CURRENT_DATE
        AND requested_at < CURRENT_DATE + INTERVAL '1 day'
        ORDER BY requested_at DESC;
    `;
    if (!lab_reqs) {
      res.json({ message: "there are no laboratory requests" });
    }
    res.status(200).json({ lab_reqs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

export async function getQueueRequests(req: Request, res: Response) {
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
          lr.requested_at                             AS created_at
        FROM laboratory_request_items lri
        JOIN laboratory_requests lr ON lr.request_id = lri.request_id
        JOIN patients p             ON p.patient_id = lr.patient_id
        JOIN services s             ON s.service_id = lri.service_id
        LEFT JOIN users u           ON u.user_id = lr.requested_by
        WHERE lr.is_paid = TRUE
          AND lri.status = 'Paid'
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
          cr.consulted_at
        FROM consultation_records cr
        JOIN patients p   ON p.patient_id = cr.patient_id
        JOIN services s   ON s.service_id = cr.service_id
        LEFT JOIN users u ON u.user_id = cr.doctor_id
        WHERE cr.status = 'Created'
          AND cr.queue_id IS NULL
      ) requests
      ORDER BY created_at DESC
    `;

    return res.status(200).json({ requests: rows });
  } catch (error) {
    console.error("Error fetching queue requests:", error);
    return res.status(500).json({ message: "Failed to fetch queue requests" });
  }
}

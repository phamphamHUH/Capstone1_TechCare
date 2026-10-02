import { sql } from "../../config/db.js";
import bcrypt from "bcryptjs";
import { json, Request, Response } from "express";
import jwt from "jsonwebtoken";

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
  // get /api/fdstaff/queues
  // get /api/fdstaff/queue
  try {
    const queueEntries = await sql`
    SELECT * 
    FROM queue_entries
    ORDER BY queue_number ASC
    `;
    if (!queueEntries) {
      res.json({ message: "there are no queue entries" });
    }
    res.status(200).json({ queueEntries });
    // {
    //     "queueEntries": [
    //         {
    //             "queue_id": 1,
    //             "patient_id": 1,
    //             "doctor_id": 1,
    //             "queue_number": 1,
    //             "service_type": "General Consultation",
    //             "status": "Waiting",
    //             "created_at": "2026-07-02T00:00:00.000Z",
    //             "updated_at": "2026-07-02T00:00:00.000Z"
    //         },
    //         {
    //             "queue_id": 2,
    //             "patient_id": 2,
    //             "doctor_id": 1,
    //             "queue_number": 2,
    //             "service_type": "General Consultation",
    //             "status": "Waiting",
    //             "created_at": "2026-07-02T00:00:00.000Z",
    //             "updated_at": "2026-07-02T00:00:00.000Z"
    //         },
    //     ]
    // }
  } catch (error) {
    res.status(500).json({ error: "error on fetching queue entries" });
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

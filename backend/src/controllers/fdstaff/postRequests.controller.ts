import { sql } from "../../config/db.js";
import { pool } from "../../config/db.js";
import bcrypt from "bcryptjs";
import { calculateAge } from "../../utils/calculateAge.js";
import { Request, Response } from "express";
import cloudinary from "../../config/cloudinary.js";
import {
  generateConsultationQueueId,
  generateLaboratoryQueueId,
  generatePatientId,
  generateLaboratoryRequestID,
  generateQueueNumberConsultation,
  generateQueueNumberLaboratory,
  generateLaboratoryItemID,
} from "../../utils/generateId.js";
export async function addPatient(req: Request, res: Response) {
  // POST /api/fdstaff/patients
  try {
    const {
      first_name,
      middle_name,
      last_name,
      suffix,
      sex,
      email,
      address,
      contact_number,
      civil_status,
      blood_type,
      birthdate,
      emergency_contact_name,
      emergency_contact,
    } = req.body;

    // Validate required fields (matches NOT NULL columns on `patients`;
    // civil_status has a DB default so it's optional here)
    if (
      !first_name ||
      !last_name ||
      !birthdate ||
      !sex ||
      !address ||
      !email ||
      !contact_number
    ) {
      return res.status(400).json({
        message:
          "First name, last name, birthdate, sex, address, email, and contact number are required.",
      });
    }

    // Check if patient already exists
    const existingPatient = await sql`
      SELECT *
      FROM patients
      WHERE last_name = ${last_name}
        AND first_name = ${first_name}
        AND birthdate = ${birthdate}
        AND contact_number = ${contact_number}
        AND email = ${email}
    `;
    if (existingPatient.length > 0) {
      return res.status(400).json({
        message:
          "A patient with the same name, contact number, email, and date of birth already exists.",
      });
    }

    const patientId = await generatePatientId();

    const password = last_name;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Upload photo to Cloudinary if one was attached (multer puts it on req.file)
    let imageUrl: string | null = null;
    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "techcare/patients",
      });
      imageUrl = uploadResult.secure_url;
    }

    const response = await sql`
      INSERT INTO patients (
        patient_id,
        username,
        password_hash,
        first_name,
        middle_name,
        last_name,
        suffix,
        sex,
        email,
        address,
        contact_number,
        civil_status,
        blood_type,
        birthdate,
        emergency_contact_name,
        emergency_contact,
        image_url
      )
      VALUES (
        ${patientId},
        ${patientId},
        ${hashedPassword},
        ${first_name},
        ${middle_name ?? null},
        ${last_name},
        ${suffix ?? null},
        ${sex},
        ${email},
        ${address},
        ${contact_number},
        ${civil_status ?? "Single"},
        ${blood_type ?? null},
        ${birthdate},
        ${emergency_contact_name ?? null},
        ${emergency_contact ?? null},
        ${imageUrl}
      )
      RETURNING *;
    `;

    const age = calculateAge(birthdate);

    return res.status(201).json({
      message: "Patient added successfully.",
      patient: { ...response[0], age },
    });
  } catch (error: any) {
    console.dir(error, { depth: null });
    return res.status(500).json({ message: "Failed to add patient." });
  }
}
export async function addBills(req: Request, res: Response) {
  try {
    const {
      patient_id,
      services_ids = [],
      discount_pct = 0,
      custom_service = [],
      payment_method = "Cash",
      status = "Unpaid",
    }: {
      patient_id: string;
      services_ids: number[];
      discount_pct?: number;
      custom_service?: {
        service_name: string;
        price: number;
      }[];
      payment_method?: string;
      status?: string;
    } = req.body;

    // {
    //   "patient_id": "P-2024-0001",
    //   "services_ids": [1, 3],
    //   "custom_service": [
    //     {
    //       "service_name": "Medical Certificate",
    //       "price": 200
    //     },
    //     {
    //       "service_name": "Home Visit Fee",
    //       "price": 500
    //     }
    //   ],
    //   "discount_pct": 10,
    //   "payment_method": "Cash",
    //   "status": "Unpaid"
    // }

    const services: {
      service_name: string;
      price: number;
    }[] = [];

    // Fetch services from the database
    for (let i = 0; i < services_ids.length; i++) {
      const service = await sql`
                SELECT price, service_name
                FROM services
                WHERE service_id = ${services_ids[i]}
            `;

      if (service.length === 0) {
        return res.status(404).json({
          message: `Service ID ${services_ids[i]} not found`,
        });
      }

      services.push({
        service_name: service[0].service_name,
        price: Number(service[0].price),
      });
    }

    // Add custom services
    services.push(...custom_service);

    const service_total = services.reduce(
      (sum, service) => sum + service.price,
      0,
    );

    const discount = service_total * (discount_pct / 100);
    const total_amount = service_total - discount;

    const bill = await sql`
            INSERT INTO bills (
                patient_id,
                services_ids,
                discount_pct,
                total_amount,
                payment_method,
                status
            )
            VALUES (
                ${patient_id},
                ${services_ids},
                ${discount_pct},
                ${total_amount},
                ${payment_method},
                ${status}
            )
            RETURNING *;
        `;

    return res.status(201).json({
      message: "Bill created successfully",
      bill: {
        ...bill[0],
        services,
      },
    });

    // {
    //   "message": "Bill created successfully",
    //   "bill": {
    //     "bill_id": 15,
    //     "patient_id": "P-2024-0001",
    //     "services_ids": [1, 3],
    //     "services": [
    //       {
    //         "service_name": "Complete Blood Count (CBC)",
    //         "price": 500
    //       },
    //       {
    //         "service_name": "Chest X-Ray",
    //         "price": 800
    //       },
    //       {
    //         "service_name": "Medical Certificate",
    //         "price": 200
    //       },
    //       {
    //         "service_name": "Home Visit Fee",
    //         "price": 500
    //       }
    //     ],
    //     "discount_pct": "10.00",
    //     "total_amount": "1800.00",
    //     "payment_method": "Cash",
    //     "status": "Unpaid",
    //     "receipt_id": null,
    //     "created_at": "2026-07-02T11:45:12.931Z",
    //     "receipt_issued_at": null,
    //     "billed_at": "2026-07-02T11:45:12.931Z"
    //   }
    // }
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
}

// export async function addQueueEntry(req: Request, res: Response) {
//   try {
//     const { patient_id, service_id, service_type, is_priority } = req.body;
//     let total;
//     if (is_priority) {
//       total = await sql`
//         SELECT COUNT(*) AS total
//         FROM queue_entries
//         WHERE is_priority = TRUE
//     `;
//     } else {
//       total = await sql`
//       SELECT COUNT(*) AS total
//       FROM queue_entries
//       WHERE is_priority = FALSE
//     `;
//     }
//     if (!patient_id || !service_id || !service_type) {
//       return res.status(400).json({
//         message: "patient_id, service_id, and service_type are required.",
//       });
//     }
//     let queueId;
//     if (service_type === "consultation") {
//       queueId = await generateConsultationQueueId();
//     }
//     if (service_type === "laboratory") {
//       queueId = await generateLaboratoryQueueId();
//     }
//     let patientName = null;
//     if (patient_id) {
//       patientName = await sql`
//     SELECT last_name, first_name
//     FROM patients
//     WHERE patient_id = ${patient_id}
//     `;
//       if (patientName.length === 0) {
//         return res
//           .status(404)
//           .json({ message: "the patient id you entered doesnt exist" });
//       }
//       patientName = patientName[0].last_name + ", " + patientName[0].first_name;
//     }
//     const newQueueNumber = Number(total[0].total) + 1;
//     const newQueue = await sql`
//         INSERT INTO queue_entries (queue_id, patient_id, patient_name, queue_number, service_id, service_type)
//         VALUES (${queueId}, ${patient_id}, ${patientName}, ${newQueueNumber}, ${service_id}, ${service_type})
//         RETURNING *;
//     `;
//     res.status(200).json({ newQueue, message: "added to queue" });
//     console.log(newQueueNumber);
//   } catch (error) {
//     console.log(error);
//   }
// }

export async function addQueueEntry(req: Request, res: Response) {
  try {
    // Get the data sent by the frontend
    const { patient_id, service_id, is_priority } = req.body;

    // Make sure a service was selected
    if (!service_id || !patient_id) {
      return res.status(400).json({
        message: "service_id and patient_id are required.",
      });
    }

    // Retrieve the service type (consultation or laboratory)
    // based on the selected service_id
    const serviceType = await sql`
      SELECT service_type
      FROM services
      WHERE service_id = ${service_id}
    `;

    // Variables that will store the generated queue ID
    // and queue number
    let queueId;
    let queueNumber;

    // Generate consultation queue ID and number
    if (
      serviceType[0].service_type.split(" ")[0].toLowerCase() === "consultation"
    ) {
      queueId = await generateConsultationQueueId();
      queueNumber = await generateQueueNumberConsultation(); // Exammple return : CONS-0017
    }

    // Generate laboratory queue ID and number
    if (
      serviceType[0].service_type.split(" ")[0].toLowerCase() === "laboratory"
    ) {
      queueId = await generateLaboratoryQueueId();
      queueNumber = await generateQueueNumberLaboratory(); // Example return: LAB-0017
    }

    // Insert the new queue entry into the database
    const newQueue = await sql`
      INSERT INTO queue_entries (
        queue_id,
        patient_id,
        queue_number,
        service_id,
        is_priority,
        status
      )
      VALUES (
        ${queueId},
        ${patient_id},
        ${queueNumber},
        ${service_id},
        ${is_priority},
        'Waiting'
      )
      RETURNING *;
    `;

    // Send the newly created queue entry back to the client
    res.status(200).json({
      newQueue,
      message: "Added to queue",
    });
  } catch (error) {
    // Log unexpected server/database errors
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function addLaboratoryRequest(req: Request, res: Response) {
  const { patient_id, services } = req.body;
  const user_id = req.user?.user_id;

  if (
    !patient_id ||
    !user_id ||
    !Array.isArray(services) ||
    services.length === 0
  ) {
    return res.status(400).json({
      message:
        "Patient ID and User ID are required and at least one service must be provided.",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('lab_ids'))");

    const request_id = await generateLaboratoryRequestID(client);
    const { rows: laboratory_request_result } = await client.query(
      `INSERT INTO laboratory_requests (request_id, patient_id, requested_by, is_paid)
       VALUES ($1, $2, $3, TRUE)
       RETURNING *`,
      [request_id, patient_id, user_id],
    );

    const laboratory_item_result = [];
    for (const service of services) {
      const lab_item_id = await generateLaboratoryItemID(client);
      const { rows } = await client.query(
        `INSERT INTO laboratory_request_items (lab_item_id, request_id, service_id, status)
         VALUES ($1, $2, $3, 'Requested')
         RETURNING *`,
        [lab_item_id, request_id, service.service_id],
      );
      laboratory_item_result.push(rows[0]);
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Laboratory request added successfully.",
      request: laboratory_request_result,
      items: laboratory_item_result,
    });
  } catch (error: any) {
    console.error(error);
    await client.query("ROLLBACK").catch(console.error);
    if (error.code === "23503") {
      return res
        .status(400)
        .json({ message: "Invalid patient or service ID." });
    }
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  } finally {
    client.release();
  }
}

import { sql } from "../config/db.js";
import type { PoolClient } from "@neondatabase/serverless";

export async function generateUserId() {
  const now = new Date();

  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const prefix = `${year}-${month}${day}`;
  const usersCreatedToday = await sql`
        SELECT user_id
        FROM users
        WHERE DATE(created_at) = CURRENT_DATE
        ORDER BY user_id DESC
      `;
  // V this is a better approch becaus eof timezone issue but lets just use the one that calculates the actual data now for simplified
  //   const usersCreatedToday = await sql`
  //   SELECT user_id
  //   FROM users
  //   WHERE user_id LIKE ${prefix + "-%"}
  //   ORDER BY user_id DESC
  //   LIMIT 1
  // `;
  let nextNumber = 1;

  if (usersCreatedToday.length > 0) {
    nextNumber = Number(usersCreatedToday[0].user_id.slice(-4)) + 1;
  }
  const sequence = String(nextNumber).padStart(4, "0");
  return `U-${prefix}-${sequence}`;
}

export async function generatePatientId() {
  const now = new Date();

  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const prefix = `${year}-${month}${day}`;
  const usersCreatedToday = await sql`
        SELECT patient_id
        FROM patients
        WHERE DATE(created_at) = CURRENT_DATE
        ORDER BY patient_id DESC
      `;
  // V this is a better approch becaus eof timezone issue but lets just use the one that calculates the actual data now for simplified
  //   const usersCreatedToday = await sql`
  //   SELECT patient_id
  //   FROM patients
  //   WHERE patient_id LIKE ${prefix + "-%"}
  //   ORDER BY patient_id DESC
  //   LIMIT 1
  // `;
  let nextNumber = 1;

  if (usersCreatedToday.length > 0) {
    nextNumber = Number(usersCreatedToday[0].patient_id.slice(-4)) + 1;
  }
  const sequence = String(nextNumber).padStart(4, "0");
  return `P-${prefix}-${sequence}`;
}

export async function generateServiceId() {
  const now = new Date();

  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const prefix = `${year}-${month}`;
  const existingServices = await sql`
  SELECT service_id
  FROM services
  WHERE service_id LIKE ${`S-${prefix}-%`}
  ORDER BY service_id DESC
  LIMIT 1
`;
  // or to get the data instead of prefix
  // const usersCreatedThisMonth = await sql`
  //   SELECT service_id
  //   FROM services
  //   WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
  //     AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
  //   ORDER BY service_id DESC
  // `;

  ////=========================================
  // V this is a better approch becaus eof timezone issue but lets just use the one that calculates the actual data now for simplified
  //   const usersCreatedToday = await sql`
  //   SELECT service_id
  //   FROM services
  //   WHERE service_id LIKE ${prefix + "-%"}
  //   ORDER BY service_id DESC
  //   LIMIT 1
  // `;
  let nextNumber = 1;

  if (existingServices.length > 0) {
    nextNumber = Number(existingServices[0].service_id.slice(-3)) + 1;
  }
  const sequence = String(nextNumber).padStart(3, "0");
  return `S-${prefix}-${sequence}`;
}

export async function generatePackageId() {
  const now = new Date();

  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const prefix = `${year}-${month}`;
  const existingPackages = await sql`
  SELECT package_id
  FROM packages
  WHERE package_id LIKE ${`P-${prefix}-%`}
  ORDER BY package_id DESC
  LIMIT 1
`;
  // or to get the data instead of prefix
  // const usersCreatedThisMonth = await sql`
  //   SELECT service_id
  //   FROM services
  //   WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
  //     AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
  //   ORDER BY service_id DESC
  // `;

  ////=========================================
  // V this is a better approch becaus eof timezone issue but lets just use the one that calculates the actual data now for simplified
  //   const usersCreatedToday = await sql`
  //   SELECT service_id
  //   FROM services
  //   WHERE service_id LIKE ${prefix + "-%"}
  //   ORDER BY service_id DESC
  //   LIMIT 1
  // `;
  let nextNumber = 1;

  if (existingPackages.length > 0) {
    nextNumber = Number(existingPackages[0].service_id.slice(-3)) + 1;
  }
  const sequence = String(nextNumber).padStart(3, "0");
  return `P-${prefix}-${sequence}`;
}

export async function generateActivityId() {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  // military time (24-hour format)
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const time = `${hours}${minutes}`;

  const prefix = `${year}${month}${day}-${time}`;

  const result = await sql`
    SELECT activity_id
    FROM system_activity
    WHERE activity_id LIKE ${`ACT-${prefix}-%`}
    ORDER BY activity_id DESC
    LIMIT 1
  `;

  let nextNumber = 1;

  const last = result[0]?.activity_id;

  if (last) {
    nextNumber = Number(last.slice(-4)) + 1;
  }

  const sequence = String(nextNumber).padStart(4, "0");

  return `ACT-${prefix}-${sequence}`;
}

export async function generateLaboratoryRequestID(client: PoolClient) {
  const now = new Date();

  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const prefix = `${year}-${month}${day}`;
  const { rows: labRequestsCreatedToday } = await client.query(
    `SELECT request_id
     FROM laboratory_requests
     WHERE request_id LIKE $1
     ORDER BY request_id DESC
     LIMIT 1`,
    [`LR-${prefix}-%`],
  );

  const nextNumber =
    labRequestsCreatedToday.length > 0
      ? Number(labRequestsCreatedToday[0].request_id.slice(-4)) + 1
      : 1;

  return `LR-${prefix}-${String(nextNumber).padStart(4, "0")}`;
}

export async function generateLaboratoryItemID(client: PoolClient) {
  const now = new Date();

  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const prefix = `${year}-${month}${day}`;
  const { rows: labItemsCreatedToday } = await client.query(
    `SELECT lab_item_id
     FROM laboratory_request_items
     WHERE lab_item_id LIKE $1
     ORDER BY lab_item_id DESC
     LIMIT 1`,
    [`LI-${prefix}-%`],
  );

  const nextNumber =
    labItemsCreatedToday.length > 0
      ? Number(labItemsCreatedToday[0].lab_item_id.slice(-4)) + 1
      : 1;

  return `LI-${prefix}-${String(nextNumber).padStart(4, "0")}`;
}

export async function generatePrescriptionId() {
  const now = new Date();

  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const prefix = `${year}-${month}${day}`;
  const prescriptionCreatedToday = await sql`
    SELECT prescription_id
    FROM prescription_records
    WHERE prescription_id LIKE ${`RX-${prefix}-%`}
    ORDER BY prescription_id DESC
    LIMIT 1
  `;

  const nextNumber =
    prescriptionCreatedToday.length > 0
      ? Number(prescriptionCreatedToday[0].prescription_id.slice(-4)) + 1
      : 1;

  return `RX-${prefix}-${String(nextNumber).padStart(4, "0")}`;
}

export async function generateConsultationRecordId(client: PoolClient) {
  const now = new Date();

  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const prefix = `${year}-${month}${day}`;

  const { rows: consultationRecordToday } = await client.query(
    `SELECT consultation_record_id
   FROM consultation_records
   WHERE consultation_record_id LIKE $1
   ORDER BY consultation_record_id DESC
   LIMIT 1`,
    [`CR-${prefix}-%`],
  );

  const nextNumber =
    consultationRecordToday.length > 0
      ? Number(consultationRecordToday[0].consultation_record_id.slice(-4)) + 1
      : 1;

  return `CR-${prefix}-${String(nextNumber).padStart(4, "0")}`;
}

export async function generateBillId(client: PoolClient) {
  const now = new Date();

  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const prefix = `${year}-${month}${day}`;
  // Must read on the caller's transaction, or two bills created in one transaction collide.
  const { rows: billCreatedToday } = await client.query(
    `SELECT bill_id
     FROM bills
     WHERE bill_id LIKE $1
     ORDER BY bill_id DESC
     LIMIT 1`,
    [`B-${prefix}-%`],
  );

  const nextNumber =
    billCreatedToday.length > 0
      ? Number(billCreatedToday[0].bill_id.slice(-4)) + 1
      : 1;

  return `B-${prefix}-${String(nextNumber).padStart(4, "0")}`;
}
/////////=================================== QUQUE ID GENERATOR =========================================
// export async function generateConsultationQueueId() {
//   const queue = await sql`
//     SELECT queue_id
//     FROM queue_entries
//     WHERE queue_id LIKE 'CONS-%'
//     ORDER BY queue_id DESC
//     LIMIT 1
//   `;
//   let nextNumber = 1;
//   const last = queue[0]?.queue_id;

//   if (last) {
//     nextNumber = Number(last.slice(-4)) + 1;
//   }
//   const sequence = String(nextNumber).padStart(4, "0");
//   return `CONS-${sequence}`;
// }
// export async function generateLaboratoryQueueId() {
//   const queue = await sql`
//     SELECT queue_id
//     FROM queue_entries
//     WHERE queue_id LIKE 'LAB-%'
//     ORDER BY queue_id DESC
//     LIMIT 1
//   `;
//   let nextNumber = 1;
//   const last = queue[0]?.queue_id;

//   if (last) {
//     nextNumber = Number(last.slice(-4)) + 1;
//   }
//   const sequence = String(nextNumber).padStart(4, "0");
//   return `LAB-${sequence}`;
// }
// //LAB-0017

// export async function generateQueueNumberConsultation() {
//   const queue = await sql`
//     SELECT queue_number
//     FROM queue_entries
//     WHERE queue_id LIKE 'CONS-%'
//     ORDER BY queue_number DESC
//     LIMIT 1
//     `;
//   let nextNumber = 1;
//   const last = queue[0]?.queue_number;

//   if (last) {
//     nextNumber = Number(last) + 1;
//   }

//   return nextNumber;
// }
// export async function generateQueueNumberLaboratory() {
//   const queue = await sql`
//     SELECT queue_number
//     FROM queue_entries
//     WHERE queue_id LIKE 'LAB-%'
//     ORDER BY queue_number DESC
//     LIMIT 1
//     `;
//   let nextNumber = 1;
//   const last = queue[0]?.queue_number;

//   if (last) {
//     nextNumber = Number(last) + 1;
//   }

//   return nextNumber;
// }
///=======================================================================================

export async function generateConsultationQueueId(client: PoolClient) {
  const { rows } = await client.query(
    `SELECT queue_id
     FROM queue_entries
     WHERE queue_id LIKE 'CON-%'
     ORDER BY SPLIT_PART(queue_id, '-', 2)::int DESC
     LIMIT 1`,
  );

  const last = rows[0]?.queue_id;
  const nextNumber = last ? Number(last.split("-")[1]) + 1 : 1;

  return `CON-${String(nextNumber).padStart(4, "0")}`;
}

export async function generateLaboratoryQueueId(client: PoolClient) {
  const { rows } = await client.query(
    `SELECT queue_id
     FROM queue_entries
     WHERE queue_id LIKE 'LAB-%'
     ORDER BY SPLIT_PART(queue_id, '-', 2)::int DESC
     LIMIT 1`,
  );

  const last = rows[0]?.queue_id;
  const nextNumber = last ? Number(last.split("-")[1]) + 1 : 1;

  return `LAB-${String(nextNumber).padStart(4, "0")}`;
}

export async function generateQueueNumberConsultation(client: PoolClient) {
  const { rows } = await client.query(
    `SELECT COALESCE(MAX(queue_number), 0) + 1 AS next
     FROM queue_entries
     WHERE queue_id LIKE 'CON-%'
       AND (created_at AT TIME ZONE 'Asia/Manila')::date =
           (NOW() AT TIME ZONE 'Asia/Manila')::date`,
  );

  return Number(rows[0].next);
}

export async function generateQueueNumberLaboratory(
  client: PoolClient,
  room: string,
) {
  const { rows } = await client.query(
    `SELECT COALESCE(MAX(qe.queue_number), 0) + 1 AS next
     FROM queue_entries qe
     WHERE qe.queue_id LIKE 'LAB-%'
       AND (qe.created_at AT TIME ZONE 'Asia/Manila')::date =
           (NOW() AT TIME ZONE 'Asia/Manila')::date
       AND EXISTS (
         SELECT 1
         FROM laboratory_request_items lri
         JOIN services s ON s.service_id = lri.service_id
         WHERE lri.queue_id = qe.queue_id
           AND s.room::text = $1
       )`,
    [room],
  );

  return Number(rows[0].next);
}

import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import type { PoolClient } from "@neondatabase/serverless";
import { ENV } from "../config/env.js";
import { connectNeon, pool } from "../config/db.js";
import { recomputeBillTotals } from "../utils/recomputeBills.js";

// Large synthetic dataset for local/demo testing. Does not change the schema.
// Every generated account has password: password.
// Run the base seed first so the service catalog and original accounts exist.
//
// Rows are written the way the app writes them, in the same order and with
// the same ID formats as utils/generateId.ts:
//   front desk registers the patient          P-YY-MMDD-NNNN
//   front desk opens a consultation            CR-YY-MMDD-NNNN + CONS-NNNN + open bill B-YY-MMDD-NNNN
//   doctor completes it, orders tests          LR-/LI-YY-MMDD-NNNN on the same open bill
//   doctor prescribes                          RX-NNNN
//   front desk takes payment                   bill Paid (R- invoice), tests forwarded to LAB-NNNN
//   lab collects, encodes, verifies, releases  RES-<uuid>
// Rerunning first removes the previous bulk-seed data (seed patients are the
// ones with an @patients.techcare.test email), including the old *-SEED-* rows.

const args = new Set(process.argv.slice(2));
const force = args.has("--force");
const PATIENT_COUNT = Number(process.env.SEED_PATIENTS ?? 500);
const STAFF_COUNT = Number(process.env.SEED_STAFF ?? 30);
const QUEUE_COUNT = Number(process.env.SEED_QUEUE_ENTRIES ?? 800);
const PATIENT_EMAIL_DOMAIN = "patients.techcare.test";

const firstNames = ["Maria", "Juan", "Angelica", "Roberto", "Liza", "Carlos", "Patricia", "Miguel", "Sofia", "Gabriel", "Andrea", "Paolo", "Camille", "Nathan", "Isabella", "Daniel", "Beatrice", "Marco", "Alyssa", "Enzo", "Jasmine", "Rafael", "Nicole", "Adrian", "Therese"];
const lastNames = ["Santos", "Dela Cruz", "Reyes", "Garcia", "Mendoza", "Bautista", "Villanueva", "Fernandez", "Navarro", "Torres", "Ramos", "Castillo", "Aquino", "Flores", "Gonzales", "Rivera", "Pascual", "Mercado", "Cruz", "Lim", "Domingo", "Ocampo", "Soriano", "Manalo", "Aguilar"];
const streets = ["M. Naval Street", "C-4 Road", "Leongson Street", "Estrella Street", "P. Sevilla Street", "Lapu-Lapu Street", "Pescador Street", "Bangus Street"];
const barangays = ["Bagumbayan North", "Bagumbayan South", "Bangculasi", "Daanghari", "Navotas East", "Navotas West", "San Jose", "San Roque", "Sipac-Almacen", "Tangos North", "Tangos South", "Tanza 1"];
const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const civilStatuses = ["Single", "Married", "Widowed", "Separated"];
const sexValues = ["Female", "Male"];
const complaints = ["Fever and body aches for three days", "Persistent dry cough for one week", "Recurring headache since last week", "Abdominal discomfort after meals", "Follow-up of blood pressure monitoring", "Itchy skin rashes on both arms", "Sore throat and difficulty swallowing", "Dizziness when standing up", "Easy fatigability for two weeks", "Routine health assessment for work"];
const diagnoses = ["Acute upper respiratory infection", "Essential hypertension", "Acute pharyngitis", "Gastroesophageal reflux disease", "Allergic rhinitis", "Viral syndrome", "Low back pain", "Type 2 diabetes mellitus", "Contact dermatitis", "Routine examination"];
const medicines = [
  { name: "Paracetamol 500 mg tablet", dosage: "1 tablet", frequency: "Every 6 hours as needed", duration: "5 days", instructions: "Take after meals" },
  { name: "Cetirizine 10 mg tablet", dosage: "1 tablet", frequency: "Once a day", duration: "7 days", instructions: "Take at bedtime" },
  { name: "Amoxicillin 500 mg capsule", dosage: "1 capsule", frequency: "Every 8 hours", duration: "7 days", instructions: "Finish the full course" },
  { name: "Omeprazole 20 mg capsule", dosage: "1 capsule", frequency: "Once a day", duration: "14 days", instructions: "Take before breakfast" },
  { name: "Metformin 500 mg tablet", dosage: "1 tablet", frequency: "Twice a day", duration: "30 days", instructions: "Take with meals" },
];
const paymentMethods = ["Cash", "Cash", "GCash", "Credit Card", "Debit Card"];

const pick = <T>(items: T[], index: number): T => items[index % items.length];
const pad = (n: number, width = 4) => String(n).padStart(width, "0");

// Server local time, the same clock the ID generators read.
function at(daysAgo: number, hour: number, minute = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date;
}
const plusMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60_000);
const dateOnly = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`;
const datePart = (d: Date) => `${String(d.getFullYear()).slice(-2)}-${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}`;

function personName(index: number) {
  return {
    first: pick(firstNames, index * 3 + 1),
    middle: pick(firstNames, index * 7 + 4),
    last: pick(lastNames, index * 5 + 2),
  };
}

// Hands out IDs and queue numbers that continue after whatever is already in
// the database, in the formats utils/generateId.ts produces.
function idAllocator(client: PoolClient) {
  const next = new Map<string, number>();
  async function take(key: string, query: string, params: unknown[]) {
    if (!next.has(key)) {
      const { rows } = await client.query(query, params);
      next.set(key, Number(rows[0]?.max ?? 0) + 1);
    }
    const value = next.get(key)!;
    next.set(key, value + 1);
    return value;
  }

  return {
    // U-, P-, CR-, LR-, LI-, B-: PREFIX-YY-MMDD-NNNN, numbered per day.
    async daily(prefix: string, table: string, column: string, date: Date) {
      const key = `${prefix}-${datePart(date)}`;
      const n = await take(
        key,
        `SELECT MAX(RIGHT(${column}, 4)::int) AS max FROM ${table} WHERE ${column} ~ $1`,
        [`^${key}-[0-9]{4}$`],
      );
      return `${key}-${pad(n)}`;
    },
    // CONS-, LAB-, RX-: one running number.
    async running(prefix: string, table: string, column: string) {
      const n = await take(
        prefix,
        `SELECT MAX(SPLIT_PART(${column}, '-', 2)::int) AS max FROM ${table} WHERE ${column} ~ $1`,
        [`^${prefix}-[0-9]+$`],
      );
      return `${prefix}-${pad(n)}`;
    },
    // Queue numbers restart every Manila day; the lab counts per room.
    consultationNumber(date: Date) {
      return take(
        `queue|consultation|${dateOnly(date)}`,
        `SELECT MAX(queue_number) AS max FROM queue_entries
         WHERE (queue_id LIKE 'CON-%' OR queue_id LIKE 'CONS-%')
           AND (created_at AT TIME ZONE 'Asia/Manila')::date = $1::date`,
        [dateOnly(date)],
      );
    },
    laboratoryNumber(date: Date, room: string) {
      return take(
        `queue|lab|${room}|${dateOnly(date)}`,
        `SELECT MAX(qe.queue_number) AS max FROM queue_entries qe
         WHERE qe.queue_id LIKE 'LAB-%'
           AND (qe.created_at AT TIME ZONE 'Asia/Manila')::date = $1::date
           AND EXISTS (
             SELECT 1 FROM test_request_items tri
             JOIN services s ON s.service_id = tri.service_id
             WHERE tri.queue_id = qe.queue_id AND s.room::text = $2
           )`,
        [dateOnly(date), room],
      );
    },
  };
}

// Removes the previous bulk-seed data: everything belonging to seed patients,
// plus rows from older versions of this script that used *-SEED-* IDs.
async function removePreviousSeed(client: PoolClient) {
  await client.query(`
    CREATE TEMP TABLE seed_patients ON COMMIT DROP AS
      SELECT patient_id FROM patients
      WHERE patient_id LIKE 'P-SEED-%' OR email LIKE '%@${PATIENT_EMAIL_DOMAIN}';
    CREATE TEMP TABLE seed_queues ON COMMIT DROP AS
      SELECT queue_id FROM queue_entries
      WHERE queue_id LIKE '%-SEED-%' OR patient_id IN (SELECT patient_id FROM seed_patients);
    CREATE TEMP TABLE seed_bills ON COMMIT DROP AS
      SELECT bill_id FROM bills
      WHERE bill_id LIKE 'B-SEED-%' OR patient_id IN (SELECT patient_id FROM seed_patients);
    CREATE TEMP TABLE seed_consults ON COMMIT DROP AS
      SELECT consultation_record_id FROM consultation_records
      WHERE consultation_record_id LIKE 'CR-SEED-%'
         OR patient_id IN (SELECT patient_id FROM seed_patients)
         OR queue_id IN (SELECT queue_id FROM seed_queues);
    CREATE TEMP TABLE seed_requests ON COMMIT DROP AS
      SELECT request_id FROM test_requests
      WHERE request_id LIKE 'LR-SEED-%'
         OR patient_id IN (SELECT patient_id FROM seed_patients)
         OR consultation_record_id IN (SELECT consultation_record_id FROM seed_consults);
    CREATE TEMP TABLE seed_items ON COMMIT DROP AS
      SELECT item_id FROM test_request_items
      WHERE item_id LIKE 'LI-SEED-%'
         OR request_id IN (SELECT request_id FROM seed_requests)
         OR bill_id IN (SELECT bill_id FROM seed_bills)
         OR queue_id IN (SELECT queue_id FROM seed_queues);
  `);

  const steps: [string, string][] = [
    ["lab results", `DELETE FROM test_results WHERE result_id LIKE 'RES-SEED-%' OR item_id IN (SELECT item_id FROM seed_items)`],
    ["lab items", `DELETE FROM test_request_items WHERE item_id IN (SELECT item_id FROM seed_items)`],
    ["prescriptions", `DELETE FROM prescription_records WHERE prescription_id LIKE 'RX-SEED-%' OR consultation_record_id IN (SELECT consultation_record_id FROM seed_consults)`],
    ["lab requests", `DELETE FROM test_requests WHERE request_id IN (SELECT request_id FROM seed_requests)`],
    ["consultations", `DELETE FROM consultation_records WHERE consultation_record_id IN (SELECT consultation_record_id FROM seed_consults)`],
    ["bills", `DELETE FROM bills WHERE bill_id IN (SELECT bill_id FROM seed_bills)`],
    ["queue entries", `DELETE FROM queue_entries WHERE queue_id IN (SELECT queue_id FROM seed_queues)`],
    ["notifications", `DELETE FROM notifications WHERE recipient_type = 'patient' AND recipient_id IN (SELECT patient_id FROM seed_patients)`],
    ["medical documents", `DELETE FROM medical_documents WHERE patient_id IN (SELECT patient_id FROM seed_patients)`],
    // Old versions invented queue.add/consultation.create rows the app never writes.
    ["activity logs", `DELETE FROM activity_logs WHERE metadata->>'synthetic' = 'true' OR target_id LIKE '%-SEED-%'`],
    ["patients", `DELETE FROM patients WHERE patient_id IN (SELECT patient_id FROM seed_patients)`],
    // Old U-SEED-* staff go too, unless real work still points at them.
    ["staff", `DELETE FROM users u WHERE u.user_id LIKE 'U-SEED-%'
       AND NOT EXISTS (SELECT 1 FROM bills WHERE received_by = u.user_id)
       AND NOT EXISTS (SELECT 1 FROM consultation_records WHERE u.user_id IN (requested_by, consulted_by))
       AND NOT EXISTS (SELECT 1 FROM prescription_records WHERE prescriber_id = u.user_id)
       AND NOT EXISTS (SELECT 1 FROM test_requests WHERE requested_by = u.user_id)
       AND NOT EXISTS (SELECT 1 FROM test_request_items WHERE processed_by = u.user_id)
       AND NOT EXISTS (SELECT 1 FROM form_templates WHERE created_by = u.user_id)
       AND NOT EXISTS (SELECT 1 FROM system_activity WHERE user_id = u.user_id)
       AND NOT EXISTS (SELECT 1 FROM activity_logs WHERE user_id = u.user_id)
       AND NOT EXISTS (SELECT 1 FROM medical_documents WHERE issued_by = u.user_id)`],
  ];
  const removed: Record<string, number> = {};
  for (const [label, query] of steps) {
    removed[label] = (await client.query(query)).rowCount ?? 0;
  }
  return removed;
}

// Same rule as utils/getOrCreateBill.ts: reuse the patient's open bill.
async function openBill(
  client: PoolClient,
  ids: ReturnType<typeof idAllocator>,
  patientId: string,
  at: Date,
) {
  const { rows } = await client.query(
    `SELECT bill_id FROM bills
     WHERE patient_id = $1
       AND LOWER(TRIM(status)) IN ('pending', 'unpaid')
       AND (items IS NULL OR jsonb_typeof(items) <> 'array' OR items = '[]'::jsonb)
     ORDER BY created_at, id
     LIMIT 1`,
    [patientId],
  );
  if (rows[0]) return rows[0].bill_id as string;

  const billId = await ids.daily("B", "bills", "bill_id", at);
  await client.query(
    `INSERT INTO bills (bill_id, patient_id, created_at, updated_at) VALUES ($1, $2, $3, $3)`,
    [billId, patientId, at],
  );
  return billId;
}

async function main() {
  if ((ENV.IS_PRODUCTION || ENV.NODE_ENV === "production") && !force) {
    throw new Error(
      "Refusing to seed production. Use --force only for the intended test database.",
    );
  }
  if (![PATIENT_COUNT, STAFF_COUNT, QUEUE_COUNT].every((n) => Number.isInteger(n) && n >= 0)) {
    throw new Error(
      "SEED_PATIENTS, SEED_STAFF and SEED_QUEUE_ENTRIES must be non-negative integers.",
    );
  }

  await connectNeon();
  const client = await pool.connect();
  const passwordHash = await bcrypt.hash("password", 10);

  try {
    await client.query("BEGIN");

    const removed = await removePreviousSeed(client);
    console.log("Removed previous bulk-seed rows:");
    console.table(removed);

    const ids = idAllocator(client);

    const { rows: services } = await client.query<{
      service_id: string;
      service_name: string;
      service_type: string;
      service_category: string;
      price: string;
      room: string;
      active: boolean;
    }>(
      `SELECT service_id, service_name, service_type, service_category, price, room, active
       FROM services ORDER BY service_id`,
    );
    if (services.length === 0) {
      throw new Error(
        "No services found. Run the base seed first: npx tsx src/scripts/seed.ts --reset --force",
      );
    }
    const consultationServices = services.filter(
      (s) => s.service_type.toLowerCase() === "consultation" && s.active,
    );
    const labServices = services.filter(
      (s) => s.service_type.toLowerCase() === "laboratory" && s.active && s.room?.trim(),
    );
    if (!consultationServices.length || !labServices.length) {
      throw new Error(
        "The service catalog must contain at least one active consultation and laboratory service.",
      );
    }

    // ========== Staff (admin -> User Management -> Add user) ==========
    for (let i = 1; i <= STAFF_COUNT; i++) {
      const roleGroup = i % 10;
      const role =
        roleGroup < 2 ? "admin" : roleGroup < 5 ? "doctor" : roleGroup < 8 ? "frontdesk-staff" : "laboratory-staff";
      const prefix =
        role === "admin" ? "admin" : role === "doctor" ? "doctor" : role === "frontdesk-staff" ? "fdstaff" : "labstaff";
      const username = `${prefix}${pad(i + 1, 2)}`;
      const exists = await client.query(`SELECT 1 FROM users WHERE username = $1`, [username]);
      if (exists.rows.length) continue;

      const name = personName(i + 9000);
      const hired = at(100 + i * 7, 9, i % 60);
      const userId = await ids.daily("U", "users", "user_id", hired);
      await client.query(
        `INSERT INTO users (user_id, username, password_hash, first_name, middle_name, last_name, sex, email, contact_number, address, birthdate, role, department, employment_status, date_hired, shift_start, shift_end, account_status, active, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Full-time',$14,'08:00','17:00',TRUE,FALSE,$15,$15)`,
        [
          userId,
          username,
          passwordHash,
          name.first,
          name.middle,
          name.last,
          i % 2 ? "Female" : "Male",
          `${username}@techcare.test`,
          `09${String(170000000 + i).slice(-9)}`,
          `${i + 1} ${pick(streets, i)}, Brgy. ${pick(barangays, i)}, Navotas City`,
          dateOnly(at(9000 + i * 97, 0)),
          role,
          role === "admin"
            ? "IT Administration"
            : role === "doctor"
              ? "Consultation Room"
              : role === "frontdesk-staff"
                ? "Front Desk"
                : pick(["Laboratory Room 1", "Laboratory Room 2"], i),
          dateOnly(hired),
          hired,
        ],
      );
    }

    const { rows: staff } = await client.query<{ user_id: string; role: string }>(
      `SELECT user_id, role FROM users
       WHERE role IN ('doctor','frontdesk-staff','laboratory-staff') AND account_status = TRUE
       ORDER BY user_id`,
    );
    const doctors = staff.filter((u) => u.role === "doctor");
    const frontDesk = staff.filter((u) => u.role === "frontdesk-staff");
    const labStaff = staff.filter((u) => u.role === "laboratory-staff");
    if (!doctors.length || !frontDesk.length || !labStaff.length) {
      throw new Error(
        "Base seed must include doctor, frontdesk-staff and laboratory-staff accounts.",
      );
    }

    // ========== Patients (front desk -> Patient Registration) ==========
    const patients: { id: string; registeredDaysAgo: number; height: number; weight: number }[] = [];
    for (let i = 1; i <= PATIENT_COUNT; i++) {
      const registeredDaysAgo = i % 25 === 0 ? 0 : (i * 37) % 365;
      const registeredAt = at(registeredDaysAgo, 8, (i * 11) % 60);
      const patientId = await ids.daily("P", "patients", "patient_id", registeredAt);
      const username = `patient${pad(i + 108, 3)}`;
      const name = personName(i);
      const height = 145 + (i % 45);
      const weight = 45 + (i % 55);
      patients.push({ id: patientId, registeredDaysAgo, height, weight });
      await client.query(
        `INSERT INTO patients (patient_id, username, password_hash, first_name, middle_name, last_name, sex, email, contact_number, guardian_name, guardian_relationship, guardian_contact, street, barangay, city, province, zip_code, birthdate, role, civil_status, blood_type, height_cm, weight_kg, account_status, active, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'Navotas City','Metro Manila','1485',$15,'patient',$16,$17,$18,$19,TRUE,FALSE,$20,$20)`,
        [
          patientId,
          username,
          passwordHash,
          name.first,
          name.middle,
          name.last,
          pick(sexValues, i),
          `${username}@${PATIENT_EMAIL_DOMAIN}`,
          `09${String(180000000 + i).slice(-9)}`,
          `${pick(firstNames, i + 3)} ${name.last}`,
          pick(["Mother", "Father", "Spouse", "Sibling"], i),
          `09${String(190000000 + i).slice(-9)}`,
          `${i + 1} ${pick(streets, i)}`,
          pick(barangays, i),
          dateOnly(at(6500 + (i % 15000), 0)),
          pick(civilStatuses, i),
          pick(bloodTypes, i),
          height,
          weight,
          registeredAt,
        ],
      );
    }

    // ========== Visits ==========
    let servingToday = false;
    for (let i = 1; i <= QUEUE_COUNT && patients.length; i++) {
      const patient = pick(patients, i * 13);
      const visitDaysAgo =
        i % 7 === 0 ? 0 : Math.floor((patient.registeredDaysAgo * ((i * 29) % 100)) / 100);
      const today = visitDaysAgo === 0;
      const startedAt = at(visitDaysAgo, 9 + (i % 8), (i * 7) % 60);
      const service = pick(consultationServices, i);
      const doctor = pick(doctors, i);
      const registrar = pick(frontDesk, i);
      const labUser = pick(labStaff, i);
      const isPriority = i % 11 === 0;

      // Past visits have finished; today's are spread over the queue states.
      let outcome = today
        ? pick(["Completed", "waiting", "Serving", "skipped", "Cancelled", "waiting"], i)
        : pick(["Completed", "Completed", "Completed", "Completed", "Cancelled"], i);
      if (outcome === "Serving") {
        if (servingToday) outcome = "waiting";
        servingToday = true;
      }
      const completed = outcome === "Completed";

      // ---- Front desk: Service Request -> Consultation ----
      const billId = await openBill(client, ids, patient.id, startedAt);
      const consultationId = await ids.daily("CR", "consultation_records", "consultation_record_id", startedAt);
      const queueId = await ids.running("CONS", "queue_entries", "queue_id");
      const queueNumber = await ids.consultationNumber(startedAt);
      const finishedAt = plusMinutes(startedAt, 25 + (i % 20));

      await client.query(
        `INSERT INTO queue_entries (queue_id, patient_id, queue_number, is_priority, status, skip_count, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [queueId, patient.id, queueNumber, isPriority, outcome, outcome === "skipped" ? 1 : 0, startedAt, outcome === "waiting" ? startedAt : finishedAt],
      );

      const frontDeskVitals = {
        temperature: String((36.3 + (i % 15) / 10).toFixed(1)),
        height: String(patient.height),
        weight: String(patient.weight),
      };
      const doctorVitals = {
        bloodPressure: `${110 + (i % 30)}/${70 + (i % 20)}`,
        heartRate: String(65 + (i % 35)),
        respiratoryRate: String(14 + (i % 8)),
        bloodOxygen: String(95 + (i % 5)),
      };

      await client.query(
        `INSERT INTO consultation_records
           (consultation_record_id, patient_id, service_id, requested_by, queue_id, status, cancellation_reason, bill_id,
            vital_signs, consulted_by, consultation_type, diagnosis, presenting_complaint, physical_examination, notes,
            requested_at, consulted_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12::jsonb,$13::jsonb,$14::jsonb,$15,$16,$17)`,
        [
          consultationId,
          patient.id,
          service.service_id,
          registrar.user_id,
          queueId,
          completed ? "Completed" : outcome === "Cancelled" ? "Cancelled" : "In Queue",
          outcome === "Cancelled" ? "Patient left before being called" : null,
          billId,
          JSON.stringify(completed ? { ...frontDeskVitals, ...doctorVitals } : frontDeskVitals),
          completed ? doctor.user_id : null,
          i % 4 === 0 ? "Follow-up" : "Initial",
          completed ? JSON.stringify([{ diagnosis: pick(diagnoses, i), type: "Primary" }]) : null,
          completed ? JSON.stringify({ hpi: pick(complaints, i) }) : null,
          completed
            ? JSON.stringify({
                general_appearance: "Awake, coherent, not in distress",
                heent: "Anicteric sclerae, pink palpebral conjunctivae",
                cardiovascular: "Regular rate and rhythm, no murmurs",
                respiratory: "Clear breath sounds",
                abdomen: "Soft, non-tender",
                extremities: "No edema",
              })
            : null,
          completed ? "Advised to return if symptoms persist." : null,
          startedAt,
          completed ? finishedAt : null,
        ],
      );
      await client.query(
        `UPDATE patients SET height_cm = $2, weight_kg = $3 WHERE patient_id = $1`,
        [patient.id, patient.height, patient.weight],
      );

      // ---- Doctor: Laboratory Request (on the same open bill) ----
      const labItems: { itemId: string; service: (typeof labServices)[number] }[] = [];
      let requestId: string | null = null;
      if (completed && i % 2 === 0) {
        const requestedAt = plusMinutes(finishedAt, -5);
        requestId = await ids.daily("LR", "test_requests", "request_id", requestedAt);
        await client.query(
          `INSERT INTO test_requests (request_id, patient_id, consultation_record_id, requested_by, is_priority, request_date, estimated_release_date, requested_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
          [requestId, patient.id, consultationId, doctor.user_id, isPriority, dateOnly(requestedAt), dateOnly(at(visitDaysAgo - 1, 0)), requestedAt],
        );
        const chosen = [pick(labServices, i * 3), pick(labServices, i * 3 + 1)].slice(0, i % 3 === 0 ? 2 : 1);
        for (const labService of new Set(chosen)) {
          const itemId = await ids.daily("LI", "test_request_items", "item_id", requestedAt);
          await client.query(
            `INSERT INTO test_request_items (item_id, request_id, service_id, status, bill_id, created_at, updated_at)
             VALUES ($1,$2,$3,'Requested',$4,$5,$5)`,
            [itemId, requestId, labService.service_id, billId, requestedAt],
          );
          labItems.push({ itemId, service: labService });
        }
      }

      // ---- Doctor: Prescription ----
      if (completed && i % 3 === 0) {
        const prescriptionId = await ids.running("RX", "prescription_records", "prescription_id");
        await client.query(
          `INSERT INTO prescription_records (prescription_id, consultation_record_id, patient_id, prescriber_id, prescribed_at, valid_until, prescription_items)
           VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
          [
            prescriptionId,
            consultationId,
            patient.id,
            doctor.user_id,
            finishedAt,
            dateOnly(at(visitDaysAgo - 30, 0)),
            JSON.stringify([pick(medicines, i), ...(i % 2 ? [] : [pick(medicines, i + 2)])]),
          ],
        );
      }

      await recomputeBillTotals(client, billId);

      // ---- Front desk: Billing -> Confirm payment ----
      const pays = completed && !(today && i % 4 === 0);
      if (!pays) continue;

      const paidAt = plusMinutes(finishedAt, 10);
      const method = pick(paymentMethods, i);
      const { rows: lines } = await client.query(
        `SELECT 'consultation'::text AS line_type, cr.consultation_record_id AS item_id, NULL::text AS request_id,
                cr.service_id, s.service_name, s.service_category, s.price::float AS price, 1 AS quantity
         FROM consultation_records cr JOIN services s ON s.service_id = cr.service_id
         WHERE cr.bill_id = $1 AND LOWER(TRIM(cr.status)) NOT IN ('cancelled','canceled','rejected')
         UNION ALL
         SELECT 'laboratory', MIN(tri.item_id), tri.request_id, tri.service_id, s.service_name, s.service_category, s.price::float, COUNT(*)::int
         FROM test_request_items tri JOIN services s ON s.service_id = tri.service_id
         WHERE tri.bill_id = $1 AND LOWER(TRIM(tri.status)) NOT IN ('cancelled','canceled','rejected')
         GROUP BY tri.request_id, tri.service_id, s.service_name, s.service_category, s.price`,
        [billId],
      );
      await client.query(
        `UPDATE bills
         SET status = 'Paid', payment_method = $2, reference_num = $3,
             items = $4::jsonb, invoice_id = $5, paid_at = $6, billed_at = $6, invoice_issued_at = $6,
             received_by = $7, updated_at = $6
         WHERE bill_id = $1`,
        [
          billId,
          method,
          method === "Cash" ? null : String(1_000_000_000_000 + i * 7919).slice(-13),
          JSON.stringify(lines.map((line) => ({ ...line, package_id: null, components: [] }))),
          `R-${randomUUID().slice(0, 12).toUpperCase()}`,
          paidAt,
          registrar.user_id,
        ],
      );
      if (requestId) {
        await client.query(
          `UPDATE test_requests SET status = 'Paid', updated_at = $2 WHERE request_id = $1`,
          [requestId, paidAt],
        );
      }

      // Paid tests are forwarded to a LAB- queue per room.
      const rooms = new Map<string, typeof labItems>();
      for (const item of labItems) {
        rooms.set(item.service.room, [...(rooms.get(item.service.room) ?? []), item]);
      }
      for (const [room, items] of rooms) {
        const labQueueId = await ids.running("LAB", "queue_entries", "queue_id");
        const labQueueNumber = await ids.laboratoryNumber(paidAt, room);
        const labDoneAt = plusMinutes(paidAt, 90);
        await client.query(
          `INSERT INTO queue_entries (queue_id, patient_id, queue_number, is_priority, status, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [labQueueId, patient.id, labQueueNumber, isPriority, today ? "Waiting" : "Completed", paidAt, today ? paidAt : labDoneAt],
        );

        for (const { itemId } of items) {
          await client.query(
            `UPDATE test_request_items
             SET queue_id = $2, status = $3, processed_by = $4, updated_at = $5
             WHERE item_id = $1`,
            [itemId, labQueueId, today ? "Waiting" : "Completed", today ? null : labUser.user_id, today ? paidAt : labDoneAt],
          );
          if (today) continue;

          // Lab: encode -> verify -> release.
          await client.query(
            `INSERT INTO test_results (result_id, item_id, results, status, remarks, verified_by, verified_at, released_at, released_by, created_at, updated_at)
             VALUES ($1,$2,$3::jsonb,'Released',$4,$5,$6,$7,$5,$8,$7)`,
            [
              `RES-${randomUUID()}`,
              itemId,
              JSON.stringify([
                { name: "WBC", result: (6.4 + (i % 30) / 10).toFixed(1), unit: "10^9/L", reference_range: "4.0-11.0" },
                { name: "RBC", result: (4.5 + (i % 10) / 10).toFixed(2), unit: "10^12/L", reference_range: "4.0-5.5" },
                { name: "HEMOGLOBIN", result: (13 + (i % 20) / 10).toFixed(1), unit: "g/dL", reference_range: "12.0-17.5" },
                { name: "PLATELETS", result: String(250 + (i % 100)), unit: "10^9/L", reference_range: "150-400" },
              ]),
              "Within normal limits.",
              labUser.user_id,
              plusMinutes(labDoneAt, 20),
              plusMinutes(labDoneAt, 40),
              labDoneAt,
            ],
          );
        }
      }
    }

    await client.query("COMMIT");

    const { rows } = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM patients) AS patients,
        (SELECT COUNT(*) FROM queue_entries) AS queue_entries,
        (SELECT COUNT(*) FROM consultation_records) AS consultations,
        (SELECT COUNT(*) FROM prescription_records) AS prescriptions,
        (SELECT COUNT(*) FROM test_requests) AS lab_requests,
        (SELECT COUNT(*) FROM test_request_items) AS lab_items,
        (SELECT COUNT(*) FROM test_results) AS lab_results,
        (SELECT COUNT(*) FROM bills) AS bills
    `);
    console.log("Bulk seed complete. All generated passwords are 'password'.");
    console.table(rows[0]);
    console.log("Counts are configurable with SEED_PATIENTS, SEED_STAFF and SEED_QUEUE_ENTRIES.");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Bulk seeding failed:", error);
  process.exit(1);
});

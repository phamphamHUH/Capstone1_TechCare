import bcrypt from "bcryptjs";
import { ENV } from "../config/env.js";
import { connectNeon, pool } from "../config/db.js";

// Large synthetic dataset for local/demo testing. Does not change the schema.
// Every generated account has password: password.
// Run the base seed first so the service catalog and original accounts exist.

const args = new Set(process.argv.slice(2));
const force = args.has("--force");
const PATIENT_COUNT = Number(process.env.SEED_PATIENTS ?? 500);
const STAFF_COUNT = Number(process.env.SEED_STAFF ?? 30);
const QUEUE_COUNT = Number(process.env.SEED_QUEUE_ENTRIES ?? 800);

const firstNames = [
  "Maria",
  "Juan",
  "Angelica",
  "Roberto",
  "Liza",
  "Carlos",
  "Patricia",
  "Miguel",
  "Sofia",
  "Gabriel",
  "Andrea",
  "Paolo",
  "Camille",
  "Nathan",
  "Isabella",
  "Daniel",
  "Beatrice",
  "Marco",
  "Alyssa",
  "Enzo",
  "Jasmine",
  "Rafael",
  "Nicole",
  "Adrian",
  "Therese",
];
const lastNames = [
  "Santos",
  "Dela Cruz",
  "Reyes",
  "Garcia",
  "Mendoza",
  "Bautista",
  "Villanueva",
  "Fernandez",
  "Navarro",
  "Torres",
  "Ramos",
  "Castillo",
  "Aquino",
  "Flores",
  "Gonzales",
  "Rivera",
  "Pascual",
  "Mercado",
  "Cruz",
  "Lim",
  "Domingo",
  "Ocampo",
  "Soriano",
  "Manalo",
  "Aguilar",
];
const streets = [
  "Rizal Street",
  "Mabini Avenue",
  "Bonifacio Street",
  "Sampaguita Street",
  "J.P. Rizal Avenue",
  "Sumulong Highway",
  "Marcos Highway",
  "Aurora Boulevard",
];
const barangays = [
  "Concepcion Uno",
  "San Roque",
  "Sta. Elena",
  "Nangka",
  "Tumana",
  "Parang",
  "Marikina Heights",
  "Calumpang",
  "Sto. Niño",
  "Industrial Valley",
];
const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const civilStatuses = ["Single", "Married", "Widowed", "Separated"];
const sexValues = ["Female", "Male"];
const consultationComplaints = [
  "Fever and body aches",
  "Persistent cough",
  "Headache",
  "Abdominal discomfort",
  "Follow-up consultation",
  "Skin irritation",
  "Sore throat",
  "Dizziness",
  "Fatigue",
  "Routine health assessment",
];
const diagnoses = [
  "Acute upper respiratory infection",
  "Essential hypertension",
  "Acute pharyngitis",
  "Gastroesophageal reflux",
  "Allergic rhinitis",
  "Viral syndrome",
  "Low back pain",
  "Type 2 diabetes mellitus",
  "Dermatitis",
  "Routine examination",
];
const statuses = [
  "Completed",
  "Completed",
  "Completed",
  "Waiting",
  "Serving",
  "Skipped",
  "Cancelled",
];
const paymentMethods = ["Cash", "GCash", "Credit Card", "Debit Card"];

function pick<T>(items: T[], index: number): T {
  return items[index % items.length];
}
function dateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}
function timestampDaysAgo(days: number, hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, (days * 7) % 60, 0, 0);
  return date.toISOString().slice(0, 19).replace("T", " ");
}
function makeId(prefix: string, number: number, width = 6): string {
  return `${prefix}-${String(number).padStart(width, "0")}`;
}
function personName(index: number) {
  return {
    first: pick(firstNames, index * 3 + 1),
    middle: pick(firstNames, index * 7 + 4),
    last: pick(lastNames, index * 5 + 2),
  };
}

async function main() {
  if ((ENV.IS_PRODUCTION || ENV.NODE_ENV === "production") && !force) {
    throw new Error(
      "Refusing to seed production. Use --force only for the intended test database.",
    );
  }
  if (
    ![PATIENT_COUNT, STAFF_COUNT, QUEUE_COUNT].every(
      (n) => Number.isInteger(n) && n >= 0,
    )
  ) {
    throw new Error(
      "SEED_PATIENTS, SEED_STAFF and SEED_QUEUE_ENTRIES must be non-negative integers.",
    );
  }

  await connectNeon();
  const client = await pool.connect();
  const passwordHash = await bcrypt.hash("password", 10);

  try {
    await client.query("BEGIN");

    const serviceResult = await client.query<{
      service_id: string;
      service_name: string;
      service_type: string;
      price: string;
      room: string;
      active: boolean;
    }>(
      `SELECT service_id, service_name, service_type, price, room, active FROM services ORDER BY service_id`,
    );
    if (serviceResult.rows.length === 0) {
      throw new Error(
        "No services found. Run the base seed first: npx tsx src/scripts/seed.ts --reset --force",
      );
    }
    const services = serviceResult.rows;
    const consultationServices = services.filter(
      (s) => s.service_type.toLowerCase() === "consultation" && s.active,
    );
    const labServices = services.filter(
      (s) => s.service_type.toLowerCase() === "laboratory" && s.active,
    );
    if (!consultationServices.length || !labServices.length) {
      throw new Error(
        "The service catalog must contain at least one active consultation and laboratory service.",
      );
    }

    const staff = await client.query<{ user_id: string; role: string }>(
      `SELECT user_id, role FROM users WHERE role IN ('admin','doctor','frontdesk-staff','laboratory-staff') ORDER BY user_id`,
    );
    if (staff.rows.length === 0)
      throw new Error("No staff accounts found. Run the base seed first.");
    const doctors = staff.rows.filter((u) => u.role === "doctor");
    const frontDesk = staff.rows.filter((u) => u.role === "frontdesk-staff");
    const labStaff = staff.rows.filter((u) => u.role === "laboratory-staff");
    if (!doctors.length || !frontDesk.length || !labStaff.length) {
      throw new Error(
        "Base seed must include doctor, frontdesk-staff and laboratory-staff accounts.",
      );
    }

    // Create additional staff accounts using predictable usernames.
    for (let i = 1; i <= STAFF_COUNT; i++) {
      const roleGroup = i % 10;
      const role =
        roleGroup < 2
          ? "admin"
          : roleGroup < 5
            ? "doctor"
            : roleGroup < 8
              ? "frontdesk-staff"
              : "laboratory-staff";
      const username =
        role === "admin"
          ? `admin${String(i + 1).padStart(2, "0")}`
          : role === "doctor"
            ? `doctor${String(i + 1).padStart(2, "0")}`
            : role === "frontdesk-staff"
              ? `fdstaff${String(i + 1).padStart(2, "0")}`
              : `labstaff${String(i + 1).padStart(2, "0")}`;
      const name = personName(i + 9000);
      const email = `${username}@techcare.test`;
      const userId = `U-SEED-${String(i).padStart(6, "0")}`;
      await client.query(
        `INSERT INTO users (user_id, username, password_hash, first_name, middle_name, last_name, sex, email, contact_number, address, birthdate, role, department, employment_status, date_hired, shift_start, shift_end, account_status, active, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'active',$14,'08:00','17:00',TRUE,TRUE,NOW(),NOW())
         ON CONFLICT DO NOTHING`,
        [
          userId,
          username,
          passwordHash,
          name.first,
          name.middle,
          name.last,
          i % 2 ? "Female" : "Male",
          email,
          `09${String(170000000 + i).slice(-9)}`,
          `${i + 1} ${pick(streets, i)}, Brgy. ${pick(barangays, i)}, Marikina City`,
          dateDaysAgo(9000 + (i % 10000)),
          role,
          role === "admin"
            ? "IT Administration"
            : role === "doctor"
              ? pick(["Internal Medicine", "Family Medicine", "Pediatrics"], i)
              : role === "frontdesk-staff"
                ? "Front Desk"
                : "Laboratory",
          dateDaysAgo(100 + i),
        ],
      );
    }

    // Add synthetic patient accounts. Patient identifiers and usernames are stable on reruns.
    const patientIds: string[] = [];
    for (let i = 1; i <= PATIENT_COUNT; i++) {
      const patientId = `P-SEED-${String(i).padStart(6, "0")}`;
      const username = `patient${String(i + 108).padStart(3, "0")}`;
      const name = personName(i);
      patientIds.push(patientId);
      await client.query(
        `INSERT INTO patients (patient_id, username, password_hash, first_name, middle_name, last_name, sex, email, contact_number, guardian_name, guardian_contact, street, barangay, city, province, zip_code, birthdate, role, civil_status, blood_type, account_status, active, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Marikina City','Metro Manila','1800',$14,'patient',$15,$16,TRUE,FALSE,NOW(),NOW())
         ON CONFLICT DO NOTHING`,
        [
          patientId,
          username,
          passwordHash,
          name.first,
          name.middle,
          name.last,
          pick(sexValues, i),
          `${username}@patients.techcare.test`,
          `09${String(180000000 + i).slice(-9)}`,
          `${pick(firstNames, i + 3)} ${name.last}`,
          `09${String(190000000 + i).slice(-9)}`,
          `${i + 1} ${pick(streets, i)}`,
          pick(barangays, i),
          dateDaysAgo(6500 + (i % 15000)),
          pick(civilStatuses, i),
          pick(bloodTypes, i),
        ],
      );
    }

    // Include original patients as well as generated patients, so records can be linked to both.
    const allPatientsResult = await client.query<{ patient_id: string }>(
      `SELECT patient_id FROM patients ORDER BY patient_id`,
    );
    const allPatientIds = allPatientsResult.rows.map((row) => row.patient_id);
    const queueIds: string[] = [];
    const consultationIds: string[] = [];
    const requestIds: string[] = [];
    const labItemIds: string[] = [];

    for (let i = 1; i <= QUEUE_COUNT; i++) {
      const patientId = pick(allPatientIds, i * 13);
      const consultationService = pick(consultationServices, i);
      const labService = pick(labServices, i * 3);
      const doctor = pick(doctors, i);
      const registrar = pick(frontDesk, i);
      const labUser = pick(labStaff, i);
      const daysAgo = i % 7 === 0 ? 0 : i % 90;
      const createdAt = timestampDaysAgo(daysAgo, 8 + (i % 8));
      const queueId = `CON-SEED-${String(i).padStart(6, "0")}`;
      const queueNumber = ((i - 1) % 80) + 1;
      const queueStatus = pick(statuses, i);
      queueIds.push(queueId);

      await client.query(
        `INSERT INTO queue_entries (queue_id, patient_id, queue_number, is_priority, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        [
          queueId,
          patientId,
          queueNumber,
          i % 11 === 0,
          queueStatus,
          createdAt,
          createdAt,
        ],
      );

      const consultationId = `CR-SEED-${String(i).padStart(6, "0")}`;
      consultationIds.push(consultationId);
      const isCompleted = ["Completed", "completed"].includes(queueStatus);
      await client.query(
        `INSERT INTO consultation_records (consultation_record_id, patient_id, service_id, queue_id, status, is_paid, requested_by, consulted_by, consultation_type, diagnosis, presenting_complaint, vital_signs, physical_examination, notes, requested_at, consulted_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14,$15,$16)
         ON CONFLICT DO NOTHING`,
        [
          consultationId,
          patientId,
          consultationService.service_id,
          queueId,
          isCompleted ? "Completed" : "Created",
          i % 4 !== 0,
          registrar.user_id,
          isCompleted ? doctor.user_id : null,
          i % 4 === 0 ? "Follow-up" : "Initial",
          JSON.stringify({
            code: `DX-${String((i % 10) + 1).padStart(3, "0")}`,
            description: pick(diagnoses, i),
          }),
          JSON.stringify({
            complaint: pick(consultationComplaints, i),
            duration: `${(i % 7) + 1} day(s)`,
          }),
          JSON.stringify({
            bloodPressure: `${110 + (i % 30)}/${70 + (i % 20)}`,
            temperature: Number((36.3 + (i % 15) / 10).toFixed(1)),
            pulseRate: 65 + (i % 35),
            respiratoryRate: 14 + (i % 8),
            oxygenSaturation: 95 + (i % 5),
            weightKg: 45 + (i % 65),
            heightCm: 145 + (i % 45),
          }),
          JSON.stringify({
            generalAppearance: "Awake, coherent, and ambulatory",
            findings: "Synthetic demo record; clinical review required.",
          }),
          "Synthetic demo data generated for TechCare testing.",
          createdAt,
          isCompleted
            ? timestampDaysAgo(Math.max(0, daysAgo), 9 + (i % 7))
            : null,
        ],
      );

      if (i % 3 === 0) {
        const prescriptionId = `RX-SEED-${String(i).padStart(6, "0")}`;
        await client.query(
          `INSERT INTO prescription_records (prescription_id, consultation_record_id, patient_id, prescriber_id, prescribed_at, valid_until, status, prescription_items, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9) ON CONFLICT DO NOTHING`,
          [
            prescriptionId,
            consultationId,
            patientId,
            doctor.user_id,
            createdAt,
            dateDaysAgo(daysAgo - 14),
            isCompleted ? "Active" : "Draft",
            JSON.stringify([
              {
                medicine: pick(
                  [
                    "Paracetamol",
                    "Cetirizine",
                    "Amoxicillin",
                    "Omeprazole",
                    "Metformin",
                  ],
                  i,
                ),
                dosage: "As directed by attending clinician",
                frequency: "As prescribed",
                duration: "5 days",
                quantity: 10,
              },
            ]),
            "Synthetic demo prescription; not for actual patient care.",
          ],
        );
      }

      if (i % 2 === 0) {
        const requestId = `LR-SEED-${String(i).padStart(6, "0")}`;
        const labItemId = `LI-SEED-${String(i).padStart(6, "0")}`;
        requestIds.push(requestId);
        labItemIds.push(labItemId);
        const labStatus =
          i % 6 === 0 ? "Completed" : i % 4 === 0 ? "Processing" : "Requested";
        await client.query(
          `INSERT INTO test_requests (request_id, consultation_record_id, patient_id, requested_by, status, is_priority, request_date, estimated_release_date, requested_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) ON CONFLICT DO NOTHING`,
          [
            requestId,
            consultationId,
            patientId,
            doctor.user_id,
            labStatus,
            i % 13 === 0,
            dateDaysAgo(daysAgo),
            dateDaysAgo(Math.max(0, daysAgo - 1)),
            createdAt,
          ],
        );
        await client.query(
          `INSERT INTO test_request_items (item_id, request_id, service_id, processed_by, queue_id, status, reason, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,'None',$7,$7) ON CONFLICT DO NOTHING`,
          [
            labItemId,
            requestId,
            labService.service_id,
            i % 6 === 0 ? labUser.user_id : null,
            queueId,
            labStatus,
            createdAt,
          ],
        );
        if (i % 6 === 0) {
          const resultId = `RES-SEED-${String(i).padStart(6, "0")}`;
          const resultRows = [
            {
              name: "WBC",
              result: 6.4 + (i % 30) / 10,
              unit: "10^9/L",
              reference_range: "4.0-11.0",
            },
            {
              name: "RBC",
              result: 4.5 + (i % 10) / 10,
              unit: "10^12/L",
              reference_range: "4.0-5.5",
            },
            {
              name: "HEMOGLOBIN",
              result: 13 + (i % 20) / 10,
              unit: "g/dL",
              reference_range: "12.0-17.5",
            },
            {
              name: "PLATELETS",
              result: 250 + (i % 100),
              unit: "10^9/L",
              reference_range: "150-400",
            },
          ];
          await client.query(
            `INSERT INTO test_results (result_id, item_id, results, status, remarks, verified_by, verified_at, created_at, updated_at)
             VALUES ($1,$2,$3::jsonb,'Released',$4,$5,$6,$6,$6) ON CONFLICT DO NOTHING`,
            [
              resultId,
              labItemId,
              JSON.stringify(resultRows),
              "Synthetic demo results; not for clinical use.",
              labUser.user_id,
              timestampDaysAgo(daysAgo, 15),
            ],
          );
        }
      }

      if (i % 2 === 1) {
        const billId = `B-SEED-${String(i).padStart(6, "0")}`;
        const items = [
          {
            service_id: consultationService.service_id,
            service_name: consultationService.service_name,
            price: Number(consultationService.price),
            quantity: 1,
          },
        ];
        const total = Number(consultationService.price);
        const paid = i % 5 !== 0;
        await client.query(
          `INSERT INTO bills (bill_id, patient_id, items, discount_rate, total_amount, payment_method, status, invoice_id, created_at, invoice_issued_at, billed_at)
           VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10,$9) ON CONFLICT DO NOTHING`,
          [
            billId,
            patientId,
            JSON.stringify(items),
            i % 4 === 0 ? 10 : 0,
            total * (i % 4 === 0 ? 0.9 : 1),
            pick(paymentMethods, i),
            paid ? "Paid" : "Unpaid",
            paid ? `RCPT-SEED-${String(i).padStart(6, "0")}` : null,
            createdAt,
            paid ? createdAt : null,
          ],
        );
      }

      // Lightweight audit activity mirrors the app's user/action/target structure.
      if (i % 5 === 0) {
        const action = await client.query<{ action_id: number }>(
          `SELECT action_id FROM actions WHERE action_name = $1 LIMIT 1`,
          [i % 10 === 0 ? "queue.add" : "consultation.create"],
        );
        if (action.rows[0]) {
          await client.query(
            `INSERT INTO activity_logs (user_id, action_id, status, target_type, target_id, metadata, created_at)
             VALUES ($1,$2,'success',$3,$4,$5::jsonb,$6)`,
            [
              registrar.user_id,
              action.rows[0].action_id,
              i % 10 === 0 ? "queue_entry" : "consultation_record",
              i % 10 === 0 ? queueId : consultationId,
              JSON.stringify({ synthetic: true, patient_id: patientId }),
              createdAt,
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
        (SELECT COUNT(*) FROM services) AS services,
        (SELECT COUNT(*) FROM queue_entries) AS queue_entries,
        (SELECT COUNT(*) FROM consultation_records) AS consultations,
        (SELECT COUNT(*) FROM prescription_records) AS prescriptions,
        (SELECT COUNT(*) FROM test_requests) AS lab_requests,
        (SELECT COUNT(*) FROM test_request_items) AS lab_items,
        (SELECT COUNT(*) FROM test_results) AS lab_results,
        (SELECT COUNT(*) FROM bills) AS bills,
        (SELECT COUNT(*) FROM activity_logs) AS activity_logs
    `);
    console.log("Bulk seed complete. All generated passwords are 'password'.");
    console.table(rows[0]);
    console.log(
      "Counts are configurable with SEED_PATIENTS, SEED_STAFF and SEED_QUEUE_ENTRIES.",
    );
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

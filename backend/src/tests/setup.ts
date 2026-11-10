import { beforeAll, afterEach } from "vitest";
import { connectNeon, sql } from "../config/db.js";

beforeAll(async () => {
  await connectNeon();
});

const TABLES = [
  "users",
  "patients",
  "services",
  "queue_entries",
  "consultation_records",
  "lab_requests",
  "test_request_items",
  "test_results",
  "bills",
  "activity_logs",
  "actions",
  "system_activity",
  "packages",
];

afterEach(async () => {
  await sql.query(
    `TRUNCATE TABLE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`,
  );
});

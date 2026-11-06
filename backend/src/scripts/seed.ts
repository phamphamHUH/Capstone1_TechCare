
import fs from "node:fs";
import { ENV } from "../config/env.js";
import { connectNeon, pool } from "../config/db.js";

// Usage:
//   npm run seed
//   npm run seed:reset -- --force
//   npx tsx src/scripts/seed.ts --reset --force

const args = new Set(process.argv.slice(2));
const reset = args.has("--reset");
const force = args.has("--force");

const WIPE = `
  TRUNCATE activity_logs, actions, system_activity, bills, laboratory_results,
           form_components, form_templates, form_component_types,
           laboratory_request_items, laboratory_requests, prescription_records,
           consultation_records, queue_entries, services, patients, users
  RESTART IDENTITY CASCADE;
`;

async function main() {
  if ((ENV.IS_PRODUCTION || ENV.NODE_ENV === "production") && !force) {
    console.error(
      "Refusing to seed a production environment. " +
        "Re-run with --force if you really mean it."
    );
    process.exit(1);
  }

  const seedSql = fs.readFileSync(
    new URL("../seed/seed.sql", import.meta.url),
    "utf8"
  );

  console.log("Ensuring tables exist...");
  await connectNeon();

  const client = await pool.connect();

  try {
    if (reset) {
      console.log("Wiping existing data...");
      await client.query(WIPE);
    }

    console.log("Inserting seed data...");
    await client.query(seedSql);

    const { rows } = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM patients) AS patients,
        (SELECT COUNT(*) FROM services) AS services,
        (SELECT COUNT(*) FROM queue_entries) AS queue_entries,
        (SELECT COUNT(*) FROM consultation_records) AS consultations,
        (SELECT COUNT(*) FROM laboratory_requests) AS lab_requests,
        (SELECT COUNT(*) FROM bills) AS bills
    `);

    console.log("Done. Row counts:", rows[0]);
    console.log("\nLogin with the accounts listed in seed.sql. Every password is: password");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});

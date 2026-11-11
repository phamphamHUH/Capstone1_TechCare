---
name: techcare-database-schema
description: Complete Neon Postgres schema reference for TechCare - all 18 tables with every column, foreign keys, status values, JSONB shapes, the billing model, code vs live database drift, and how the schema is managed (TABLES, connectNeon, syncSchema). Use when changing tables, adding columns, writing SQL, debugging "column does not exist", schema drift, data lost after deploy, writing transactions, date or timezone filters, billing tables, seeding data, or choosing between the current schema sync and the MVP migrations approach.
---

# Database & Schema

Verified against `backend/src/config/db.ts` and the live database on 2026-11-07. `TABLES` in `db.ts` is the source of truth for the wanted schema, but an existing database can differ from it (see [Drift](#drift-code-vs-live-database)). There is no ORM and there are no migration files.

## Clients (`config/db.ts`)
```ts
export const sql = neon(ENV.DATABASE_URL);                            // HTTP, one statement (or sql.transaction([...]))
export const pool = new Pool({ connectionString: ENV.DATABASE_URL }); // WebSocket, BEGIN/COMMIT, advisory locks
```
On Node < 22 set `neonConfig.webSocketConstructor = ws` before creating the Pool.

| Need | Use |
|---|---|
| single read/write | `sql\`...\`` |
| several statements known upfront | `sql.transaction([sql\`...\`, sql\`...\`])` |
| step B depends on result of step A in JS, or advisory lock | `pool.connect()` + BEGIN/COMMIT + `finally { client.release() }` |
| multi-table insert with no JS in between | one CTE statement (atomic over HTTP) |

Always parameterize. Never interpolate user input into identifiers.

## Conventions
- Primary key is `id SERIAL`, except `actions.action_id` and `sse_test.message_id`.
- Foreign keys point at the **string business IDs** (`patient_id`, `user_id`), not the serial. The exception is `activity_logs.action_id`, an INTEGER that refers to `actions.action_id` with no FK.
- Users and patients are separate tables; the column is `password_hash`.
- Timestamps are **`TIMESTAMPTZ`** (all 34 columns converted from `TIMESTAMP` on 2026-11-12). See [Time zones](#time-zones).
- Statuses are plain `VARCHAR` with no CHECK constraint, so casing varies. Compare with `LOWER(TRIM(status))`.
- There are no secondary indexes: only the primary key and UNIQUE indexes exist.
- `DECIMAL`/`NUMERIC` columns come back as strings: `Number(row.total_amount)`.

## Tables

18 tables. Unless a column says `NOT NULL`, it is nullable. `TS` = `TIMESTAMPTZ`, `V` = `VARCHAR`, `now` = `DEFAULT CURRENT_TIMESTAMP`. Every `created_at`/`updated_at` listed is `TS NOT NULL now`.

### People

**`users`** (staff)
| Column | Definition |
|---|---|
| `user_id` | `V(255) UNIQUE NOT NULL`, `U-YY-MMDD-####` |
| `username`, `password_hash` | `V(255) NOT NULL` (username is not unique) |
| `first_name`, `last_name` | `V(255) NOT NULL` |
| `middle_name` / `suffix` | `V(255)` / `V(20)` |
| `sex` | `V(20) NOT NULL` |
| `email` | `V(255) NOT NULL UNIQUE` |
| `contact_number` | `V(20) NOT NULL` |
| `emergency_contact_name` / `emergency_contact` | `V(255)` / `V(20)` |
| `address` | `TEXT NOT NULL` |
| `birthdate`, `date_hired` | `DATE NOT NULL` |
| `role` | `V(50) NOT NULL`: `admin`, `doctor`, `frontdesk-staff`, `laboratory-staff` |
| `department` / `employment_status` | `V(100)` / `V(50)` |
| `shift_start` / `shift_end` | `TIME NOT NULL`, default `08:00:00` / `17:00:00` |
| `last_login` | `TS` |
| `account_status` | `BOOLEAN NOT NULL DEFAULT TRUE` (false = deactivated, login 403) |
| `active` | `BOOLEAN NOT NULL DEFAULT FALSE` (online flag) |
| `profile_photo` | `TEXT` |
| `created_at`, `updated_at` | |

**`patients`**. It does **not** have `address`, `emergency_contact_name` or `emergency_contact`.
| Column | Definition |
|---|---|
| `patient_id` | `V(255) UNIQUE NOT NULL`, `P-YY-MMDD-####` |
| `image_url`, `profile_photo` | `TEXT` |
| `username`, `password_hash`, `first_name`, `last_name` | `V(255) NOT NULL` |
| `middle_name` / `suffix` | `V(255)` / `V(20)` |
| `sex` | `V(20) NOT NULL` |
| `is_pwd` | `BOOLEAN NOT NULL DEFAULT FALSE` (PWD discount eligibility) |
| `email` | `V(255) NOT NULL UNIQUE` |
| `contact_number` | `V(20) NOT NULL` |
| `guardian_name`, `guardian_relationship` / `guardian_contact` | `V(255)` / `V(20)` |
| `street`, `barangay`, `city`, `province`, `zip_code` | `TEXT NOT NULL` (nullable live) |
| `birthdate` | `DATE NOT NULL` (senior discount = age 60+) |
| `height_cm`, `weight_kg` | `DECIMAL(10,2)` |
| `allergies`, `existing_conditions`, `current_medications`, `previous_surgeries`, `previous_hospitalizations`, `family_medical_history` | `TEXT` |
| `smoking_status`, `alcohol_consumption` | `V(50)` |
| `civil_status` | `V(50) NOT NULL DEFAULT 'Single'` |
| `blood_type` | `V(50)` |
| `role` | `V(50) NOT NULL DEFAULT 'patient'` |
| `department` / `employment_status` / `date_hired` | `V(100)` / `V(50)` / `DATE` (staff-shaped leftovers) |
| `shift_start` / `shift_end` | `TIME NOT NULL`, default `08:00:00` / `17:00:00` (leftovers) |
| `last_login` | `TS` |
| `account_status` / `active` | `BOOLEAN NOT NULL`, default `TRUE` / `FALSE` |
| `created_at`, `updated_at` | |

### Catalog

**`services`**: `service_id V(255) UNIQUE NOT NULL` (`S-YY-MM-###`), `service_type V(50) NOT NULL` (`consultation`/`laboratory`), `service_name V(255) NOT NULL UNIQUE`, `price DECIMAL(10,2) NOT NULL`, `active BOOLEAN NOT NULL DEFAULT TRUE`, `room V(255) NOT NULL` (`Consultation Room`, `Laboratory Room 1`, `Laboratory Room 2`), `service_category V(255) NOT NULL` (nullable live), `created_at`, `updated_at`.

**`packages`** (unused by any controller): `package_id V(255) UNIQUE NOT NULL`, `package_name V(255) NOT NULL`, `package_price NUMERIC(10,2) NOT NULL`, `status V(50) NOT NULL DEFAULT 'Active'`, `created_at`, `updated_at`.

### Queue and consultation

**`queue_entries`**: `queue_id V(255) UNIQUE NOT NULL` (`CONS-####`/`LAB-####`), `patient_id V(255) NOT NULL → patients`, `queue_number INTEGER NOT NULL`, `is_priority BOOLEAN NOT NULL DEFAULT FALSE`, `skip_count INTEGER NOT NULL DEFAULT 0`, `status V(20) NOT NULL DEFAULT 'waiting'`, `created_at`, `updated_at`. **No `service_id` or `service_type`**: reach the service through `consultation_records.queue_id` or `laboratory_request_items.queue_id`.

**`consultation_records`** (**no `doctor_id`, `created_at` or `updated_at`**)
| Column | Definition |
|---|---|
| `consultation_record_id` | `V(255) UNIQUE NOT NULL`, `CR-YY-MMDD-####` |
| `patient_id` | `V(255) NOT NULL → patients` |
| `service_id` | `V(255) NOT NULL → services` (nullable live) |
| `queue_id` / `bill_id` | `V(255) → queue_entries` / `V(255) → bills` |
| `status` | `V(255) NOT NULL DEFAULT 'Created'` |
| `cancellation_reason` | `V(255)` |
| `is_paid` | `BOOLEAN NOT NULL DEFAULT FALSE` |
| `requested_by` | `V(255) NOT NULL → users` (nullable live) |
| `consulted_by` | `V(255) → users` |
| `consultation_type` | `V(255) NOT NULL DEFAULT 'Initial'` |
| `diagnosis`, `presenting_complaint`, `vital_signs`, `physical_examination` | `JSONB` |
| `notes` | `TEXT` |
| `requested_at` / `consulted_at` | `TS NOT NULL now` / `TS` |

**`prescription_records`**: `prescription_id V(255) UNIQUE NOT NULL` (`RX-YY-MMDD-####`), `consultation_record_id V(255) NOT NULL → consultation_records`, `patient_id V(255) NOT NULL → patients`, `prescriber_id V(255) NOT NULL → users`, `prescribed_at TS NOT NULL now`, `valid_until DATE`, `status V(20) NOT NULL DEFAULT 'Active'`, `prescription_items JSONB NOT NULL`, `notes TEXT`.

### Laboratory

**`laboratory_requests`**: `request_id V(255) UNIQUE NOT NULL` (`LR-YY-MMDD-####`), `consultation_record_id V(255) → consultation_records`, `patient_id V(255) NOT NULL → patients`, `requested_by V(255) NOT NULL → users`, `status V(20) NOT NULL DEFAULT 'Requested'`, `is_paid`/`is_priority BOOLEAN NOT NULL DEFAULT FALSE`, `request_date DATE NOT NULL DEFAULT CURRENT_DATE`, `estimated_release_date DATE`, `requested_at TS NOT NULL now`, `updated_at TS NOT NULL now`.

**`laboratory_request_items`** (one row per ordered test): `lab_item_id V(255) UNIQUE NOT NULL` (`LI-YY-MMDD-####`), `request_id V(255) NOT NULL → laboratory_requests` (FK missing live), `service_id V(255) NOT NULL → services`, `processed_by V(255) → users`, `queue_id V(255) → queue_entries` (set when payment forwards it to a room queue), `bill_id V(255) → bills`, `status V(50) NOT NULL DEFAULT 'Requested'`, `reason V(255) NOT NULL DEFAULT 'None'`, `created_at`, `updated_at`.

**`laboratory_results`**: `result_id V(255) UNIQUE NOT NULL` (`RES-<uuid>`), `lab_item_id V(255) NOT NULL → laboratory_request_items`, `results JSONB NOT NULL DEFAULT '[]'`, `status V(20) NOT NULL DEFAULT 'Pending'`, `remarks TEXT`, `image_url V(500)`, `verified_by V(255)` (no FK), `verified_at TS`, `released_at TS`, `released_by V(255)` (no FK), `created_at`, `updated_at`. **No `result_value`, `unit`, `reference_range` or `flag`.** No code writes `released_at`/`released_by`.

### Billing

**`bills`**
| Column | Definition |
|---|---|
| `bill_id` | `V(255) UNIQUE NOT NULL`, `B-YY-MMDD-####` |
| `patient_id` | `V(255) NOT NULL → patients` |
| `status` | `V(20) NOT NULL DEFAULT 'Pending'` |
| `items` | `JSONB`, snapshot saved at payment |
| `subtotal`, `discount_amount`, `total_amount` | `NUMERIC(12,2) NOT NULL DEFAULT 0` (`total_amount` is `(10,2)` live) |
| `discount_type` / `discount_rate` / `discount_pct` | `V(50)` / `NUMERIC(5,2)` / `NUMERIC(5,2)` (payment writes the same value to both rate and pct) |
| `discount_id_no` / `discounted_by` | `V(100)` / `V(255) → users` (no code uses these) |
| `payment_method` | `V(30) NOT NULL DEFAULT 'Cash'` |
| `reference_num` | `V(50)`, NULL for cash |
| `receipt_id` / `receipt_issued_at` | `V(50)` (`R-<12 hex chars>`) / `TS` |
| `billed_at`, `paid_at` | `TS` |
| `received_by` | `V(255) → users` |
| `created_at`, `updated_at` | |

### Form templates

**`form_templates`**: `form_id V(255) UNIQUE NOT NULL` (`F-<timestamp>`), `form_name V(255) NOT NULL`, `form_description TEXT`, `service_id V(255) NOT NULL → services`, `status V(50) NOT NULL DEFAULT 'Published'`, `created_by V(255) NOT NULL → users`, `version INTEGER NOT NULL DEFAULT 1`, `created_at`, `updated_at`.

**`form_component_types`**: `type_id V(255) UNIQUE NOT NULL`, `type_name V(100) NOT NULL UNIQUE`, `data_type V(50) NOT NULL`, `created_at`. Seeded `type_id`s: `text_field number_field checkbox date_field table section_header static_text line_divider image`.

**`form_components`**: `form_component_id V(255) UNIQUE NOT NULL` (`FC-<form_id>-<index>`), `form_id V(255) NOT NULL → form_templates`, `type_id V(255) NOT NULL → form_component_types`, `label`/`field_key V(255) NOT NULL`, `display_order INTEGER NOT NULL`, `settings JSONB`, `validation JSONB`.

### Audit and leftovers

**`actions`**: `action_id SERIAL PRIMARY KEY`, `action_name V(255) NOT NULL UNIQUE` (e.g. `user.deactivate`, `billing.payment`), `action_description TEXT`, `module V(100) NOT NULL`, `is_sensitive BOOLEAN NOT NULL DEFAULT TRUE`.

**`activity_logs`** (current audit log, written by `logActivity()`): `user_id V(255) NOT NULL → users` (FK missing live), `action_id INTEGER NOT NULL` (no FK), `status V(255) NOT NULL`, `target_type V(100) NOT NULL`, `target_id V(255) NOT NULL`, `metadata JSONB`, `created_at`.

**`system_activity`** (legacy audit, still used by `POST /api/admin/activities` and `GET /api/admin/activity`): `activity_id V(255) UNIQUE NOT NULL` (`ACT-YYMMDD-HHMM-####`), `user_id V(255) NOT NULL → users`, `service_name V(255) NOT NULL → services(service_name)`, `details JSONB NOT NULL`, `created_at`.

**`sse_test`** (demo for the `/api/test` SSE controllers): `message_id SERIAL PRIMARY KEY`, `message V(255) NOT NULL`.

## Relations
```
patients --< queue_entries, consultation_records, prescription_records, laboratory_requests, bills
users    --< consultation_records (requested_by, consulted_by)   [NO doctor_id]
users    --< prescription_records (prescriber_id), laboratory_requests (requested_by),
             laboratory_request_items (processed_by), bills (received_by, discounted_by),
             form_templates (created_by), activity_logs, system_activity
services --< consultation_records, laboratory_request_items, form_templates
services --< system_activity (by service_name)

queue_entries --< consultation_records (queue_id)
queue_entries --< laboratory_request_items (queue_id)
bills         --< consultation_records (bill_id)
bills         --< laboratory_request_items (bill_id)

consultation_records --< prescription_records, laboratory_requests (optional)
laboratory_requests  --< laboratory_request_items --< laboratory_results (no UNIQUE on lab_item_id)
form_templates --< form_components >-- form_component_types
actions --< activity_logs (action_id, not enforced)
```

## Status and enum values

No CHECK constraints exist. These come from the code and the live data.

| Column | Values |
|---|---|
| `queue_entries.status` | `waiting` (column default) or `Waiting`; `serving` or `Serving`; `skipped` (live also has `Skipped`, from `seedBulk`); `Completed`; `Cancelled` |
| `consultation_records.status` | `Created` → `In Queue` → `Serving` → `Completed`; `Cancelled`. Live also has `Waiting` |
| `laboratory_requests.status` | `Requested` → `Paid` |
| `laboratory_request_items.status` | `Requested` → `Waiting` (forwarded) → `Specimen Collected` → `In Progress` → `Completed`; `Cancelled`. `Processing` is only from `seedBulk` |
| `laboratory_results.status` | `Pending` → `Released` |
| `prescription_records.status` | `Active` |
| `form_templates.status` | `Published` is the default; only one Published template per service |
| `bills.status` | `Pending` → `Paid`. Old rows may hold `Unpaid`; `normalizeBillStatus()` maps it to `Pending`. Other values count as cancelled and cannot be paid |
| `bills.payment_method` | `confirmPayment` accepts `Cash` and `Instapay/QRpH`. Live rows also hold `GCash`, `Debit Card`, `Credit Card` |
| `bills.discount_type` | `Senior Citizen`, `PWD` (20%), or NULL |
| `activity_logs.status` | `success`, `failure`, `blocked` |
| Exclusions | Billing and backfill treat `cancelled`, `canceled` and `rejected` as not billable |

To add a CHECK constraint, normalize the existing rows first, then:
```sql
UPDATE queue_entries SET status = LOWER(TRIM(status));
ALTER TABLE queue_entries ADD CONSTRAINT queue_status_chk
  CHECK (status IN ('waiting','serving','skipped','completed','cancelled'));
```
Check every writer first: the controllers currently write mixed case, so this needs code changes too.

## JSONB shapes
```ts
consultation_records.presenting_complaint  // { hpi: string }                         utils/consultationValidation.ts
consultation_records.diagnosis             // [{ diagnosis, icd10, type: "Primary"|"Secondary" }], exactly one Primary
consultation_records.physical_examination  // { general_appearance?, heent?, cardiovascular?, respiratory?, abdomen?, extremities? }
consultation_records.vital_signs           // only seed data writes this; no backend code does
prescription_records.prescription_items    // [{ medication, dosage, frequency, duration?, instructions? }]
laboratory_results.results                 // [{ ..., template_snapshot }], report views read results[0].template_snapshot
bills.items                                // [{ line_type: "consultation"|"laboratory", item_id, request_id, service_id,
                                           //    service_name, service_category, price, quantity }]
                                           // addBills omits line_type, item_id and request_id; legacy backfill uses price: null
form_components.settings, .validation      // per component type
activity_logs.metadata                     // object written by utils/activityLogger.ts
```

## Billing model
A consultation or lab item is linked to a bill through its own `bill_id`.

- **Open bill**: `status` is `Pending` or `Unpaid` and `items` is NULL or `[]`. `getOrCreateOpenBill(client, patient_id)` reuses or creates one per patient. Totals come from the linked rows through `recomputeBillTotals(client, bill_id)`.
- **Paid bill**: `confirmPayment` (`PATCH /api/fdstaff/billings/:bill_id/pay`) writes an immutable snapshot to `items`, sets the amounts, then marks the linked consultations and lab requests paid. A second transaction forwards lab items to room queues, so forwarding can be retried without charging again.
- `recomputeBillTotals` skips any bill with a non-empty `items` array, so it never overwrites a snapshot.

Advisory lock keys (`pg_advisory_xact_lock(hashtext(...))`): `open_bill:<patient_id>`, `bill_ids`, `queue_ids`, `billing_backfill`, `billing_schema_20261106`. Reuse these when writing to the same IDs.

## How the schema is managed

Each `TABLES` entry is `{ table, columns: { col: "TYPE ..." } }`. There is only this one definition, with no separate `createSQL`. `TABLES` is not exported.

Boot order in `server.ts`:
1. `connectNeon()`: every `CREATE TABLE IF NOT EXISTS` in one `sql.transaction` (one round trip), retried up to 5 times with backoff (1, 2, 4, 8 s) so a brief network drop doesn't crash the server. It does not alter existing tables.
2. `syncSchema()`, only when `IS_PRODUCTION=true`.

### What `syncSchema(onlyTables?)` does
- A full sync **drops every table not in `TABLES`** with `CASCADE`. A selective sync drops no tables.
- For each configured table it creates the table if missing, adds missing columns, and **drops columns not in `columns`** with `CASCADE`.
- It compares **column names only**, with one exception: a column that is `timestamp without time zone` in the database and `TIMESTAMPTZ` in `TABLES` is converted with `ALTER COLUMN … TYPE TIMESTAMPTZ USING col AT TIME ZONE 'UTC'` (stored values were UTC, so every time stays the same moment). It never makes any other type, nullability or default change, and never adds a missing FK or UNIQUE.
- A `NOT NULL` column with no default is added as nullable and tightened only if no row has NULL, so on a table with rows it stays nullable. That is the cause of most of the drift below.

### Adding a column
1. Add it to `columns` in `TABLES`. Keep `TABLES` a plain literal: `tests/isolated/frontdeskBilling.test.ts` parses it from the source text, using `const TABLES: TableDefinition[]` and the closing `\n];` as markers.
2. Give it a default or make it nullable if the table already has rows.
3. A non-production database gets it only through a one-off `syncSchema(["table"])`, which also drops that table's unlisted columns, or by dropping and reseeding it. Production gets it on the next boot.
4. Changing a type, nullability, default or FK always needs an explicit `ALTER`, because `syncSchema` won't do it. Update `TABLES` too so fresh databases match.
5. Removing a column or table from `TABLES` deletes the data on the next production boot.

### Proposal: dry-run diff (not in the repo)
`syncSchema` has no preview. To add one, `export` `TABLES` from `db.ts`, then create `scripts/schemaDiff.ts`:
```ts
import { sql, TABLES } from "../config/db.js";

const live = await sql`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public'`;
const byTable = new Map<string, Set<string>>();
for (const r of live) (byTable.get(r.table_name) ?? byTable.set(r.table_name, new Set()).get(r.table_name)!).add(r.column_name);

const wanted = new Map(TABLES.map((t) => [t.table, new Set(Object.keys(t.columns))]));
for (const [t, cols] of byTable) {
  if (!wanted.has(t)) { console.log(`WOULD DROP TABLE ${t}`); continue; }
  for (const c of cols) if (!wanted.get(t)!.has(c)) console.log(`WOULD DROP COLUMN ${t}.${c}`);
}
for (const [t, cols] of wanted) for (const c of cols) if (!byTable.get(t)?.has(c)) console.log(`WOULD ADD COLUMN ${t}.${c}`);
```
Script: `"db:diff": "tsx src/scripts/schemaDiff.ts"`. The boot call could also be gated: `if (ENV.IS_PRODUCTION && process.env.ALLOW_SCHEMA_SYNC === "true") await syncSchema();`.

### Proposal: numbered migrations (not in the repo)
`techcare-mvp-deploy` describes the alternative: `backend/src/db/migrations/NNN_name.sql`, applied by `scripts/initDb.ts` and tracked in `schema_migrations`. Never edit an applied file, use `IF NOT EXISTS`, and review destructive changes by hand. **Remove the boot `syncSchema()` first**, or a full sync will drop `schema_migrations` because it isn't in `TABLES`.

## Drift: code vs live database
Snapshot from 2026-11-07. Table and column names match on all 18 tables. These definitions differ:

| Item | `TABLES` | Live |
|---|---|---|
| `patients.street`, `barangay`, `city`, `province`, `zip_code` | `NOT NULL` | nullable; NULL on all 508 rows |
| `services.service_category` | `NOT NULL` | nullable; NULL on all 13 rows |
| `consultation_records.service_id`, `requested_by` | `NOT NULL` | nullable; at least one is NULL on all 811 rows |
| `queue_entries.patient_id` | `NOT NULL` | nullable; no NULLs |
| `bills.total_amount` | `NUMERIC(12,2)` | `NUMERIC(10,2)` |
| `form_templates.status` | `V(50)` | `V(255)` |
| FK `laboratory_request_items.request_id → laboratory_requests` | present | missing; 429 of 435 items have no matching request |
| FK `activity_logs.user_id → users` | present | missing |

Consequences:
- Don't assume an inner join from lab items to `laboratory_requests` returns rows on this data.
- `recomputeBillTotals` and `confirmPayment` join `services` on `service_id`, so consultations with a NULL `service_id` add nothing to a bill.
- Clean the data first if you add these constraints, or the `ALTER` will fail.
- A fresh database gets the strict `TABLES` definitions, so inserts that work live can fail there.

## Time zones
All timestamp columns are `TIMESTAMPTZ`, filled by `CURRENT_TIMESTAMP`. The live session zone is `GMT`. The driver returns them as JS `Date`s and JSON sends ISO strings ending in `Z`, so every client sees the right moment whatever its own zone.

```sql
-- Manila date of a stored row (correct on TIMESTAMPTZ)
(created_at AT TIME ZONE 'Asia/Manila')::date
-- Manila date of now
(NOW() AT TIME ZONE 'Asia/Manila')::date
-- Viewer's zone in analytics: pass it as a parameter
paid_at AT TIME ZONE ${tz}

-- WRONG on TIMESTAMPTZ (was only right for the old TIMESTAMP columns): shifts by 16 hours
(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')
```
- Before the change, `TIMESTAMP` values were read as the *server's* local time, so a backend running on a computer set to Asia/Manila showed every time 8 hours early ("8h ago" on a notification just sent).
- `CURRENT_DATE` is the GMT date, so `created_at >= CURRENT_DATE` filters (queue lists, ID counters) roll over at 8 AM Manila, while queue numbers (`generateId.ts`) reset at Manila midnight.
- Inserting a JS `Date` or an ISO string with an offset now keeps the offset. Cast parameters with `::timestamptz`, not `::timestamp` (which drops the offset).
- Rows written from a JS `Date` by a backend running in Manila before 2026-11-12 may be 8 hours ahead; rows filled by `CURRENT_TIMESTAMP` are correct.

## Seeding
| Command | Effect |
|---|---|
| `npm run seed` | `connectNeon()`, then `seed.sql` with `ON CONFLICT DO NOTHING` |
| `npm run seed:reset -- --force` | TRUNCATE ... RESTART IDENTITY, then insert |
| `npm run seed:bulk` | synthetic patients/staff/queue rows (`SEED_PATIENTS`, `SEED_STAFF`, `SEED_QUEUE_ENTRIES`) |
| `npm run seed:all` | reset and bulk, both with `--force` |

**The seeds are currently broken.** `seed.sql` and `seedBulk.ts` insert `patients.emergency_contact_name`, `emergency_contact` and `address`, which don't exist. A test on an in-memory PGlite database created from `TABLES` fails with `column "emergency_contact_name" of relation "patients" does not exist`. **`seed:reset` and `seed:all` commit the TRUNCATE before the insert runs, so they would wipe the data and then fail.** Fix the seeds before using them. The inserts also need `street`, `barangay`, `city`, `province` and `zip_code`.

Seeding refuses in production unless `--force`. Seed accounts use password `password`: `admin101`, `doctor201`, `fdstaff322`, `labstaff101` (Laboratory Room 1), `labstaff202` (Laboratory Room 2), `patient101..108`. Never seed a public deployment with these. "Today" rows are stamped from `CURRENT_DATE`, so reseed daily for demos.

## Transaction template
```ts
const client = await pool.connect();
try {
  await client.query("BEGIN");
  // ... queries on `client` only
  await client.query("COMMIT");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  client.release();
}
```
Publish SSE and log activity AFTER COMMIT.

## Code that still queries columns or tables that don't exist
These fail at runtime with "column/relation does not exist". Check here before copying a nearby query.

| Reference | Where |
|---|---|
| `consultation_records.doctor_id` | `controllers/doctor/postRequests.controller.ts`, `doctor/getRequests.controller.ts`, `patient/getRequest.controller.ts` |
| `lab_requests` table | `controllers/fdstaff/getRequests.controller.ts`, `tests/setup.ts` |
| `laboratory_results.result_value` (`unit`, `reference_range` and `flag` in the doctor query) | `doctor/getRequests.controller.ts`, `patient/getRequest.controller.ts`, `fdstaff/getRequests.controller.ts` |
| `queue_entries.service_id` | `fdstaff/getRequests.controller.ts:906` |
| `patients.address`, `emergency_contact_name`, `emergency_contact` | `labstaff/getRequests.controller.ts:155-159`, `seed.sql`, `seedBulk.ts` |

## Gotchas
- `tests/setup.ts` truncates tables after each integration test. It lists `lab_requests`, so the TRUNCATE currently errors. Before fixing it, make sure `.env.test` points at a disposable database. `npm run test:frontdesk` runs on in-memory PGlite and is safe.
- `labstaff GET /laboratory-requests/items/` filters on `'Collected'`, but items become `'Specimen Collected'`.
- Neon scale-to-zero: the first query after idle is slow.
- Dates from DATE columns may serialize as ISO timestamps; format on the client.
- Dead tables: `packages` has no controller. `sse_test` serves only the test SSE demos. `system_activity` is superseded by `activity_logs` but is still read and written. Removing any from `TABLES` drops it on the next production boot, along with its data.

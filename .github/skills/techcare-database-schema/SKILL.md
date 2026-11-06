---
name: techcare-database-schema
description: Neon Postgres setup and schema management for TechCare - the sql vs pool split, TABLES with createSQL and columns, connectNeon, syncSchema (and why it is dangerous), how to add a column safely, a dry-run diff tool, numbered SQL migrations, seeding and bulk seeding. Use when changing tables, adding columns, schema drift, data lost after deploy, writing transactions, seeding data, or choosing between the dev schema sync and the MVP migrations approach.
---

# Database & Schema

## Clients (`config/db.ts`)
```ts
export const sql = neon(ENV.DATABASE_URL);                          // HTTP, one statement (or sql.transaction([...]))
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
- Every table: `id SERIAL PRIMARY KEY`; FKs point at the **string business IDs** (`patient_id`, `user_id`), not the serial.
- Users and patients are separate tables; column is `password_hash`.
- JSONB for flexible clinical data (`diagnosis`, `vital_signs`, `prescription_items`, `results`, `settings`).
- Timestamps `TIMESTAMPTZ`; "today" = `(created_at AT TIME ZONE 'Asia/Manila')::date`.

## The original mechanism (`TABLES` in `db.ts`)
Each entry: `{ name, createSQL, columns: { col: "TYPE ..." } }`.
- `connectNeon()` on every boot: `CREATE TABLE IF NOT EXISTS` + a few additive `ALTER`s.
- `syncSchema(onlyTables?)` on boot when `IS_PRODUCTION=true`: **drops tables not in TABLES, drops columns not in `columns`, adds missing columns.**

### Changing a column (original way): edit TWO places
1. `createSQL` (fresh databases)
2. `columns` (what syncSchema compares)
Then on an existing DB run `syncSchema(["table_name"])` once, or add an explicit `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` to `connectNeon()`.
Drift already present: `laboratory_results.released_at/released_by` (in ALTERs, not in `columns` -> dropped on next sync), `consultation_records.cancellation_reason`, `services.service_category` nullability, `activity_logs.user_id` FK.

### Make syncSchema safe: dry-run by default
`scripts/schemaDiff.ts`
```ts
import { sql } from "../config/db.js";
import { TABLES } from "../config/db.js";

const live = await sql`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public'`;
const byTable = new Map<string, Set<string>>();
for (const r of live) (byTable.get(r.table_name) ?? byTable.set(r.table_name, new Set()).get(r.table_name)!).add(r.column_name);

const wanted = new Map(TABLES.map((t) => [t.name, new Set(Object.keys(t.columns))]));
for (const [t, cols] of byTable) {
  if (!wanted.has(t)) { console.log(`WOULD DROP TABLE ${t}`); continue; }
  for (const c of cols) if (!wanted.get(t)!.has(c)) console.log(`WOULD DROP COLUMN ${t}.${c}`);
}
for (const [t, cols] of wanted) for (const c of cols) if (!byTable.get(t)?.has(c)) console.log(`WOULD ADD COLUMN ${t}.${c}`);
```
Script: `"db:diff": "tsx src/scripts/schemaDiff.ts"`. Read the output before any deploy that touches `TABLES`.
Also gate the boot call: `if (ENV.IS_PRODUCTION && process.env.ALLOW_SCHEMA_SYNC === "true") await syncSchema();`

## The safer way: numbered migrations
```
backend/src/db/migrations/001_init.sql
backend/src/db/migrations/002_add_released_columns.sql
```
Runner (`scripts/initDb.ts`) applies unapplied files in order inside a transaction and records them in `schema_migrations`. Additive only. Full runner code is in `techcare-mvp-deploy`.
Rules: never edit an applied file; fix forward with a new one; use `IF NOT EXISTS` everywhere; destructive changes (DROP) are a manual, reviewed migration.

## Status vocab and constraints
Add CHECK constraints to stop casing drift:
```sql
ALTER TABLE queue_entries ADD CONSTRAINT queue_status_chk
  CHECK (status IN ('waiting','serving','skipped','completed','cancelled'));
```
If you keep mixed-case historic data, normalize first: `UPDATE queue_entries SET status = LOWER(status);`.

## Key tables and relations (cheat sheet)
```
users --< consultation_records (requested_by, consulted_by)   [NO doctor_id]
patients --< queue_entries, consultation_records, laboratory_requests, bills
queue_entries <-- consultation_records.queue_id | laboratory_request_items.queue_id
laboratory_requests --< laboratory_request_items --1 laboratory_results
form_templates --< form_components >-- form_component_types
actions --< activity_logs
```
Dead tables to drop deliberately: `sse_test`, `packages` (unused), `system_activity` (superseded by `activity_logs`).

## Seeding
| Command | Effect |
|---|---|
| `npm run seed` | `seed.sql` with `ON CONFLICT DO NOTHING` (idempotent) |
| `npm run seed:reset -- --force` | TRUNCATE ... RESTART IDENTITY then insert |
| `npm run seed:bulk` | hundreds of synthetic patients/staff/queue rows (`SEED_PATIENTS`, `SEED_STAFF`, `SEED_QUEUE_ENTRIES`) |
| `npm run seed:all` | both |
Refuses in production unless `--force`. Seed accounts all use password `password`: `admin101`, `doctor201`, `fdstaff322`, `labstaff122` (Laboratory Room 2), `patient101..108`. Never seed a public deployment with these. "Today" rows are stamped from `CURRENT_DATE`, so reseed daily for demos.

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

## Gotchas
- `tests/setup.ts` truncates `lab_requests` (renamed `laboratory_requests`): fix before running tests.
- Neon scale-to-zero: first query after idle is slow; `connectDb()` at boot warms it.
- NUMERIC columns come back as strings: `Number(row.total_amount)`.
- Dates from DATE columns may serialize as ISO timestamps; format on the client.
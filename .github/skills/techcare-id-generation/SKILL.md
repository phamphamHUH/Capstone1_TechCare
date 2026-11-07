---
name: techcare-id-generation
description: Human-readable business IDs and queue numbers for TechCare (U-26-1105-0001, P-..., LR-..., CONS-0001) generated app-side with advisory locks inside transactions, plus the DB-default alternative. Use when creating a new entity that needs a readable ID, fixing duplicate/colliding IDs, daily vs monthly reset formats, Manila timezone numbering, queue numbers per room, or consolidating the duplicate consultation ID generators. Full stack: generator util, controller usage, DB constraints, frontend display, tests.
---

# ID Generation (the original app-side way)

> Need to ship fast? `techcare-mvp-deploy` replaces ALL of this with Postgres sequences as column DEFAULTs. Use this skill when you must keep the date-scoped formats.

## Formats
| Entity | Format | Scope resets | Pad |
|---|---|---|---|
| User | `U-YY-MMDD-NNNN` | daily | 4 |
| Patient | `P-YY-MMDD-NNNN` | daily | 4 |
| Service | `S-YY-MM-NNN` | monthly | 3 |
| Laboratory request | `LR-YY-MMDD-NNNN` | daily | 4 |
| Laboratory item | `LI-YY-MMDD-NNNN` | daily | 4 |
| Consultation record | `CR-YY-MMDD-NNNN` | daily | 4 |
| Prescription | `RX-YY-MMDD-NNNN` | daily | 4 |
| Consult / lab queue id | `CONS-NNNN` / `LAB-NNNN` | never | 4 |
| Lab result | `RES-<uuid>` | n/a | |
| Form / component | `F-<Date.now()>` / `FC-<form_id>-<i>` | n/a | |

All dates are **Asia/Manila**, not server time (Render runs UTC).

## One generic helper instead of ten copies
`utils/generateId.ts`
```ts
import type { PoolClient } from "@neondatabase/serverless";

const TZ = "Asia/Manila";
const SAFE = /^[a-z_]+$/;   // table/column names come from code constants only

function manila(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "2-digit", month: "2-digit", day: "2-digit" })
    .formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)!.value;
  return { yy: g("year"), mm: g("month"), dd: g("day") };
}
export const dailyScope = () => { const { yy, mm, dd } = manila(); return `${yy}-${mm}${dd}`; };   // 26-1105
export const monthlyScope = () => { const { yy, mm } = manila(); return `${yy}-${mm}`; };          // 26-11

/** MUST be called inside BEGIN..COMMIT on the SAME client that performs the INSERT. */
export async function nextScopedId(client: PoolClient, o: {
  prefix: string; table: string; column: string; scope: string; pad?: number;
}): Promise<string> {
  if (!SAFE.test(o.table) || !SAFE.test(o.column)) throw new Error("unsafe identifier");
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`${o.table}:${o.prefix}${o.scope}`]);
  const stem = `${o.prefix}${o.scope}-`;
  const { rows } = await client.query(
    `SELECT ${o.column} AS id FROM ${o.table} WHERE ${o.column} LIKE $1
     ORDER BY LENGTH(${o.column}) DESC, ${o.column} DESC LIMIT 1`, [`${stem}%`]);
  const last = rows[0]?.id ? parseInt(String(rows[0].id).slice(stem.length), 10) : 0;
  return `${stem}${String(last + 1).padStart(o.pad ?? 4, "0")}`;
}

export const generateUserId = (c: PoolClient) =>
  nextScopedId(c, { prefix: "U-", table: "users", column: "user_id", scope: dailyScope() });
export const generatePatientId = (c: PoolClient) =>
  nextScopedId(c, { prefix: "P-", table: "patients", column: "patient_id", scope: dailyScope() });
export const generateServiceId = (c: PoolClient) =>
  nextScopedId(c, { prefix: "S-", table: "services", column: "service_id", scope: monthlyScope(), pad: 3 });
export const generateLabRequestId = (c: PoolClient) =>
  nextScopedId(c, { prefix: "LR-", table: "laboratory_requests", column: "request_id", scope: dailyScope() });
export const generateLabItemId = (c: PoolClient) =>
  nextScopedId(c, { prefix: "LI-", table: "laboratory_request_items", column: "lab_item_id", scope: dailyScope() });
export const generateConsultationRecordId = (c: PoolClient) =>
  nextScopedId(c, { prefix: "CR-", table: "consultation_records", column: "consultation_record_id", scope: dailyScope() });
export const generatePrescriptionId = (c: PoolClient) =>
  nextScopedId(c, { prefix: "RX-", table: "prescription_records", column: "prescription_id", scope: dailyScope() });
```
Delete `generateConsultationId.ts` (the second CR- generator) and point the doctor controller at `generateConsultationRecordId`.

### Queue ids and numbers (two different things)
```ts
/** CONS-0001 / LAB-0001: monotonic, never resets */
export async function nextQueueId(c: PoolClient, prefix: "CONS" | "LAB") {
  await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`queue_id:${prefix}`]);
  const { rows } = await c.query(
    `SELECT COALESCE(MAX(SUBSTRING(queue_id FROM '[0-9]+$')::int), 0) + 1 AS n
     FROM queue_entries WHERE queue_id LIKE $1`, [`${prefix}-%`]);
  return `${prefix}-${String(rows[0].n).padStart(4, "0")}`;
}

/** Display number: per Manila day; consultation = global, lab = per room */
export async function nextQueueNumber(c: PoolClient, o: { type: "CONS" | "LAB"; room?: string }) {
  await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`queue_number:${o.type}:${o.room ?? ""}`]);
  const { rows } = await c.query(
    `SELECT COALESCE(MAX(queue_number), 0) + 1 AS n FROM queue_entries
     WHERE queue_id LIKE $1
       AND (created_at AT TIME ZONE 'Asia/Manila')::date = (now() AT TIME ZONE 'Asia/Manila')::date
       ${o.room ? "AND room = $2" : ""}`,
    o.room ? [`${o.type}-%`, o.room] : [`${o.type}-%`]);
  return rows[0].n as number;
}
```
(`room` must exist on `queue_entries`; see `techcare-queue-system`. In the original schema, derive it through the item/consultation join.)

## Controller usage (the only correct shape)
```ts
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const patientId = await generatePatientId(client);        // lock held until COMMIT
  await client.query("INSERT INTO patients (patient_id, ...) VALUES ($1, ...)", [patientId, /*...*/]);
  await client.query("COMMIT");
  res.status(201).json({ message: "Patient created", patient_id: patientId });
} catch (e) {
  await client.query("ROLLBACK");
  res.status(500).json({ message: "Failed to create patient" });
} finally {
  client.release();                                          // ALWAYS
}
```
Several IDs in one transaction (request + items): generate request id, insert, then item ids in a loop; each call re-reads MAX inside the same locked transaction, so there are no gaps or dupes.

## Safety net in the database
```sql
ALTER TABLE patients ADD CONSTRAINT patients_patient_id_key UNIQUE (patient_id);  -- already in TABLES
```
UNIQUE turns a missed lock into a loud error instead of silent duplicates. Never generate an ID **outside** the transaction that inserts it.

## Frontend
IDs are opaque strings. Display as-is, never parse. `P-26-1105-0001` sorts chronologically, so sort by `created_at` for correctness and show the ID as a label. Patient ID is also the patient login username (`username = patient_id`).

## Tests (`tests/unit/generateId.test.ts`)
- `dailyScope()` format `^\d{2}-\d{4}$`; mock `Date` around Manila midnight (UTC 16:00) and assert the day rolls over.
- Run `Promise.all` of 20 `createPatient` calls against the test DB: expect 20 unique IDs.
- Padding rollover: insert `...-9999`, next is `...-10000` (LENGTH ordering handles it).

## Gotchas
- Queue "today" in list queries uses `CURRENT_DATE` (DB tz) while numbering uses Manila: use the `AT TIME ZONE 'Asia/Manila'` expression everywhere.
- `Date.now()` form ids can collide on two creations in the same millisecond: use `F-${Date.now()}-${random4}` or a sequence.
- Forgetting `client.release()` exhausts the Neon pool and hangs the app.
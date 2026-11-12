---
name: techcare-mvp-deploy
description: Build or convert a TechCare-style project into a lean, deployment-ready MVP. Use when the goal is "just make it work and deploy it" - no generateId.ts logic, no syncSchema, no IS_PRODUCTION toggles, no demo routes, no hardcoded users - while KEEPING the same folder architecture (controllers/ROLE/{get,post,update,delete}Requests + dto, routes, middlewares, config, services) so the code stays readable. Covers the full stack: env validation, Neon DB, SQL migrations with DB-generated IDs, auth, role guards, one worked CRUD + atomic queue example, optional SSE, React shell, Vite config, and a Render monolith deploy. Trigger on "MVP", "deploy", "production ready", "simplify", "strip dev logic", "just ship it".
---

# TechCare MVP (deployment-ready, same architecture)

Goal: a project that boots, migrates itself safely, authenticates, and deploys on the first try.
Everything that existed only to make *development* convenient is removed or replaced with a boring, safe default.

## What changes vs. full TechCare

| TechCare (dev-friendly) | MVP replacement |
|---|---|
| `utils/generateId.ts`, advisory locks, `generateConsultationId.ts` duplicate | **Postgres sequences as column DEFAULTs** (`'U-' \|\| lpad(nextval(...))`). No ID code in the app at all. |
| `syncSchema()` on boot (drops tables/columns) | **`db/migrations/*.sql` + `npm run db:init`**: additive, tracked in `schema_migrations`, never drops. |
| `connectNeon()` creating tables + ALTER repairs | `connectDb()` = `SELECT 1` only |
| `IS_PRODUCTION` decides if role middleware runs | **Auth and role guards always on** |
| Hardcoded requester `U-26-1001-0004`, `resolveDoctorId` reading `body.doctor_id` | Always `req.user.user_id` |
| 4 role middleware files | One `requireRole(...roles)` factory (files kept as thin exports) |
| `/api/test`, `/api/sse` demos, `websocket.ts`, `sse_test`, `system_activity`, `packages` | Deleted |
| Refresh token that nothing consumes (+ env name mismatch causing 500) | Access token only |
| Seed scripts with password `password` | `npm run admin:create` reading env vars |
| SPA fallback answering `/api/*` typos with `index.html` 200 | `/api/*` unknown -> JSON 404 |
| Vite proxy target depending on `NODE_ENV` (can hit prod!) | Always `http://localhost:5000` |
| `ProtectedRoute` bypass in dev | Always enforced |
| Mixed-case statuses | One lowercase vocabulary + CHECK constraints |
| `queue_entries` without service link (broke 4 queries) | `queue_type` + `room` columns on `queue_entries` |

## Folder architecture (unchanged, minus dead code)

```
project/
├── package.json                     # root: build/start delegate
├── render.yaml
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── server.ts                # connectDb, listen, graceful shutdown
│       ├── app.ts                   # cors, json, routers, static, SPA fallback (non-/api only)
│       ├── config/{env.ts, db.ts, cloudinary.ts}
│       ├── db/migrations/001_init.sql
│       ├── middlewares/{auth,role,patient,multer}.middleware.ts
│       ├── routes/{auth,admin,fdstaff,doctor,labstaff,patient}.route.ts
│       ├── controllers/<role>/{get,post,update,delete}Requests.controller.ts + dto/*.dto.ts
│       ├── services/queue-sse/{index,queueStream.hub,queueStream.handlers}.ts   # optional
│       ├── utils/{activityLogger,calculateAge}.ts
│       ├── scripts/{initDb,createAdmin}.ts
│       └── types/express.d.ts
└── frontend/
    ├── package.json, vite.config.ts
    └── src/{main,App}.tsx, auth/, lib/{axios,ProtectedRoute}, interface/, services/queue-sse/, users/<role>/{Role.tsx,pages/,components/}
```

## 1. Backend foundation

### `package.json` (backend)
```json
{
  "type": "module",
  "scripts": {
    "dev": "nodemon --watch src --ext ts --exec tsx src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db:init": "tsx src/scripts/initDb.ts",
    "admin:create": "tsx src/scripts/createAdmin.ts"
  }
}
```
`tsx`, `typescript`, `@types/*` live in devDependencies; the **build command installs them with `--include=dev`** (see Deploy).

### `config/env.ts` (fail fast, one canonical set of names)
```ts
import dotenv from "dotenv";
dotenv.config();

const required = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
};

export const ENV = {
  PORT: Number(process.env.PORT ?? 5000),
  NODE_ENV: process.env.NODE_ENV ?? "production",
  DATABASE_URL: required("DATABASE_URL"),
  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "1d",
  // comma separated; empty = same-origin only (monolith)
  CORS_ORIGIN: (process.env.CORS_ORIGIN ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ?? "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? "",
};
```

### `config/db.ts`
```ts
import { neon, neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
import { ENV } from "./env.js";

neonConfig.webSocketConstructor = ws; // required for Pool on Node < 22

export const sql = neon(ENV.DATABASE_URL);              // single statements (HTTP)
export const pool = new Pool({ connectionString: ENV.DATABASE_URL }); // multi-step transactions

export async function connectDb() {
  await sql`SELECT 1`;
  console.log("Database reachable");
}
```

### `db/migrations/001_init.sql`
IDs are produced by the database. No app code, no locks, race-safe.

```sql
-- ===== readable ID sequences =====
CREATE SEQUENCE IF NOT EXISTS user_id_seq;
CREATE SEQUENCE IF NOT EXISTS patient_id_seq;
CREATE SEQUENCE IF NOT EXISTS service_id_seq;
CREATE SEQUENCE IF NOT EXISTS queue_id_seq;
CREATE SEQUENCE IF NOT EXISTS consultation_id_seq;
CREATE SEQUENCE IF NOT EXISTS prescription_id_seq;
CREATE SEQUENCE IF NOT EXISTS lab_request_id_seq;
CREATE SEQUENCE IF NOT EXISTS lab_item_id_seq;
CREATE SEQUENCE IF NOT EXISTS bill_id_seq;
CREATE SEQUENCE IF NOT EXISTS form_id_seq;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE DEFAULT 'U-' || LPAD(nextval('user_id_seq')::text, 6, '0'),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL, middle_name TEXT, last_name TEXT NOT NULL, suffix TEXT,
  sex TEXT, email TEXT NOT NULL UNIQUE, contact_number TEXT, address TEXT, birthdate DATE,
  role TEXT NOT NULL CHECK (role IN ('admin','doctor','frontdesk-staff','laboratory-staff')),
  department TEXT, employment_status TEXT, date_hired DATE,
  account_status BOOLEAN NOT NULL DEFAULT TRUE,   -- false = deactivated
  active BOOLEAN NOT NULL DEFAULT FALSE,          -- online flag
  last_login TIMESTAMPTZ, profile_photo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  patient_id TEXT NOT NULL UNIQUE DEFAULT 'P-' || LPAD(nextval('patient_id_seq')::text, 6, '0'),
  username TEXT UNIQUE, password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL, middle_name TEXT, last_name TEXT NOT NULL, suffix TEXT,
  sex TEXT, email TEXT, contact_number TEXT, address TEXT, birthdate DATE,
  civil_status TEXT, blood_type TEXT, image_url TEXT,
  role TEXT NOT NULL DEFAULT 'patient',
  account_status BOOLEAN NOT NULL DEFAULT TRUE, active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  service_id TEXT NOT NULL UNIQUE DEFAULT 'S-' || LPAD(nextval('service_id_seq')::text, 4, '0'),
  service_type TEXT NOT NULL CHECK (service_type IN ('consultation','laboratory')),
  service_name TEXT NOT NULL UNIQUE,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  room TEXT, service_category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- queue_entries now carries queue_type + room => no more broken joins on service_id
CREATE TABLE IF NOT EXISTS queue_entries (
  id SERIAL PRIMARY KEY,
  queue_id TEXT NOT NULL UNIQUE DEFAULT 'Q-' || LPAD(nextval('queue_id_seq')::text, 6, '0'),
  queue_type TEXT NOT NULL CHECK (queue_type IN ('consultation','laboratory')),
  room TEXT NOT NULL,
  patient_id TEXT NOT NULL REFERENCES patients(patient_id),
  queue_number INT NOT NULL,
  is_priority BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting','serving','skipped','completed','cancelled')),
  skipped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_queue_today ON queue_entries (created_at, room, status);

-- per-day, per-room counter: atomic numbering without locks
CREATE TABLE IF NOT EXISTS queue_counters (
  day DATE NOT NULL, room TEXT NOT NULL, last_number INT NOT NULL,
  PRIMARY KEY (day, room)
);

CREATE TABLE IF NOT EXISTS consultation_records (
  id SERIAL PRIMARY KEY,
  consultation_record_id TEXT NOT NULL UNIQUE DEFAULT 'CR-' || LPAD(nextval('consultation_id_seq')::text, 6, '0'),
  patient_id TEXT NOT NULL REFERENCES patients(patient_id),
  service_id TEXT REFERENCES services(service_id),
  queue_id TEXT REFERENCES queue_entries(queue_id),
  status TEXT NOT NULL DEFAULT 'Created',
  cancellation_reason TEXT,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  requested_by TEXT REFERENCES users(user_id),
  consulted_by TEXT REFERENCES users(user_id),
  consultation_type TEXT NOT NULL DEFAULT 'Initial',
  diagnosis JSONB, presenting_complaint JSONB, vital_signs JSONB, physical_examination JSONB,
  notes TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(), consulted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS prescription_records (
  id SERIAL PRIMARY KEY,
  prescription_id TEXT NOT NULL UNIQUE DEFAULT 'RX-' || LPAD(nextval('prescription_id_seq')::text, 6, '0'),
  consultation_record_id TEXT NOT NULL REFERENCES consultation_records(consultation_record_id),
  patient_id TEXT NOT NULL REFERENCES patients(patient_id),
  prescriber_id TEXT NOT NULL REFERENCES users(user_id),
  valid_until DATE, status TEXT NOT NULL DEFAULT 'Active',
  prescription_items JSONB NOT NULL DEFAULT '[]', notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS laboratory_requests (
  id SERIAL PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE DEFAULT 'LR-' || LPAD(nextval('lab_request_id_seq')::text, 6, '0'),
  consultation_record_id TEXT REFERENCES consultation_records(consultation_record_id),
  patient_id TEXT NOT NULL REFERENCES patients(patient_id),
  requested_by TEXT REFERENCES users(user_id),
  status TEXT NOT NULL DEFAULT 'Requested', is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  is_priority BOOLEAN NOT NULL DEFAULT FALSE,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE, estimated_release_date DATE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS laboratory_request_items (
  id SERIAL PRIMARY KEY,
  lab_item_id TEXT NOT NULL UNIQUE DEFAULT 'LI-' || LPAD(nextval('lab_item_id_seq')::text, 6, '0'),
  request_id TEXT NOT NULL REFERENCES laboratory_requests(request_id) ON DELETE CASCADE,
  service_id TEXT NOT NULL REFERENCES services(service_id),
  processed_by TEXT REFERENCES users(user_id),
  queue_id TEXT REFERENCES queue_entries(queue_id),
  status TEXT NOT NULL DEFAULT 'Requested', reason TEXT
);

CREATE TABLE IF NOT EXISTS laboratory_results (
  id SERIAL PRIMARY KEY,
  result_id TEXT NOT NULL UNIQUE DEFAULT 'RES-' || gen_random_uuid()::text,
  lab_item_id TEXT NOT NULL UNIQUE REFERENCES laboratory_request_items(lab_item_id),
  results JSONB NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'Pending',
  remarks TEXT, image_url TEXT,
  verified_by TEXT REFERENCES users(user_id), verified_at TIMESTAMPTZ,
  released_by TEXT REFERENCES users(user_id), released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS form_component_types (
  type_id SERIAL PRIMARY KEY, type_name TEXT NOT NULL UNIQUE, data_type TEXT
);
INSERT INTO form_component_types (type_name, data_type) VALUES
  ('text_field','string'),('number_field','number'),('checkbox','boolean'),('date_field','date'),
  ('table','array'),('section_header','none'),('static_text','none'),('line_divider','none'),('image','string')
ON CONFLICT (type_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS form_templates (
  id SERIAL PRIMARY KEY,
  form_id TEXT NOT NULL UNIQUE DEFAULT 'F-' || LPAD(nextval('form_id_seq')::text, 5, '0'),
  form_name TEXT NOT NULL, form_description TEXT,
  service_id TEXT REFERENCES services(service_id),
  status TEXT NOT NULL DEFAULT 'Draft',
  created_by TEXT REFERENCES users(user_id), version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_published_per_service ON form_templates(service_id) WHERE status = 'Published';

CREATE TABLE IF NOT EXISTS form_components (
  id SERIAL PRIMARY KEY,
  form_component_id TEXT NOT NULL UNIQUE,   -- built by SQL/controller as form_id || '-' || index
  form_id TEXT NOT NULL REFERENCES form_templates(form_id) ON DELETE CASCADE,
  type_id INT NOT NULL REFERENCES form_component_types(type_id),
  label TEXT, field_key TEXT, display_order INT NOT NULL DEFAULT 0,
  settings JSONB NOT NULL DEFAULT '{}', validation JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS bills (
  id SERIAL PRIMARY KEY,
  bill_id TEXT NOT NULL UNIQUE DEFAULT 'B-' || LPAD(nextval('bill_id_seq')::text, 6, '0'),
  patient_id TEXT NOT NULL REFERENCES patients(patient_id),
  items JSONB NOT NULL DEFAULT '[]', discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0, payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'Unpaid', receipt_id TEXT, receipt_issued_at TIMESTAMPTZ,
  billed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS actions (
  action_id SERIAL PRIMARY KEY, action_name TEXT NOT NULL UNIQUE, module TEXT, is_sensitive BOOLEAN NOT NULL DEFAULT FALSE
);
INSERT INTO actions (action_name, module, is_sensitive) VALUES
  ('user.activate','users',TRUE),('user.deactivate','users',TRUE),('user.create','users',FALSE),
  ('user.update','users',FALSE),('service.create','services',FALSE),('lab.result.release','laboratory',TRUE)
ON CONFLICT (action_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(user_id), action_id INT REFERENCES actions(action_id),
  status TEXT NOT NULL CHECK (status IN ('success','failure','blocked')),
  target_type TEXT, target_id TEXT, metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `scripts/initDb.ts` (additive migration runner, never destructive)
```ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/db.js";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../db/migrations");

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    const done = new Set((await client.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name));
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      if (done.has(file)) continue;
      console.log("Applying", file);
      await client.query("BEGIN");
      try {
        await client.query(fs.readFileSync(path.join(dir, file), "utf8"));
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (e) { await client.query("ROLLBACK"); throw e; }
    }
    console.log("Database up to date");
  } finally { client.release(); await pool.end(); }
}
main().catch((e) => { console.error(e); process.exit(1); });
```
**Changing the schema later**: add `002_add_something.sql` with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`. One place, one direction, nothing dropped.

### `scripts/createAdmin.ts`
```ts
import bcrypt from "bcryptjs";
import { sql, pool } from "../config/db.js";

const username = process.env.ADMIN_USERNAME, password = process.env.ADMIN_PASSWORD;
const email = process.env.ADMIN_EMAIL ?? `${username}@example.com`;
if (!username || !password) throw new Error("Set ADMIN_USERNAME and ADMIN_PASSWORD");

const hash = await bcrypt.hash(password, 10);
await sql`INSERT INTO users (username, password_hash, first_name, last_name, email, role)
          VALUES (${username}, ${hash}, 'System', 'Admin', ${email}, 'admin')
          ON CONFLICT (username) DO NOTHING`;
console.log("Admin ready:", username);
await pool.end();
```

### `app.ts`
```ts
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { ENV } from "./config/env.js";
import authRouter from "./routes/auth.route.js";
import adminRouter from "./routes/admin.route.js";
import fdstaffRouter from "./routes/fdstaff.route.js";
import doctorRouter from "./routes/doctor.route.js";
import labstaffRouter from "./routes/labstaff.route.js";
import patientRouter from "./routes/patient.route.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url)); // backend/dist
const frontendDist = path.resolve(__dirname, "../../frontend/dist");

export function buildApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(cors({ origin: ENV.CORS_ORIGIN.length ? ENV.CORS_ORIGIN : false }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/fdstaff", fdstaffRouter);
  app.use("/api/doctor", doctorRouter);
  app.use("/api/labstaff", labstaffRouter);
  app.use("/api/patient", patientRouter);
  app.use("/api", (_req, res) => res.status(404).json({ message: "Not found" })); // typo'd API URL = real 404

  app.use(express.static(frontendDist));
  app.use((req, res, next) => {            // SPA fallback: GET only, never /api
    if (req.method !== "GET") return next();
    res.sendFile(path.join(frontendDist, "index.html"));
  });

  // Express 5 forwards async errors here automatically
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  });
  return app;
}
```

### `server.ts`
```ts
import { ENV } from "./config/env.js";
import { connectDb } from "./config/db.js";
import { buildApp } from "./app.js";
import { closeAllQueueStreams } from "./services/queue-sse/index.js"; // delete if you skip SSE

await connectDb();
const server = buildApp().listen(ENV.PORT, () => console.log(`Listening on ${ENV.PORT}`));

const shutdown = () => { closeAllQueueStreams(); server.close(() => process.exit(0)); };
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
```

### Middlewares (always on)
`types/express.d.ts`
```ts
import "express";
declare global { namespace Express { interface Request { user?: { user_id: string; role: string; [k: string]: unknown } } } }
```
`middlewares/auth.middleware.ts`
```ts
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { sql } from "../config/db.js";
import { ENV } from "../config/env.js";

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing token" });
  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET) as { user_id: string; account_type: string };
    if (payload.account_type !== "user") return res.status(401).json({ message: "Invalid token" });
    const [user] = await sql`SELECT user_id, username, role, first_name, last_name, account_status
                             FROM users WHERE user_id = ${payload.user_id}`;
    if (!user || !user.account_status) return res.status(401).json({ message: "Account unavailable" });
    req.user = user as Request["user"];
    next();
  } catch { res.status(401).json({ message: "Invalid or expired token" }); }
}
```
`middlewares/role.middleware.ts`
```ts
import type { Request, Response, NextFunction } from "express";
export const requireRole = (...roles: string[]) => (req: Request, res: Response, next: NextFunction) =>
  req.user && roles.includes(req.user.role) ? next() : res.status(403).json({ message: "Forbidden" });

export const adminOnly = requireRole("admin");
export const fdstaffOnly = requireRole("frontdesk-staff");
export const doctorOnly = requireRole("doctor");
export const labstaffOnly = requireRole("laboratory-staff");
```
Patient middleware: see `techcare-auth-rbac`.

### Routes (guards unconditional)
```ts
// routes/fdstaff.route.ts
import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { fdstaffOnly } from "../middlewares/role.middleware.js";
import { getAllPatients } from "../controllers/fdstaff/getRequests.controller.js";
import { addPatient, addConsultationRequest } from "../controllers/fdstaff/postRequests.controller.js";

const router = Router();
router.use(authMiddleware, fdstaffOnly);          // no IS_PRODUCTION check
router.get("/patients", getAllPatients);
router.post("/patients", addPatient);
router.post("/consultation-requests", addConsultationRequest);
export default router;
```

### Auth controller (users, then patients; access token only)
```ts
// controllers/auth/postRequests.controller.ts
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sql } from "../../config/db.js";
import { ENV } from "../../config/env.js";

export async function login(req: Request, res: Response) {
  const { username, password } = req.body ?? {};
  if (!username || !password) return res.status(400).json({ message: "Username and password are required" });

  const [user] = await sql`SELECT * FROM users WHERE username = ${username} OR email = ${username}`;
  const [patient] = user ? [] : await sql`SELECT * FROM patients WHERE username = ${username} OR email = ${username}`;
  const account = user ?? patient;
  if (!account || !(await bcrypt.compare(password, account.password_hash)))
    return res.status(401).json({ message: "Invalid credentials" });
  if (account.account_status === false) return res.status(403).json({ message: "Account is deactivated" });

  const accountType = user ? "user" : "patient";
  const id = user ? user.user_id : patient.patient_id;
  if (user) await sql`UPDATE users SET active = TRUE, last_login = now() WHERE user_id = ${id}`;

  const token = jwt.sign({ user_id: id, account_type: accountType }, ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
  const { password_hash, ...safe } = account;
  res.json({ message: "Login successful", accountType, user: safe, token });
}
```

### Worked example: patients + atomic consultation request (no pool, no locks)
```ts
// controllers/fdstaff/dto/post.dto.ts
export namespace AddConsultationRequest {
  export interface body { patient_id: string; service_id: string; is_priority?: boolean }
  export interface response { message: string; queue: { queue_id: string; queue_number: number } }
  export interface error { message: string }
}
```
```ts
// controllers/fdstaff/postRequests.controller.ts
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { sql } from "../../config/db.js";
import { publishQueueChange } from "../../services/queue-sse/index.js"; // optional
import type { AddConsultationRequest as C } from "./dto/post.dto.js";

export async function addPatient(req: Request, res: Response) {
  const { first_name, last_name, birthdate, sex, address, email, contact_number } = req.body ?? {};
  if (!first_name || !last_name || !birthdate || !sex || !address || !email || !contact_number)
    return res.status(400).json({ message: "Missing required fields" });

  const [dup] = await sql`SELECT 1 FROM patients WHERE LOWER(first_name)=LOWER(${first_name})
    AND LOWER(last_name)=LOWER(${last_name}) AND birthdate=${birthdate} AND contact_number=${contact_number}`;
  if (dup) return res.status(409).json({ message: "Patient already exists" });

  const hash = await bcrypt.hash(String(last_name).toLowerCase(), 10);   // default password = last name
  const [row] = await sql`
    WITH ins AS (
      INSERT INTO patients (first_name, last_name, birthdate, sex, address, email, contact_number, password_hash)
      VALUES (${first_name}, ${last_name}, ${birthdate}, ${sex}, ${address}, ${email}, ${contact_number}, ${hash})
      RETURNING patient_id
    )
    UPDATE patients SET username = patient_id FROM ins WHERE patients.patient_id = ins.patient_id
    RETURNING patients.patient_id, first_name, last_name`;
  res.status(201).json({ message: "Patient created", patient: row });
}

export async function addConsultationRequest(
  req: Request<{}, C.response | C.error, C.body>, res: Response<C.response | C.error>) {
  const { patient_id, service_id, is_priority = false } = req.body ?? ({} as C.body);
  if (!patient_id || !service_id) return res.status(400).json({ message: "patient_id and service_id are required" });

  const [svc] = await sql`SELECT room FROM services WHERE service_id=${service_id}
                          AND service_type='consultation' AND active`;
  if (!svc) return res.status(404).json({ message: "Service not found" });

  // ONE statement = atomic: counter bump + queue entry + consultation record
  const [row] = await sql`
    WITH n AS (
      INSERT INTO queue_counters (day, room, last_number)
      VALUES ((now() AT TIME ZONE 'Asia/Manila')::date, ${svc.room}, 1)
      ON CONFLICT (day, room) DO UPDATE SET last_number = queue_counters.last_number + 1
      RETURNING last_number
    ), q AS (
      INSERT INTO queue_entries (queue_type, room, patient_id, queue_number, is_priority)
      SELECT 'consultation', ${svc.room}, ${patient_id}, last_number, ${is_priority} FROM n
      RETURNING queue_id, queue_number
    ), c AS (
      INSERT INTO consultation_records (patient_id, service_id, queue_id, status, requested_by)
      SELECT ${patient_id}, ${service_id}, queue_id, 'In Queue', ${req.user!.user_id} FROM q
      RETURNING consultation_record_id
    )
    SELECT q.queue_id, q.queue_number FROM q, c`;
  publishQueueChange();
  res.status(201).json({ message: "Added to queue", queue: row as C.response["queue"] });
}
```

### Optional: SSE
Copy the `services/queue-sse/` folder from **techcare-sse-realtime**. Not needed for launch? Delete the import from `server.ts` and the `publishQueueChange()` calls; the app works without it.

## 2. Frontend foundation

`vite.config.ts`
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { "/api": "http://localhost:5000" } },   // always local, never prod
});
```
`lib/axios.ts`
```ts
import axios from "axios";
export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL ?? "" }); // "" = same origin (monolith)
api.interceptors.request.use((cfg) => {
  const t = sessionStorage.getItem("token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
api.interceptors.response.use((r) => r, (err) => {
  if (err.response?.status === 401) { sessionStorage.clear(); window.location.assign("/login"); }
  return Promise.reject(err);
});
```
`lib/ProtectedRoute.tsx`
```tsx
import { Navigate } from "react-router";
export default function ProtectedRoute({ allowedRoles, children }: { allowedRoles: string[]; children: React.ReactNode }) {
  const token = sessionStorage.getItem("token"), role = sessionStorage.getItem("role");
  if (!token || !role || !allowedRoles.includes(role)) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```
`App.tsx`
```tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import ProtectedRoute from "./lib/ProtectedRoute";
// import LoginPage, Admin, Doctor, FrontdeskStaff, LaboratoryStaff, Patient ...
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><Admin /></ProtectedRoute>} />
        <Route path="/doctor" element={<ProtectedRoute allowedRoles={["doctor"]}><Doctor /></ProtectedRoute>} />
        <Route path="/frontdesk-staff" element={<ProtectedRoute allowedRoles={["frontdesk-staff"]}><FrontdeskStaff /></ProtectedRoute>} />
        <Route path="/laboratory-staff" element={<ProtectedRoute allowedRoles={["laboratory-staff"]}><LaboratoryStaff /></ProtectedRoute>} />
        <Route path="/patient" element={<ProtectedRoute allowedRoles={["patient"]}><Patient /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```
Role shell pattern (`users/<role>/<Role>.tsx` with `?page=` + `pages/` + `components/<Feature>/`) is unchanged, see **techcare-feature-scaffold**. Keep the nested component folder rule: a component's child-only components live in a `Parent/` folder beside `Parent.tsx` (e.g. `DetailModal.tsx` + `DetailModal/SalesDetails.tsx`); feature-wide helpers stay at the feature root.

## 3. Deploy (Render monolith, one service)

Root `package.json`
```json
{
  "scripts": {
    "build": "npm --prefix frontend install --include=dev && npm --prefix frontend run build && npm --prefix backend install --include=dev && npm --prefix backend run build && npm --prefix backend run db:init",
    "start": "npm --prefix backend start"
  }
}
```
`render.yaml`
```yaml
services:
  - type: web
    name: techcare
    runtime: node
    plan: free
    buildCommand: npm run build
    startCommand: npm run start
    healthCheckPath: /api/health
    envVars:
      - { key: DATABASE_URL, sync: false }
      - { key: JWT_SECRET, generateValue: true }
      - { key: JWT_EXPIRES_IN, value: 1d }
      - { key: NODE_ENV, value: production }
      - { key: CLOUDINARY_CLOUD_NAME, sync: false }
      - { key: CLOUDINARY_API_KEY, sync: false }
      - { key: CLOUDINARY_API_SECRET, sync: false }
```
`db:init` runs in the build because it is idempotent and additive; it needs `DATABASE_URL` at build time, which Render provides.

### First deploy checklist
1. Create Neon project, copy the pooled connection string into `DATABASE_URL`.
2. Push to GitHub, create the Render web service (or Blueprint from `render.yaml`).
3. After the first successful deploy, open Render Shell: `ADMIN_USERNAME=admin ADMIN_PASSWORD='<strong>' npm --prefix backend run admin:create`.
4. Visit `/api/health` -> `{"ok":true}`, then `/login`.
5. Log in as admin, create services (with `room`), then staff users.

### MVP smoke test (do this before calling it done)
- `GET /api/health` 200; `GET /api/nope` is JSON 404 (not HTML).
- Login wrong password -> 401; deactivated user -> 403; no token on `/api/fdstaff/patients` -> 401; doctor token on `/api/admin/users` -> 403.
- Create patient -> consultation request -> queue entry number 1, second request number 2, new day resets.
- Refresh a deep link (`/admin?page=users`) -> app loads (SPA fallback).

## Rules for staying MVP
- Never add `syncSchema`-style code. New columns = new numbered `.sql` file.
- Never write an ID in TypeScript. Add a sequence + DEFAULT in SQL.
- Never branch on `NODE_ENV` for security. Auth is the same everywhere.
- Never `SELECT *` a user into a response (strip `password_hash`).
- If you need multi-step writes, prefer one CTE statement; use `pool.connect()` + `BEGIN/COMMIT` only when step N depends on application logic from step N-1.
---
name: techcare
description: Deep, code-verified reference for the TechCare clinic management system monorepo (Express 5/TypeScript + Neon Postgres backend, React 19/Vite/Tailwind frontend). Use this skill whenever working on the TechCare codebase — adding or fixing API routes/controllers, changing the Postgres schema (TABLES/syncSchema in db.ts), wiring frontend pages under frontend/src/users/**, debugging JWT/role middleware, the live queue monitor (SSE), consultations/prescriptions, laboratory requests/results/form templates, billing, patient login, seed scripts, tests, or the tools/ ETL scripts. Trigger on mentions of "TechCare", clinic management system, front desk / doctor / lab staff / admin / patient dashboards, queue_entries, consultation_records, laboratory_request_items, publishQueueChange, or any file path under backend/src or frontend/src. Also use to explain the project to a new contributor or to make changes consistent with existing (sometimes inconsistent) conventions.
---

# TechCare Clinic Management System

TechCare is a full-stack clinic information system for Reyna G. Diagnostic
Medical Clinic: patient registration (with patient login accounts), a
consultation and laboratory queue, doctor consultations and prescriptions,
laboratory requests, results and result release, billing/payment
confirmation, admin user/service/form-template/activity management, and a
live Queue Monitor driven by Server-Sent Events.

This skill is derived from reading the repository source, not from the
project's README. Where the code diverges from what you would expect (and
it does in several places, because the schema was reworked and not every
controller was migrated), it is called out in **Known Issues & Gotchas**.
Read that section before editing anything queue-, doctor- or
history-related.

## Status at a glance

| Area | Backend | Frontend | Notes |
|---|---|---|---|
| Auth (login, logout, ping) | Working | Working | Users **and** patients log in at `POST /api/auth/login`. No sign-up or refresh endpoint exists. |
| Admin: users, services, form templates, activity log, queue monitor | Working | Working | Router is always JWT + `admin` gated. |
| Front desk: patients, consultation requests, lab requests, payment confirmation, billing history, queue lists | Working | Working | Legacy serve/skip queue endpoints and `POST /billing` are broken. |
| Laboratory staff: queue, specimen flow, analysis, results, release | Working | Working | UI is pinned to `"Laboratory Room 2"`. |
| Doctor: findings, prescriptions, lab orders, queue, history | **Partly broken** | Partly mock | Several queries use columns that no longer exist (`doctor_id`, `queue_entries.service_id`). |
| Patient portal | Stub | Partly wired | Frontend calls routes that do not exist; real routes are unauthenticated. |
| Public queue tracking page | none | Commented out | `QueueTracking` was removed from routing. |
| WebSocket server | Dead code | none | Replaced by SSE. |

## Repository layout

```
TechCare-main/
├── package.json                 # root scripts: dev/build/start delegate with --prefix
├── README.md                    # architecture mermaid graph (kept in sync with this skill)
├── .github/skills/techcare/SKILL.md   # this file
├── docs/
│   ├── SETUP.md                 # env vars, deployment scenarios, seeding, troubleshooting
│   └── notes/reponse-types.md   # notes on Express res.* methods for SSE
├── backend/                     # Express 5 + TypeScript, ESM ("type": "module")
│   ├── package.json             # dev: nodemon+tsx, build: npm install && tsc, test: vitest, seed:* scripts
│   └── src/
│       ├── server.ts            # boot: connectNeon, syncSchema (prod only), listen, SIGTERM/SIGINT -> closeAllQueueStreams
│       ├── app.ts               # builds the Express app: CORS, json, routers, static frontend/dist, SPA fallback
│       ├── websocket.ts         # ws server, DEAD CODE (import commented out in server.ts)
│       ├── config/
│       │   ├── db.ts            # `sql` (neon http) + `pool` (neon Pool), TABLES array, connectNeon(), syncSchema()
│       │   ├── env.ts           # ENV.* (dotenv; .env.test when NODE_ENV=test)
│       │   └── cloudinary.ts
│       ├── middlewares/
│       │   ├── auth.middleware.ts      # Bearer JWT -> SELECT * FROM users -> req.user
│       │   ├── admin|fdstaff|doctor|labstaff.middleware.ts   # role string checks on req.user.role
│       │   ├── patient.middleware.ts   # JWT with account_type=patient; sets res.locals.patientId
│       │   ├── multer.middleware.ts    # `upload`: disk temp storage, jpeg/jpg/png/webp, 5 MB
│       │   └── test.middleware.ts      # authenticateToken for /api/test only
│       ├── routes/
│       │   ├── auth.route.ts, admin.route.ts, fdstaff.route.ts,
│       │   ├── doctor.route.ts, labstaff.route.ts, patient.route.ts
│       │   └── tests/{test.routes.ts, sse.routes.ts}   # demo routes at /api/test and /api/sse
│       ├── controllers/<role>/
│       │   ├── getRequests / postRequests / updateRequests / deleteRequest(s) .controller.ts
│       │   └── dto/{get,post,update,delete}.dto.ts     # TypeScript namespaces: body/response/error types per handler
│       │   (auth, admin, fdstaff, doctor, labstaff, patient; fdstaff also has getMedicalHistory.controller.ts;
│       │    test.controller.ts and test/sse/ are demo code)
│       ├── services/queue-sse/{index,queueStream.handlers,queueStream.hub}.ts   # live Queue Monitor
│       ├── utils/
│       │   ├── generateId.ts            # all human-readable ID generators + queue numbers
│       │   ├── generateConsultationId.ts# second CR- generator, used only by doctor controller
│       │   ├── consultationValidation.ts# validateFindings / validateLabRequest (ICD-10 regex, limits)
│       │   ├── activityLogger.ts        # logActivity() -> activity_logs (needs rows in `actions`)
│       │   ├── formComponentTypes.ts    # registerFormComponentTypes() upsert of builder field types
│       │   ├── resolveDoctorId.ts       # doctor id from req.user, or body.doctor_id outside production
│       │   ├── getQueueMonitorEntries.ts# masked queue snapshot, UNUSED
│       │   └── calculateAge.ts          # duplicated in frontend/src/utils
│       ├── scripts/{seed.ts, seedBulk.ts}  # run via npm run seed / seed:reset / seed:bulk / seed:all
│       ├── seed/seed.sql                # sample data, every password is "password"
│       ├── tests/{setup.ts, helper/, integration/, unit/}
│       └── types/express.d.ts
├── frontend/                    # React 19 + Vite 8 + Tailwind 4 + react-router 8, TypeScript
│   ├── package.json             # imports map: #components/* #lib/* #hooks/*
│   ├── vite.config.ts           # /api proxy (see Gotcha 14)
│   ├── components.json          # shadcn config
│   ├── tests/laboratoryPrint.{test,browser}.mjs
│   └── src/
│       ├── main.tsx, App.tsx    # BrowserRouter + Routes
│       ├── auth/                # LoginPage, SignupPage (dead), ClinicSlideshow, LeftSideBackground
│       ├── components/          # shared SideBar.tsx, Header.tsx, Header/UserHeader.tsx
│       ├── lib/                 # axios.ts, env.config.ts, ProtectedRoute.tsx, utils.ts, protectRoute.ts (empty)
│       ├── interface/           # shared TS types: Activity, Billing, FormTemplate, HistoryRecord, Patient, Queue, Service, User, lab types
│       ├── services/queue-sse/connectQueueStream.ts   # SSE client
│       ├── utils/               # calculateAge, cnhelper, patientRecordPrintTemplate
│       └── users/{admin,doctor,frontdesk_staff,laboratory_staff,patient,test/sse}
└── tools/                       # standalone ETL (pipeline.py, messydata.ipynb, sample CSVs); not wired into the app
```

## Tech stack

- **Backend**: Node, Express 5, TypeScript 6, ESM (imports use `.js` extensions even for `.ts` files), `@neondatabase/serverless` (tagged-template `sql` and a `Pool`), `jsonwebtoken`, `bcryptjs`, `multer` + `cloudinary`, `cors`, `dotenv`. Tests: `vitest` + `supertest`.
- **Database**: Neon Postgres, no ORM, no migration files. `backend/src/config/db.ts` (`TABLES`) is the single source of truth for the schema.
- **Frontend**: React 19, Vite 8, Tailwind 4, `react-router` 8, `axios`, `@microsoft/fetch-event-source`, shadcn/ui (`@base-ui/react`, `class-variance-authority`), `lucide-react`, `html2canvas` (patient ID card export).
- **Realtime**: SSE only (`services/queue-sse`). `ws` is still a dependency but unused.
- **Hosting**: Render. Monolith at `https://techcare-1.onrender.com/` (backend also serves `frontend/dist`); a separate backend-only deployment is `https://techcare-hui6.onrender.com/` (see `docs/SETUP.md`).

## Architecture

```
Browser (React SPA, token in sessionStorage)
   │ axios (Bearer)                     │ fetch-event-source (Bearer) -> /api/admin/queue/stream
   ▼                                    ▼
Express app (app.ts)
   /api/test /api/sse   (demo)
   /api/auth  /api/admin  /api/fdstaff  /api/labstaff  /api/doctor  /api/patient
   everything else -> express.static(frontend/dist) -> index.html (SPA fallback, ANY method)
   ▼
Router -> authMiddleware -> role middleware -> controller -> sql`` / pool -> Neon Postgres
                                                  └─ after queue mutations: publishQueueChange() -> SSE hub
```

### Which middleware is actually applied

| Router | When JWT + role middleware run |
|---|---|
| `/api/admin` | **Always** (`router.use(authMiddleware, adminMiddleware)` is outside the `IS_PRODUCTION` check; it is also registered a second time inside it). Role must equal `"admin"`. |
| `/api/fdstaff` | Only when `ENV.IS_PRODUCTION`. Role must equal `"frontdesk-staff"`. |
| `/api/doctor` | Only when `ENV.IS_PRODUCTION`. Role must equal `"doctor"`. |
| `/api/labstaff` | Only when `ENV.IS_PRODUCTION`. Role must equal `"laboratory-staff"`. |
| `/api/patient` | `patientMiddleware` on one route only; the others are open. |
| `/api/auth` | `PATCH /logout` uses `authMiddleware`; login and ping are public. |

Consequences: with `IS_PRODUCTION=false`, `req.user` is undefined on
fdstaff/doctor/labstaff routes. Code that needs a user must tolerate that
(`resolveDoctorId` accepts `body.doctor_id` outside production) or, as the
front desk controllers do, hardcode a user (Gotcha 5). In production the
role middleware returns 401 (admin returns 403) on a wrong role.

### Role strings (exact, lowercase, hyphenated)

`admin`, `doctor`, `frontdesk-staff`, `laboratory-staff`, `patient`. These
are stored in `users.role` / `patients.role`, compared by the middleware,
used by `ProtectedRoute`, and used as the post-login route (`/${role}`),
so they must match the frontend route paths exactly.

## Database schema (`TABLES` in `backend/src/config/db.ts`)

Every table has `SERIAL id`; foreign keys point at the **string** business
IDs (e.g. `patient_id`), not the serial id. Users and patients are
separate tables with similar columns (`password_hash`, not `password`).

| Table | Key columns and notes |
|---|---|
| `users` | `user_id` (unique), `username`, `password_hash`, `first_name/middle_name/last_name/suffix`, `sex`, `email` (unique), `contact_number`, `emergency_contact(_name)`, `address`, `birthdate`, `role`, `department`, `employment_status`, `date_hired`, `shift_start/shift_end`, `last_login`, `account_status` (false = deactivated, login returns 403), `active` (online flag set on login/logout), `profile_photo`. |
| `patients` | `patient_id` (unique), `username` (= patient_id when created by front desk), `password_hash` (default password is the last name), same personal columns as users, `civil_status`, `blood_type`, `image_url`, `role` default `'patient'`, `account_status`, `active`. |
| `services` | `service_id`, `service_type` (`consultation` / `laboratory`), `service_name` (unique), `price`, `active`, `room` (e.g. `Consultation Room`, `Laboratory Room 1/2`), `service_category`. |
| `packages` | `package_id` serial, `package_name`, `package_price`, `service_ids VARCHAR[]`. No controller uses it yet. |
| `queue_entries` | `queue_id` (`CONS-####` / `LAB-####`), `patient_id`, `queue_number`, `is_priority`, `status`. **No `service_id` or `service_type`**: the service is reached through `consultation_records.queue_id` or `laboratory_request_items.queue_id`. |
| `consultation_records` | `consultation_record_id`, `patient_id`, `service_id`, `queue_id`, `status` (default `'Created'`), `cancellation_reason`, `is_paid`, `requested_by` → users, `consulted_by` → users, `consultation_type` (`Initial`), JSONB `diagnosis`, `presenting_complaint`, `vital_signs`, `physical_examination`, `notes`, `requested_at`, `consulted_at`. **There is no `doctor_id`.** |
| `prescription_records` | `prescription_id` (`RX-…`), `consultation_record_id`, `patient_id`, `prescriber_id`, `valid_until`, `status` (`Active`), `prescription_items` JSONB (`[{medication,dosage,frequency,duration?,instructions?}]`), `notes`. |
| `laboratory_requests` | `request_id` (`LR-…`), optional `consultation_record_id`, `patient_id`, `requested_by`, `status` (`Requested` → `Paid`), `is_paid`, `is_priority`, `request_date`, `estimated_release_date`, `requested_at`. |
| `laboratory_request_items` | `lab_item_id` (`LI-…`), `request_id`, `service_id`, `processed_by`, `queue_id` (set when payment forwards it to a room queue), `status`, `reason`. One row per ordered test. |
| `laboratory_results` | `result_id` (`RES-<uuid>`), `lab_item_id`, `results` JSONB (`[{name,result,…}]`), `status` (`Pending` → `Released`), `remarks`, `image_url`, `verified_by/at`. |
| `form_templates` | `form_id` (`F-<timestamp>`), `form_name`, `form_description`, `service_id`, `status` (`Published` etc.; only one Published per service), `created_by`, `version` (incremented on update). |
| `form_components` | `form_component_id` (`FC-<form_id>-<index>`), `form_id`, `type_id` → `form_component_types`, `label`, `field_key`, `display_order`, JSONB `settings`, `validation`. |
| `form_component_types` | `type_id`, `type_name`, `data_type`. Seeded values: `text_field number_field checkbox date_field table section_header static_text line_divider image`. |
| `bills` | `bill_id`, `patient_id`, `items` JSONB, `discount_pct`, `total_amount`, `payment_method`, `status` (`Unpaid`), `receipt_id`, `receipt_issued_at`, `billed_at`. |
| `actions` | `action_id` serial, `action_name` (unique, e.g. `user.deactivate`), `module`, `is_sensitive`. Lookup for the audit log. |
| `activity_logs` | `user_id`, `action_id` → actions, `status` (`success`/`failure`/`blocked`), `target_type`, `target_id`, `metadata` JSONB. **Current audit log**, written by `logActivity()`. |
| `system_activity` | Legacy audit table (`activity_id`, `user_id`, `service_name` → services). Still written by `POST /api/admin/activities` and read by `GET /api/admin/activity`. |
| `sse_test` | Demo table for `/api/sse`. |

### How the schema is managed

- `connectNeon()` (runs on every boot): `CREATE TABLE IF NOT EXISTS` for each entry, plus additive `ALTER TABLE … ADD COLUMN IF NOT EXISTS` repairs for `laboratory_results` (`status`, `released_at`, `released_by`) and `consultation_records.cancellation_reason`.
- `syncSchema(onlyTables?)` runs **automatically on boot when `IS_PRODUCTION=true`** (see `server.ts`). It makes the DB match `TABLES` exactly: it **drops tables not in `TABLES`** (`DROP … CASCADE`), adds missing columns and **drops columns not listed in each table's `columns` map**. Never run it against a database holding data you care about without reading `TABLES` first.
- **To change a column you must edit two places** in the table entry: the `createSQL` string (fresh DBs) and the `columns` object (what `syncSchema` compares). They have drifted in places (Gotcha 11).
- `createSQL` does not alter existing tables. On a non-production database, either call `syncSchema(["table"])` once or add an explicit additive `ALTER` to `connectNeon()`.

### Seeding

`npm run seed` (insert, idempotent via `ON CONFLICT DO NOTHING`), `npm run seed:reset -- --force` (TRUNCATE ... RESTART IDENTITY then insert), `npm run seed:bulk` (hundreds of synthetic patients, staff and queue rows; `SEED_PATIENTS`, `SEED_STAFF`, `SEED_QUEUE_ENTRIES`), `npm run seed:all`. Seeding refuses to run when `IS_PRODUCTION` or `NODE_ENV=production` unless `--force`. Seed accounts, all with password `password`: `admin101`, `doctor201`, `doctor202`, `fdstaff322` (id `U-26-1001-0004`, the id hardcoded in front desk controllers), `fdstaff323`, `labstaff122` (Laboratory Room 2), `labstaff123`, `fdstaff324` (deactivated), patients `patient101`–`patient108`. Rows for "today" are stamped relative to `CURRENT_DATE`, since the queue endpoints only return today's rows. `seed.ts` rewrites an old `queue_entries` INSERT shape (strips a `service_id` column) before running `seed.sql`.

## Status vocabularies (casing is inconsistent: always compare with `LOWER()`)

| Entity | Values seen in code |
|---|---|
| `queue_entries.status` | `waiting` (column default), `Waiting` (written by lab payment forwarding), `serving`/`Serving`, `skipped`, `Completed`, `Cancelled`, `completed`. Queries use `LOWER(status)`. `getQueueMonitorEntries` lowercases for the monitor. |
| `consultation_records.status` | default `Created`; front desk inserts `In Queue`. `GET /api/fdstaff/queue-requests` lists rows with `status = 'Created'`. |
| `laboratory_requests.status` | `Requested` → `Paid` (set by payment confirmation together with `is_paid=TRUE`). |
| `laboratory_request_items.status` | `Requested` → `Waiting` (forwarded to a room queue) → `Specimen Collected` (queue entry completed) → `In Progress` (analysis started) → `Completed` (result saved). |
| `laboratory_results.status` | `Pending` → `Released`. Only `Released` rows are returned by the "released results" endpoints. |
| `bills.status` | `Unpaid`, `Paid`. |

### Laboratory flow (end to end)

1. Doctor (`POST /api/doctor/laboratory-requests`) or front desk (`POST /api/fdstaff/laboratory-requests`) creates a `laboratory_requests` row plus one `laboratory_request_items` row per service (status `Requested`, `is_paid=FALSE`).
2. Front desk sees it in `GET /api/fdstaff/billing/unpaid-lab` and confirms payment with `PATCH /api/fdstaff/laboratory-requests/:request_id`. In one transaction this creates a `LAB-####` queue entry **per room** (queue number is per room per Manila day), links the items (`queue_id`, status `Waiting`), sets the request `is_paid=TRUE, status='Paid'`, then calls `publishQueueChange()`.
3. Lab staff accept (`…/laboratory-queues/:queue_id/accept`, body `{room}`) → `Serving`; complete (`…/complete`) → items become `Specimen Collected`; skip moves the entry back; cancel sets `Cancelled`.
4. `PATCH /api/labstaff/laboratory-requests/analysis/start` → items `In Progress`.
5. `POST /api/labstaff/laboratory-results/:lab_item_id` (body `{results[], remarks?, image_url?, room}`) upserts a `Pending` result and sets the item `Completed`.
6. `PATCH /api/labstaff/laboratory-results/:result_id/release` → result `Released`; it then shows up in the released-results endpoints.

### Consultation flow

Front desk `POST /api/fdstaff/consultation-requests` `{patient_id, service_id, is_priority}` creates a `CONS-####` queue entry **and** a `consultation_records` row (`In Queue`) in one transaction, then `publishQueueChange()`. The doctor side (findings, prescriptions, queue) is only partly working; see Gotchas 1–4.

## ID generation (`utils/generateId.ts`)

IDs are generated app-side by reading the max existing value for a scope and incrementing. Transactional generators take a `PoolClient` and are called after `pg_advisory_xact_lock(hashtext('…'))`.

| Entity | Format | Resets |
|---|---|---|
| User | `U-YY-MMDD-NNNN` | daily |
| Patient | `P-YY-MMDD-NNNN` | daily |
| Service | `S-YY-MM-NNN` | monthly |
| System activity | `ACT-YYMMDD-HHMM-NNNN` | per minute |
| Laboratory request | `LR-YY-MMDD-NNNN` | daily |
| Laboratory item | `LI-YY-MMDD-NNNN` | daily |
| Consultation record | `CR-YY-MMDD-NNNN` | daily (two generators: `generateConsultationRecordId` in generateId.ts, `generateConsultationRecordID` in generateConsultationId.ts) |
| Prescription | `RX-YY-MMDD-NNNN` | daily |
| Consultation queue / Lab queue | `CONS-NNNN` / `LAB-NNNN` | never (monotonic) |
| Lab result | `RES-<uuid>` | n/a |
| Form template / component | `F-<Date.now()>` / `FC-<form_id>-<index>` | n/a |

Queue **numbers** (display order) differ from queue IDs: consultation numbers are `MAX+1` per Manila day across all `CONS-` entries; lab numbers are `MAX+1` per Manila day **per room**.

## Authentication

`POST /api/auth/login` body `{username, password}` (username may also be the email). It looks in `users` first, then `patients`. Responses: 400 missing fields, 401 unknown account / wrong password, 403 deactivated user, 200 `{message, accountType: "user"|"patient", user (without password_hash), token, refreshToken}`. Users get `active=TRUE, last_login=now`; patients get `updated_at` bumped. Tokens carry `{user_id, account_type}` (for patients, `user_id` is the `patient_id`). Access token lifetime is `JWT_EXPIRES_IN` (default `1d`); the refresh token is signed with `JWT_REFRESH_TOKEN` (default expiry `7d`). **Nothing consumes the refresh token** (no refresh endpoint, frontend ignores it). `PATCH /api/auth/logout` (needs token) sets `users.active=FALSE`. `GET /api/auth/ping` is a keep-alive used by the login page.

`authMiddleware` verifies the JWT with `process.env.JWT_SECRET`, loads the full `users` row into `req.user` (so patient tokens fail with 401 "User not found" there), and returns 401 for missing/invalid/expired tokens. `patientMiddleware` instead requires `account_type === "patient"` and an active `patients` row.

Frontend: `LoginPage` stores `token`, `role`, `user` in **`sessionStorage`** (not localStorage), then `navigate('/' + role)`. `lib/axios.ts` attaches `Authorization: Bearer <token>` from `sessionStorage`.

## API reference

Only routes that exist in the code are listed. ✅ = works against the current schema, ⚠️ = broken or unsafe (see Gotchas).

### `/api/auth`
`POST /login` ✅, `PATCH /logout` ✅ (auth), `GET /ping` ✅. There is no `/sign-up` even though `SignupPage.tsx` posts to `/api/auth/sign-up`.

### `/api/admin` (always JWT + `admin`)
| Method | Path | Handler | Notes |
|---|---|---|---|
| GET | `/queue/stream` | `streamQueue` | SSE stream (see SSE section), 503 when 50 screens are connected |
| GET | `/queue/stream/stats` | `getQueueStreamStats` | connected screen count |
| GET | `/queues` | `getAllQueueEntries` (shared with fdstaff) | today's queue, used by the monitor |
| GET | `/services` | `getAllservices` | all services, including inactive |
| GET | `/activity` | `getMyActivities` | caller's rows from legacy `system_activity` |
| GET | `/activities` | `getAllActivities` | `activity_logs` JOIN `actions`, newest first |
| GET | `/users` | `getAllUsers` | explicit column list, no password hash |
| GET | `/form-templates`, `/form-templates/:form_id` | list (filters `service_id`, `status`) / template + components |
| POST | `/add-user` | `addUser` | multipart, optional `image` → Cloudinary `techcare/user_photos`; requires username, password, names, sex, email, contact, address, birthdate, role, date_hired; 409 on duplicate username/email/contact; returns user without hash |
| POST | `/services` | `addService` | requires `service_name, price, service_type, service_category, room` |
| POST | `/activities` | `addActivity` | writes legacy `system_activity` for `req.user` |
| POST | `/actions` | `addAction` | adds an `actions` row |
| POST | `/form-templates` | `addFormTemplates` | `{form_name, service_id, created_by, status?, form_components[]}`; one Published template per service. Does **not** call `registerFormComponentTypes` (Gotcha 9) |
| PUT | `/form-templates/:form_id` | `updateFormTemplate` | transaction: registers component types, bumps `version`, replaces all components |
| PATCH | `/users/:user_id` | `updateUser` | multipart, partial update, re-hashes password only if given, nullable fields distinguish "omitted" from "null" |
| PATCH | `/users/status/:user_id` | `updateUserStatus` | `{account_status: boolean}`; blocks self-deactivation (logged as `blocked`); writes `activity_logs` via `logActivity` (needs `user.activate`/`user.deactivate` in `actions`) |
| DELETE | `/form-templates/:form_id` | `deleteTemplate` | |

### `/api/fdstaff` (JWT + `frontdesk-staff` in production)
| Method | Path | Notes |
|---|---|---|
| GET | `/patients` | ✅ all patients |
| GET | `/services` | ✅ uses the **admin** `getAllservices`, so inactive services are included (the fdstaff `getAllServices` that filters `active` is exported but not routed) |
| GET | `/queues` | ✅ today's entries joined to patient, consultation/lab service, room |
| GET | `/queue-requests` | ✅ paid lab items still `Requested` plus consultations with status `Created` |
| GET | `/billing` | ✅ `bills` plus synthetic "laboratory_confirmation" rows for paid lab requests with no bill |
| GET | `/billing/unpaid-lab` | ✅ unpaid lab requests with items |
| GET | `/patients/medical-history/:patient_id` | ✅ combined consultation + lab history, optional filters |
| GET | `/patients/medical-history/details/:record_type/:record_id` | ✅ |
| GET | `/patients/:patient_id/print` | ⚠️ queries nonexistent `lab_requests` |
| GET | `/patients/:patient_id/medical-history` | ⚠️ stale columns/tables (`cr.findings`, `cr.doctor_id`, `q.service_id`, `lab_requests`); not used by the frontend |
| POST | `/patients` | ✅ multipart `image` optional → Cloudinary `techcare/patients`; requires names, birthdate, sex, address, email, contact; duplicate check on name+dob+contact+email; creates a login (`username = patient_id`, password = last name) |
| POST | `/consultation-requests` | ✅ transaction: queue entry + consultation record; hardcoded requester id |
| POST | `/laboratory-requests` | ✅ transaction; hardcoded requester id |
| POST | `/billing` | ⚠️ inserts into nonexistent `services_ids` and omits required `bill_id`; will throw |
| PUT | `/patients/:patient_id` | ✅ partial update via COALESCE. The route has `upload.single("image")` but the handler **never updates `image_url`** |
| PATCH | `/laboratory-requests/:request_id` | ✅ confirm payment and forward to lab queues |
| PUT | `/queues/:queue_id` | ⚠️ `serveQueueEntry` selects nonexistent `queue_entries.service_type`; 500 |
| PATCH | `/queues/:queue_id` | ⚠️ `skipQueueEntry`, same problem |
| DELETE | `/queues/:queue_id`, `/patients/:patient_id` | ✅ hard deletes + `publishQueueChange()` (patient delete fails on FK if the patient has records) |
| POST | `/queues` | route commented out, but two frontend components still call it (404 → HTML) |

### `/api/doctor` (JWT + `doctor` in production)
| Method | Path | Notes |
|---|---|---|
| POST | `/laboratory-requests` | ⚠️ works without `consultation_record_id`; with one it reads nonexistent `consultation_records.doctor_id` |
| POST | `/consultations` | ⚠️ INSERTs `doctor_id` (no such column) and does not create a queue link |
| POST | `/prescriptions/:consultation_record_id` | ⚠️ ownership check reads `doctor_id` |
| GET | `/consultation-queues/room/:room` | ⚠️ joins `services` on nonexistent `queue_entries.service_id` |
| GET | `/medical-history/:patient_id` | ✅ combined history |
| GET | `/medical-history/:record_type/:record_id` (+ `/full`) | ⚠️ consultation branch joins `cr.doctor_id` |
| GET | `/laboratory-results/:result_id` | ⚠️ ignores the id and returns **all** released results |
| PATCH | `/consultation-queues/:queue_id/skip` | ✅ moves a waiting/serving consultation entry back by two, sets `skipped`, publishes SSE |
| — | `laboratory-services`, `consultation-patients/:id`, accept/cancel | commented out in the router but called by `consultationsApi.ts` (404) |

### `/api/labstaff` (JWT + `laboratory-staff` in production)
GET: `/laboratory-queues/room/:room`, `/services/:room`, `/laboratory-queues/:queue_id/items`, `/laboratory-queues/:queue_id/request`, `/laboratory-requests/items/` (⚠️ filters status `'Collected'`, but the flow writes `'Specimen Collected'`, so it returns nothing), `/laboratory-results/form-templates/` (published templates with components), `/laboratory-results/analysis-items`, `/laboratory-results/saved`, `/laboratory-results` (released only). POST: `/laboratory-results/:lab_item_id`. PATCH: `/laboratory-requests/analysis/start`, `/laboratory-queues/:queue_id/{accept,skip,complete,cancel}` (each publishes SSE), `/laboratory-results/:result_id/release`. All ✅ against the current schema. `deleteRequests.controller.ts` is an empty file.

### `/api/patient`
`GET /laboratory-results/:result_id` (behind `patientMiddleware`, but returns **all** released results, Gotcha 6), `GET /medical-history/:patient_id` and `GET /prescriptions/:patient_id` (no auth, no ownership check). The first of these handlers (`getMedicalHistoryFull`) expects `:record_type/:record_id` params, so it does not match its route. `patientApi.ts` calls `/api/patient/consultations/:id`, which does not exist.

### `/api/test`, `/api/sse` (demo, mounted in all environments)
`/api/test`: `POST /sign-in` (signs a JWT from the raw request body, no password check), `POST /`, `GET /get-my-account` (legacy `authenticateToken`). `/api/sse`: `GET /stream-sse`, `POST /send-sse` (demo against `sse_test`). Do not copy these patterns; consider removing them before a real production hardening.

## Live Queue Monitor (SSE)

```
controller mutates queue_entries
   └─ publishQueueChange()           services/queue-sse/queueStream.hub.ts
        debounce 150 ms (one message per burst)
        └─ writes "event: queue-changed" to every connected screen
Admin QueueingMonitor page
   └─ connectQueueStream()           frontend/src/services/queue-sse/connectQueueStream.ts
        fetchEventSource(/api/admin/queue/stream, Authorization header, openWhenHidden)
        onopen (live) and every queue-changed -> loadQueue() -> GET /api/admin/queues
```

- SSE carries a signal, never queue data. The page always reloads from REST, including on every (re)connect.
- Hub: max 50 screens (503 beyond), `retry: 3000`, `ping` every 25 s, screens tracked in an in-memory `Set` (single-instance only). `closeAllQueueStreams()` runs on SIGTERM/SIGINT so `server.close()` does not hang.
- Client: 401/403 stops retrying (`unauthorized`), other errors retry with backoff (2 s, 4 s, 8 s, then 15 s max), 65 s of silence forces a reconnect. It uses `fetchEventSource` rather than `EventSource` because it needs the `Authorization` header.
- **Callers of `publishQueueChange()`**: fdstaff `addConsultationRecord`, `confirmLabRequestPayment`, `deleteQueue`, `deletePatient`; doctor `skipConsultationQueueEntry`; labstaff `acceptQueueEntry`, `completeQueueEntry`, `skipQueueEntry`, `cancelQueueEntry`. When you add a new controller that changes `queue_entries`, call it after the commit. The legacy fdstaff `serveQueueEntry`/`skipQueueEntry` do not.

## Frontend

### Routing (`App.tsx`)
| Path | Component | Guard |
|---|---|---|
| `/` | redirect to `/login` | |
| `/login`, `/sign-up` | `auth/LoginPage`, `auth/SignupPage` (sign-up has no backend) | |
| `/admin` | `users/admin/Admin.tsx` | `ProtectedRoute allowedRoles=["admin"]` |
| `/doctor` | `users/doctor/Doctor.tsx` | `["doctor"]` |
| `/frontdesk-staff` | `users/frontdesk_staff/FrontdeskStaff.tsx` | `["frontdesk-staff"]` |
| `/laboratory-staff` | `users/laboratory_staff/LaboratoryStaff.tsx` | `["laboratory-staff"]` |
| `/patient` | `users/patient/PatientInformation.tsx` | `["patient"]` |
| `/sse-protocols/{sse-send,SSEProtocols}` | demo pages | none |
| `/about` | placeholder | none |

`ProtectedRoute` only enforces in production builds (`import.meta.env.PROD`); in `vite dev` every route renders. It checks `sessionStorage` `token` and `role`. It is a display guard only; the backend must enforce access.

### Per-role module pattern
Each role folder keeps one shell component that owns page state and data loading, driven by a `?page=` query param (`useSearchParams`), with the shared `components/SideBar.tsx` and `components/Header.tsx`:

```
<Role>.tsx           shell: navItems, page state, loadData (Promise.allSettled of api.get calls), renders SideBar + Header + active page
  pages/<Feature>.tsx        one per sidebar destination
  components/<Feature>/...   feature components, grouped by feature folder
```

Data is passed down as props; there is no React Query/SWR or global store. Use `lib/axios.ts` (`api`), never raw `fetch`/`axios`, except the SSE client.

- **admin**: pages `AdminDashboard`, `UserManagement`, `ServicePricing`, `ActivityMonitoring`, `QueueingMonitor` (SSE, full-screen board, `components/QueueMonitor/QueueColumn`), `FormTemplate` (drag-and-drop builder: `TemplateBuilder`, `BuilderCanvas`, `ComponentPalette`, `ComponentSettings`, `TemplatePreview`, `TemplateLibrary`, `sampleTemplates`). Shell loads services, users and activities.
- **frontdesk_staff**: pages `FrontdeskDashboard`, `PatientRegistration` (+ `IdCard` via html2canvas), `PatientRecords`, `Queues`, `QueueManagement`, `ServiceRequest` (consultation/lab requests), `Billing` (unpaid lab confirmation + payment history), `PatientMedicalHistory`, `MedicalHistory` (history timeline components); `Test.tsx` is a leftover. Shell loads services, patients, queues, queue-requests, unpaid lab requests.
- **laboratory_staff**: pages `LabstaffDashboard`, `LaboratoryRequests` (queue panel, accept/skip/complete), `LaboratoryResults` (analysis list, form-template driven `ResultEntry`, release control, print view `laboratoryPrint.ts`, `laboratoryValidation.ts`, `reportTemplates.ts`, adapters/API modules). `room` is hardcoded to `"Laboratory Room 2"` in `LaboratoryStaff.tsx`.
- **doctor**: pages `DoctorDashboard`, `Consultation` / `PrescriptionPage` (`consultation/*`, `prescription/*` components), `ConsultationQueue`, `DigitizedDocument`, `MedicalHistory` (`/api/doctor/medical-history`), `LaboratoryRequest` (`ConsultationWorkspace`). The prescription components still use `mockData.ts`. Validation mirrors the backend (`consultation/validation.ts`).
- **patient**: `PatientInformation.tsx`, `pages/ConsultationsView`, `PrescriptionsView`, `components/PatientSummaryCard`, `patientApi.ts`, `types.ts`.

### Environment and API base URL
`lib/axios.ts` baseURL: `""` in `vite dev` (uses the Vite `/api` proxy), else `http://localhost:5000` when `VITE_IS_DEVELOPMENT=true`, else `VITE_API_BASE_URL` (or `VITE_API_URL`, trailing `/` and `/api` stripped; empty means same origin, which is what the monolith deployment wants).

## Tests

- Backend: `npm test` (vitest, `fileParallelism: false`). Integration tests (`tests/integration/*`) run against the **real database in `.env.test`** and `setup.ts` truncates tables after every test, so never point `.env.test` at real data. `setup.ts` lists `lab_requests`, which no longer exists, so its `TRUNCATE` will error until updated to `laboratory_requests`, `prescription_records`, etc. `vitest.unit.config.ts` includes `src/tests/isolated/**`, a folder that does not exist. Existing coverage: admin auth gate, admin get/post/update, login, `calculateAge`, `buildPrintablePatientRecord`.
- Frontend: `tests/laboratoryPrint.test.mjs` and `laboratoryPrint.browser.mjs` (no npm script; run with node).
- Lint: `npm run lint` in `frontend/`.

## `tools/` (standalone ETL)
`tools/data cleaning/pipeline.py`, `messydata.ipynb`, ten `cleaned-data_N.csv` samples and `tools/data/clinic_data_example.csv`: an example pipeline for cleaning messy legacy patient exports. Not imported by the app, and its output shape predates the current `patients` columns.

## Local dev workflow

```bash
# root
npm run dev        # backend only (nodemon + tsx)
npm run build      # backend (npm install && tsc) then frontend (npm install && tsc -b && vite build)
npm run start      # node backend/dist/server.js (API + built frontend)

# backend
cd backend && npm run seed:reset -- --force   # fresh sample data (after the server has booted once)
npm test

# frontend (HMR)
cd frontend && npm run dev   # http://localhost:5173, proxies /api (see Gotcha 14)
```

Backend `.env` (variable names as read by `config/env.ts`):
```
PORT=5000
NODE_ENV=development
DATABASE_URL=<neon connection string>
JWT_SECRET=...
JWT_EXPIRES_IN=1d
JWT_REFRESH_TOKEN=...            # refresh-token SECRET (docs/SETUP.md calls it REFRESH_TOKEN_SECRET)
JWT_REFRESH_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=... CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=...
CORS_ORIGIN=http://localhost:5173,https://techcare-1.onrender.com   # comma separated
IS_PRODUCTION=false              # true => role middleware on all routers AND syncSchema() on boot
DEV_DOCTOR_LOGIN=false           # only referenced by commented-out code
```
Frontend `.env.local`: `VITE_IS_DEVELOPMENT=true`, `VITE_API_BASE_URL=http://localhost:5000` (see `docs/SETUP.md` for the four deployment scenarios).

## Coding conventions

- **SQL**: tagged-template `sql\`…${param}…\`` for single statements; `pool.connect()` + `BEGIN`/`COMMIT` + `pg_advisory_xact_lock(hashtext('…'))` for multi-step writes that generate IDs. Always parameterize. `sql.transaction([...])` is used where all statements are known up front (form templates).
- **Controllers**: one folder per role, split by verb (`getRequests`, `postRequests`, `updateRequests`, `deleteRequest(s)`), each with a `dto/<verb>.dto.ts` that exports a namespace per handler (`body`, `response`, `error`, row types) and is used as `Response<ns.response | ns.error>`. Import with `.js` extensions.
- **Responses**: success `{ message, <resource> }`; errors `{ message }` (some older handlers use `{ error }`). Use proper status codes (400 validation, 401/403 auth, 404, 409 conflict, 500); newer code does.
- **Queue changes**: any write to `queue_entries` should end with `publishQueueChange()` after commit, and status comparisons should use `LOWER(status)`.
- **Audit**: new code should log through `logActivity()` with an `actions` row, not `system_activity`.
- **Never `SELECT *` a user and return it**: strip `password_hash` (the existing code does `const { password_hash, ...safe } = row`).
- **Frontend**: follow the shell + `?page=` + `pages/` + `components/<Feature>/` pattern; reuse `components/SideBar` and `Header`; shared types live in `src/interface/`.

## Known Issues & Gotchas (verified against the code)

Doctor and history:
1. **`consultation_records.doctor_id` does not exist** (schema has `requested_by` and `consulted_by`). Broken by this: `POST /api/doctor/consultations` (INSERT), `POST /api/doctor/prescriptions/:id` (ownership check), `POST /api/doctor/laboratory-requests` when `consultation_record_id` is sent, the consultation branch of doctor `getMedicalHistoryDetails`/`Full`, and the patient controller's detail queries.
2. **`queue_entries` has no `service_id` / `service_type`** but several queries still use them: doctor `GET /consultation-queues/room/:room`, fdstaff `serveQueueEntry` / `skipQueueEntry` (and the frontend `LabAndConsuQueues` buttons that call them), fdstaff `getPatientMedicalHistory`. Resolve the service via `consultation_records.queue_id` or `laboratory_request_items.queue_id` as `getAllQueueEntries` does.
3. **`lab_requests` table no longer exists** (now `laboratory_requests`), yet `GET /api/fdstaff/patients/:id/print`, `getPatientMedicalHistory` and `backend/src/tests/setup.ts` still reference it.
4. The doctor frontend calls routes that are commented out or absent (`/api/doctor/laboratory-services`, `/api/doctor/consultation-patients/:id`), and the patient frontend calls `/api/patient/consultations/:id`. Because of the SPA fallback (Gotcha 8) these return `index.html` with status 200 rather than a 404, which hides the failure.

Auth and data exposure:
5. **Hardcoded requester**: fdstaff `addLaboratoryRequest` and `addConsultationRecord` use `"U-26-1001-0004"` (a seed user) as `requested_by` instead of `req.user.user_id`. On a database without that user the FK fails.
6. **`getReleasedLaboratoryResults` ignores `:result_id`** and returns every released result. It backs the patient route (so any logged-in patient can read all patients' released results) and the doctor route.
7. **Role middleware is production-only** for fdstaff/doctor/labstaff and patient `/medical-history`, `/prescriptions` have no auth at all or ownership check (IDOR). `/api/test/sign-in` mints a JWT from an arbitrary body. Keep these in mind before exposing a non-production environment publicly.
8. **Unmatched `/api/*` requests (any method) are answered with `index.html` and status 200** by the SPA fallback in `app.ts`, so a wrong URL looks like success with HTML in `response.data`.
9. `addFormTemplates` imports `registerFormComponentTypes` but does not call it; `form_components.type_id` has a FK to `form_component_types`, so creating the first template on an unseeded DB can fail until `updateFormTemplate` or the seed has inserted the types.

Schema and config:
10. **`syncSchema()` runs on boot in production** and drops unknown tables/columns. Anything created only via ad-hoc SQL or only in `createSQL` (not in `columns`) can be removed.
11. `createSQL` and `columns` have drifted: `laboratory_results.released_at/released_by` are added by `connectNeon()` but are absent from `columns` (so `syncSchema` drops them; nothing reads them, and the release endpoint does not write them); `consultation_records.cancellation_reason` is only in `columns` + an `ALTER`; `services.service_category` is `NOT NULL` in `createSQL` but nullable in `columns`; `activity_logs.user_id` has the FK only in `columns`.
12. **Env name mismatch**: `docs/SETUP.md` documents `REFRESH_TOKEN_SECRET` and `MODE`, but `env.ts` reads `JWT_REFRESH_TOKEN` and `NODE_ENV`. With no `JWT_REFRESH_TOKEN`, `jwt.sign` for the refresh token throws and **login returns 500**.
13. `POST /api/fdstaff/billing` (`addBills`) is broken (`services_ids` column, missing `bill_id`), and nothing in the frontend calls it; `GET /billing` works. `updatePatient` ignores the uploaded image. `addPatient` no longer requires an image.
14. `frontend/vite.config.ts` proxy target is `!process.env.NODE_ENV ? "https://techcare-hui6.onrender.com" : "http://localhost:5000"`. If `NODE_ENV` is unset when you run `vite`, the dev server proxies to the **deployed** backend.

Queue and flow details:
15. Status strings mix cases (`waiting`/`Waiting`, `serving`/`Serving`); always use `LOWER()`. `labstaff GET /laboratory-requests/items/` filters `'Collected'` but items become `'Specimen Collected'`.
16. Queue "today" windows use `CURRENT_DATE` (database timezone) in list queries but `Asia/Manila` in the number generators, so numbers and lists can disagree around midnight if the DB is not on Manila time.
17. Legacy/dead code that is safe to ignore (and a candidate to delete): `websocket.ts`, `utils/getQueueMonitorEntries.ts` (the SSE hub never calls it), `generateConsultationId.ts` duplicate generator, `middlewares/test.middleware.ts` + `/api/test` + `/api/sse` demos, `SignupPage.tsx`, `lib/protectRoute.ts` (empty), `frontdesk_staff/pages/Test.tsx`, `packages` and `sse_test` tables, `system_activity` (superseded by `activity_logs`).
18. Laboratory staff UI is fixed to `"Laboratory Room 2"`; the seeded `labstaff122` matches that, other rooms need the constant changed (or a per-user room).
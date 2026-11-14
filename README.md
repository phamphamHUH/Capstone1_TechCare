<h1 align="center">TechCare: Cloud-Based Integrated Clinic Information System</h1>

<p align="center">
  <img width="220" height="220" alt="Reyna G. Diagnostic Medical Clinic Logo"
       src="https://github.com/user-attachments/assets/39194892-b7a8-45cc-808f-842a5e1376c6" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-5-black?logo=express" />
  <img src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-pg-4169E1?logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Real--Time-SSE-orange" />
</p>

<p align="center">
  <a href="https://www.techcare-system.com/">
    <strong>Live Application</strong>
  </a>
  ·
  <a href="docs/SETUP.md">
    <strong>Setup Documentation</strong>
  </a>
</p>

---

TechCare is a full-stack clinic management system designed to streamline patient registration, consultation and laboratory queueing, laboratory requests, billing, and administrative operations for Reyna G. Diagnostic Medical Clinic.


## Features by Role

| Role | What they do |
|---|---|
| **Admin** | Users and roles, services, packages and pricing, laboratory form templates, activity log, sales and service reports, live queue monitor |
| **Front Desk** | Patient registration and records, consultation and laboratory requests, billing and payment confirmation, queues |
| **Doctor** | Consultation queue, active consultation (findings, prescriptions, the patient's medical history), test requests (laboratory, imaging, packages) |
| **Laboratory Staff** | Laboratory queue per room, specimen collection, result entry from form templates, result release |
| **Patient** | Dashboard, queue tracking, laboratory results, medical history, prescriptions |

### Patient registration

- **Address:** Province → City/Municipality → Barangay are dropdowns filled from the public [PSGC API](https://psgc.gitlab.io/api/) (Philippine Standard Geographic Code). Only place codes are sent to it, never patient data. If it can't be reached, the fields become plain text inputs. Street and ZIP code are typed.
- **Blood type:** includes **N/A** for patients who don't know theirs.
- **Email:** optional; unique when given.
- **Login password**, chosen by the front desk:
  - **Set the password now:** the patient can log in right away. If they have an email, it is sent to them with their username.
  - **Email a link:** the patient creates their own password from a one-time link (7 days). Needs an email.

### Email (Brevo)

Account created (staff and patients), payment receipt, and lab result ready. Links use `APP_URL`, which must be the frontend address in production. See [docs/EMAIL.md](docs/EMAIL.md).


## Group Members

- Dela Cruz, Marc Jodel
- De Guzman, Mike Cleo
- Geronga, Laurence Anthony
- Juan, Randy Jr.
- Matangob, Jiano Freo


## System Architecture

The diagram below reflects the code as it exists today: the React role dashboards, the Express 5 API with its JWT and role middleware, the role routers, the two SSE streams (live queue and notifications), the PostgreSQL schema, and the external services.

```mermaid
flowchart TD
    %% ---------------- Frontend ----------------
    subgraph FE["Frontend: React 19 · Vite · Tailwind CSS 4 · react-router"]
        A["App.tsx Routes<br/>ProtectedRoute role guard<br/>(enforced in production builds only)"]
        B["Role Dashboards<br/>Admin · Front Desk · Doctor<br/>Laboratory Staff · Patient"]
        C["lib/axios.ts<br/>Bearer token from sessionStorage<br/>401: refresh token once, then log out"]
        D["Queue pages + notification bell<br/>reload from REST on each signal"]
        E["connectQueueStream.ts<br/>connectNotificationStream.ts<br/>fetch-event-source with auth header"]
        AD["hooks/usePsgcAddress.ts<br/>address dropdowns"]
    end

    %% ---------------- Backend ----------------
    subgraph BE["Backend: Express 5 · TypeScript · ESM"]
        F["server.ts<br/>connectNeon on boot<br/>syncSchema when IS_PRODUCTION<br/>graceful SSE shutdown"]
        G["app.ts<br/>CORS · JSON body · rate limit<br/>routers · static frontend/dist + SPA fallback"]
        H["API Routers<br/>/api/auth · /api/queue · /api/notifications<br/>/api/admin · /api/fdstaff · /api/doctor<br/>/api/labstaff · /api/patient<br/>(practice: /api/test · /api/sse)"]
        I["authMiddleware<br/>verify JWT, load users row"]
        J["Role Middleware<br/>admin: always on<br/>fdstaff · doctor · labstaff: only when IS_PRODUCTION<br/>patientMiddleware: patient routes"]
        K["Controllers + DTO types<br/>get · post · update · delete per role"]
        L["Utils<br/>generateId · passwordLink · getOrCreateBill<br/>recomputeBills · activityLogger"]
        M["multer<br/>temp disk upload, images only, 5 MB"]
    end

    %% ---------------- SSE ----------------
    subgraph SSE["services/queue-sse · services/notification-sse"]
        N["GET /api/queue/stream<br/>GET /api/notifications/stream"]
        O["Stream hubs<br/>queue-changed · notifications-changed<br/>ping every 25 s"]
    end

    %% ---------------- Data and services ----------------
    P[("PostgreSQL via pg (config/pgClient.ts)<br/>Neon · Amazon RDS · local<br/>users · patients · services · packages · package_services<br/>queue_entries · consultation_records · prescription_records<br/>test_requests · test_request_items · test_results<br/>form_templates · form_components · form_component_types<br/>bills · notifications · medical_documents<br/>activity_logs · actions · system_activity")]
    Q["Amazon S3<br/>patient and staff photos"]
    EM["Brevo<br/>transactional email"]
    PS["PSGC API<br/>Philippine provinces · cities · barangays"]
    R["Seed scripts<br/>seed.sql · seed.ts · seedBulk.ts"]

    %% ---------------- Normal API flow ----------------
    A --> B
    B --> C
    C -->|"HTTP request + JWT"| G
    G --> H
    H --> I
    I --> J
    J --> K
    K --> L
    K -->|"read and write via sql / pool"| P
    K -->|"image upload"| M
    M -->|"upload, store URL"| Q
    K -->|"account · receipt · result emails"| EM

    %% ---------------- Address lists ----------------
    B --> AD
    AD -->|"place codes only"| PS

    %% ---------------- Startup ----------------
    F --> G
    F -->|"CREATE TABLE IF NOT EXISTS<br/>additive repairs"| P
    R -->|"seed data"| P

    %% ---------------- SSE connection flow ----------------
    B --> D
    D --> E
    E -->|"authenticated stream request"| H
    H --> N
    N --> O

    %% ---------------- Live update flow ----------------
    K -->|"after a commit:<br/>publishQueueChange · notify"| O
    O -->|"signal only, no data"| E
    E --> D
    D -->|"role REST endpoint<br/>reload"| C

    %% ---------------- Frontend hosting ----------------
    G -.->|"SPA fallback index.html"| A
```


## Project Rules

- **Each role calls only its own API.** A role's frontend (`frontend/src/users/<role>/`) only calls its own prefix: doctor → `/api/doctor`, front desk → `/api/fdstaff`, laboratory → `/api/labstaff`, admin → `/api/admin`, patient → `/api/patient`. Shared by all logged-in users: `/api/auth`, `/api/notifications`, `/api/queue/stream`. If a screen needs data that only another role's endpoint has, add a new endpoint to its own router (for example `POST /api/doctor/test-requests`). Other roles' routers are role-protected, and a wrong-role 401 logs the user out.
- **Driver-portable SQL.** `config/pgClient.ts` is a small `sql` tagged template over `pg`. Keep queries to plain parameters so they also work with the Neon driver. For optional filters use `AND (${x || null}::text IS NULL OR col = ${x || null}::text)` instead of nesting `sql` fragments.
- **Folder layout per role:** `<Role>.tsx` shell, `pages/<Page>.tsx`, `components/<Page>/`, with child-only components in a `Parent/` folder next to `Parent.tsx`.


## Documentation

| Document | Covers |
|---|---|
| [docs/SETUP.md](docs/SETUP.md) | Environment variables, deployment scenarios, seeding, troubleshooting |
| [docs/EMAIL.md](docs/EMAIL.md) · [docs/EMAIL_FLOW.md](docs/EMAIL_FLOW.md) | Brevo setup, `APP_URL`, which emails are sent and when |
| [docs/AWS_SETUP.md](docs/AWS_SETUP.md) | AWS setup: RDS database and S3 image uploads |
| [docs/AWS_SERVER.md](docs/AWS_SERVER.md) | Running the server on AWS EC2 (vs Render) |
| [docs/AWS_MANAGE.md](docs/AWS_MANAGE.md) | Managing the RDS database and S3 photos |
| [docs/RELEASE_INTEGRATION.md](docs/RELEASE_INTEGRATION.md) | Release integration for the billing branch |

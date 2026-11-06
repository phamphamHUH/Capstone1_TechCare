# TechCare: Cloud-Based Integrated Information System for Reyna G. Diagnostic Medical Clinic

TechCare is a full-stack clinic management system designed to streamline patient registration, consultation and laboratory queueing, laboratory requests, billing, and administrative operations for Reyna G. Diagnostic Medical Clinic.

**Live Application:** [https://techcare-1.onrender.com/](https://techcare-1.onrender.com/)

## Group Members

- Dela Cruz, Marc Jodel
- De Guzman, Mike Cleo
- Geronga, Laurence Anthony
- Juan, Randy Jr.
- Matangob, Jiano Freo


## System Architecture

The diagram below reflects the code as it exists today: the React role dashboards, the Express 5 API with its JWT and role middleware, the five role routers, the SSE-based live queue monitor, the PostgreSQL schema, and the external services.

```mermaid
flowchart TD
    %% ---------------- Frontend ----------------
    subgraph FE["Frontend: React 19 · Vite · Tailwind CSS 4 · react-router"]
        A["App.tsx Routes<br/>ProtectedRoute role guard<br/>(enforced in production builds only)"]
        B["Role Dashboards<br/>Admin · Front Desk · Doctor<br/>Laboratory Staff · Patient"]
        C["lib/axios.ts<br/>Bearer token from sessionStorage"]
        D["Admin QueueingMonitor<br/>reloads queue on queue-changed"]
        E["connectQueueStream.ts<br/>fetch-event-source with auth header"]
    end

    %% ---------------- Backend ----------------
    subgraph BE["Backend: Express 5 · TypeScript · ESM"]
        F["server.ts<br/>connectNeon on boot<br/>syncSchema when IS_PRODUCTION<br/>graceful SSE shutdown"]
        G["app.ts<br/>CORS · JSON body · routers<br/>static frontend/dist + SPA fallback"]
        H["API Routers<br/>/api/auth · /api/admin · /api/fdstaff<br/>/api/doctor · /api/labstaff · /api/patient<br/>(dev only: /api/test · /api/sse)"]
        I["authMiddleware<br/>verify JWT, load users row"]
        J["Role Middleware<br/>admin: always on<br/>fdstaff · doctor · labstaff: only when IS_PRODUCTION<br/>patientMiddleware: patient lab results"]
        K["Controllers + DTO types<br/>get · post · update · delete per role"]
        L["Utils<br/>generateId · consultationValidation<br/>activityLogger · calculateAge"]
        M["multer<br/>temp disk upload, images only, 5 MB"]
    end

    %% ---------------- Queue SSE ----------------
    subgraph SSE["services/queue-sse"]
        N["queueStream.handlers.ts<br/>GET /api/admin/queue/stream<br/>GET /api/admin/queue/stream/stats"]
        O["queueStream.hub.ts<br/>connected screens · 25s ping<br/>publishQueueChange, debounced 150 ms"]
    end

    %% ---------------- Data and services ----------------
    P[("Neon PostgreSQL<br/>users · patients · services · packages<br/>queue_entries · consultation_records · prescription_records<br/>laboratory_requests · laboratory_request_items · laboratory_results<br/>form_templates · form_components · form_component_types<br/>bills · activity_logs · actions · system_activity")]
    Q["Cloudinary<br/>patient and staff photos"]
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
    M -->|"upload, store secure_url"| Q

    %% ---------------- Startup ----------------
    F --> G
    F -->|"CREATE TABLE IF NOT EXISTS<br/>additive repairs"| P
    R -->|"seed data"| P

    %% ---------------- SSE connection flow ----------------
    B --> D
    D --> E
    E -->|"authenticated stream request"| H
    H -->|"admin router, JWT and admin role"| N
    N --> O

    %% ---------------- Live queue update flow ----------------
    K -->|"after a queue mutation:<br/>publishQueueChange"| O
    O -->|"queue-changed signal only"| E
    E -->|"onQueueChanged"| D
    D -->|"GET /api/admin/queues<br/>reload today's queue"| C

    %% ---------------- Frontend hosting ----------------
    G -.->|"SPA fallback index.html"| A
```


## Documentation

For detailed setup and deployment instructions, see:

**[TechCare Setup and Deployment Notes](docs/SETUP.md)**
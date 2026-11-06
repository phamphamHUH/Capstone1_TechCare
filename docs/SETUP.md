
# TechCare Setup and Deployment Notes

This document describes how to configure, run, seed, and deploy TechCare, the Cloud-Based Integrated Information System for Reyna G. Diagnostic Medical Clinic.

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Prerequisites](#2-prerequisites)
3. [Backend Environment Variables](#3-backend-environment-variables)
4. [Frontend Environment Variables](#4-frontend-environment-variables)
5. [Deployment Scenarios](#5-deployment-scenarios)
6. [Database Seeding](#6-database-seeding)
7. [Running Locally](#7-running-locally)
8. [Build and Type Checks](#8-build-and-type-checks)
9. [Troubleshooting](#9-troubleshooting)
10. [Security Checklist](#10-security-checklist)

## 1. System Overview

TechCare provides a centralized information system for clinic operations.

### Main Features

| Role | Features |
|---|---|
| Front Desk | Patient registration, patient records, consultation and laboratory queues, billing |
| Laboratory Staff | Laboratory requests and laboratory results |
| Admin | User management, service and pricing management, activity monitoring |
| Doctor | Consultation dashboard and consultation workflow |
| Public | Live queue tracking |
| Authentication | JWT authentication and role-based dashboards |

### Technology Stack

- React, TypeScript, Vite, and Tailwind CSS
- Node.js, Express, and TypeScript
- Neon PostgreSQL
- JWT-based authentication
- Cloudinary integration
- Render deployment

### Deployment URLs

| Service | URL |
|---|---|
| Current monolithic application | https://techcare-1.onrender.com/ |
| Backend for distributed deployment | https://techcare-hui6.onrender.com/ |
| Separate frontend | Use the actual static-site URL assigned by Render |

Verify the service URLs in Render before using them, as deployments may change.

## 2. Prerequisites

Before setting up TechCare locally, ensure that you have:

- Node.js and npm installed.
- Access to the Git repository.
- A Neon PostgreSQL database.
- Cloudinary credentials if Cloudinary-dependent features are used.
- Backend and frontend dependencies installed.

Install dependencies separately:

```bash
cd backend
npm install
```

Open another terminal:

```bash
cd frontend
npm install
```

If the repository contains lockfiles, prefer the corresponding reproducible installation command, such as `npm ci`, when appropriate.

## 3. Backend Environment Variables

Create a local `backend/.env` file.

```dotenv
PORT=5000
MODE=development

DATABASE_URL=your_neon_connection_string

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d
REFRESH_TOKEN_SECRET=your_refresh_token_secret

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

CORS_ORIGIN=http://localhost:5173
IS_PRODUCTION=false
```

### Variable Reference

| Variable | Description |
|---|---|
| `PORT` | Port used by the backend server. The local example uses port 5000. |
| `MODE` | Application runtime mode. |
| `DATABASE_URL` | Connection string for the Neon PostgreSQL database. |
| `JWT_SECRET` | Secret used for JWT authentication. |
| `JWT_EXPIRES_IN` | Access-token expiration duration. The example is one day. |
| `REFRESH_TOKEN_SECRET` | Secret used by the refresh-token implementation. |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud identifier. |
| `CLOUDINARY_API_KEY` | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret. |
| `CORS_ORIGIN` | Frontend origin or origins permitted by the backend CORS configuration. |
| `IS_PRODUCTION` | Controls production-related behavior defined by the application. |

Use the values expected by the current backend implementation. The values above are examples, not real credentials.

### Important Security Notes

- Never commit `backend/.env`.
- Use strong, unique JWT and refresh-token secrets.
- Do not expose database credentials to the frontend.
- Configure production secrets through Render's environment-variable settings.
- Set `IS_PRODUCTION` intentionally. Do not disable production safeguards merely to run database seed commands.

## 4. Frontend Environment Variables

Create `frontend/.env` or `frontend/.env.local`.

### Local Development

```dotenv
VITE_IS_DEVELOPMENT=true
VITE_API_BASE_URL=http://localhost:5000
```

### Production Monolithic Deployment

```dotenv
VITE_IS_DEVELOPMENT=false
```

If the frontend is served from the same origin as the backend, the API base URL may not be required, depending on the frontend's current API configuration.

### Production Distributed Deployment

```dotenv
VITE_IS_DEVELOPMENT=false
VITE_API_BASE_URL=https://techcare-hui6.onrender.com
```

### Variable Reference

| Variable | Description |
|---|---|
| `VITE_IS_DEVELOPMENT` | Selects the frontend's development or production configuration. |
| `VITE_API_BASE_URL` | Base URL used by the frontend to send API requests. |

Vite exposes variables prefixed with `VITE_` to browser-side code. **Never store passwords, database URLs containing credentials, JWT signing secrets, or Cloudinary API secrets in frontend environment variables.**

Changes to Vite environment variables generally require rebuilding and redeploying the frontend.

## 5. Deployment Scenarios

TechCare can be configured in four ways.

### Scenario 1: Local Monolithic

The frontend and backend are accessed through the backend's local origin, assuming the backend is configured to serve the built frontend.

Backend `.env`:

```dotenv
PORT=5000
MODE=development
CORS_ORIGIN=http://localhost:5000
IS_PRODUCTION=false
```

Frontend `.env.local`:

```dotenv
VITE_IS_DEVELOPMENT=true
```

Confirm that the backend scripts and configuration support serving the frontend build before using this scenario.

### Scenario 2: Production Monolithic

The frontend and backend are served from the same deployed origin.

Application URL:

https://techcare-1.onrender.com/

Backend environment:

```dotenv
CORS_ORIGIN=https://techcare-1.onrender.com
```

Frontend build environment:

```dotenv
VITE_IS_DEVELOPMENT=false
```

### Scenario 3: Local Distributed

The Vite development server runs separately from the backend.

Expected local origins:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

Backend `.env`:

```dotenv
CORS_ORIGIN=http://localhost:5173
IS_PRODUCTION=false
```

Frontend `.env.local`:

```dotenv
VITE_IS_DEVELOPMENT=true
VITE_API_BASE_URL=http://localhost:5000
```

The backend must permit requests from the frontend origin through its CORS configuration.

### Scenario 4: Production Distributed

The frontend and backend are hosted as separate services.

Frontend build environment:

```dotenv
VITE_IS_DEVELOPMENT=false
VITE_API_BASE_URL=https://techcare-hui6.onrender.com
```

Backend environment:

```dotenv
CORS_ORIGIN=https://your-frontend-static-site.onrender.com
```

Replace the example frontend origin with the actual URL assigned by Render.

**Important:** `CORS_ORIGIN` must identify the browser-facing frontend origin, not the backend API URL. If the frontend is hosted at a different URL, update this variable accordingly.

## 6. Database Seeding

Run seed commands from the `backend/` directory, unless the project's scripts specify otherwise.

### Available Commands

| Command | Purpose |
|---|---|
| `npm run seed -- --force` | Inserts base seed data without wiping existing data, according to the seed script's behavior. |
| `npm run seed:reset -- --force` | Removes existing seeded-table data and inserts base data. |
| `npm run seed:bulk -- --force` | Generates additional bulk data. |
| `npm run seed:all` | Runs the reset-seed workflow followed by bulk seeding, as configured by the project scripts. |

### Initial Database Setup

For a fresh development database, the intended workflow is:

```bash
npm run seed:all
```

Check `backend/package.json` and the seed implementation to confirm the exact script behavior before running it.

### Warning About Destructive Operations

`seed:reset` and `seed:all` may delete existing data from tables managed by the seed process.

- Use a development database for testing seed operations.
- Verify `DATABASE_URL` before running a seed command.
- Never run destructive seed commands against production clinic data unless the operation is explicitly authorized and a suitable backup exists.
- Do not assume `--force` disables all safety checks; its behavior depends on the implementation.

## 7. Running Locally

First, inspect the available scripts in the backend:

```bash
cd backend
npm run
```

Run the appropriate backend development script shown in the output.

In a second terminal, inspect the frontend scripts:

```bash
cd frontend
npm run
```

Run the appropriate frontend development script.

For the distributed local configuration, the expected URLs are usually:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

Use the ports actually configured in the project's scripts and environment.

## 8. Build and Type Checks

From the `frontend/` directory, run:

```bash
npx tsc -b
npm run build
```

Run the backend checks using the scripts available in `backend/package.json`.

### Linux Deployment and Case-Sensitive Paths

Windows commonly uses a case-insensitive filesystem, while Linux is case-sensitive. Therefore, an import can work locally but fail during deployment if the capitalization does not match the committed path.

For example, these directory names are different on Linux:

```text
Consultation/
consultation/
```

Make sure import paths match the actual committed folder and filename casing.

To perform a case-only rename on Windows, use Git's temporary-name approach. Run the commands from the `frontend/` directory, adjusting the first source path to the exact spelling tracked by Git:

```powershell
git mv src/users/doctor/components/Consultation src/users/doctor/components/ConsultationTemp
git mv src/users/doctor/components/ConsultationTemp src/users/doctor/components/consultation
```

Verify the staged change:

```powershell
git status --short
git diff --cached --summary
```

Then commit and push:

```powershell
git commit -m "Fix consultation directory casing"
git push
```

If the tracked directory is already lowercase, use the exact source spelling reported by `git ls-files`. Do not run the example blindly without verifying the path.

## 9. Troubleshooting

### Frontend Cannot Reach the Backend

1. Confirm that `VITE_API_BASE_URL` points to the correct backend.
2. Check that the backend service is running and reachable.
3. Verify that `CORS_ORIGIN` matches the actual frontend origin exactly.
4. Inspect browser developer tools for failed requests and CORS errors.
5. Inspect Render logs for backend errors.
6. Rebuild and redeploy the frontend after changing Vite environment variables.

### Render Reports `TS2307: Cannot Find Module`

1. Confirm the file exists in the repository.
2. Compare the import path with the tracked path, including capitalization.
3. Use `git ls-files` or `git ls-tree -r --name-only HEAD` to inspect tracked paths.
4. Check that the directory rename was actually committed and pushed.
5. Run the TypeScript build locally after correcting the import.

### TypeScript Reports `TS7006: Parameter Implicitly Has an 'any' Type`

Check the callback or function signature and give the parameter the correct type based on the application's data model. Avoid using `any` merely to silence the compiler.

Re-run the TypeScript checks and production build after the correction.

### Authentication Fails After Deployment

1. Verify that the backend JWT and refresh-token secrets are configured.
2. Confirm the frontend sends requests to the correct backend.
3. Check token expiration and refresh behavior.
4. Inspect authorization headers and any cookie settings required by the implementation.
5. Review backend logs for authentication errors.

Never expose JWT signing secrets through frontend variables.

### Database Connection or Seed Errors

1. Verify `DATABASE_URL`.
2. Confirm the application points to the intended Neon database.
3. Check whether `IS_PRODUCTION` is configured intentionally.
4. Review seed-script behavior before resetting or generating data.
5. Inspect backend logs for database errors.

## 10. Security and Deployment Checklist

- [ ] `.env` files and secrets are excluded from version control.
- [ ] Production credentials are configured through Render's environment settings.
- [ ] `DATABASE_URL` points to the intended database.
- [ ] `CORS_ORIGIN` matches the actual frontend origin.
- [ ] `VITE_API_BASE_URL` points to the correct backend for distributed deployment.
- [ ] The frontend is rebuilt after Vite environment changes.
- [ ] Destructive seed commands are not run accidentally against production data.
- [ ] TypeScript checks and the production build pass before deployment.
- [ ] Import paths match committed file and directory capitalization.
- [ ] Render logs and browser developer tools are checked after deployment.

## 11. References

- **Live TechCare application:** https://techcare-1.onrender.com/
- **Backend URL documented for distributed deployment:** https://techcare-hui6.onrender.com/
- **Repository README:** [`../README.md`](../README.md)

Check the Render dashboard to confirm current service URLs and deployment settings.
"""

with open(os.path.join(docs_dir, "SETUP.md"), "w", encoding="utf-8") as f:
    f.write(setup)
with open(os.path.join(base, "README.md"), "w", encoding="utf-8") as f:
    f.write(readme)

print("README.md and docs/SETUP.md are ready.")
print("README:", os.path.join(base, "README.md"))
print("Docs:", os.path.join(docs_dir, "SETUP.md"))

---
name: techcare-backend-dto
description: Backend DTO conventions and reference for TechCare - the TypeScript namespaces in backend/src/controllers/<role>/dto/*.dto.ts, how controllers use them with Response<ns.response | ns.error>, what the compiler does and does not check, how database types map to DTO fields, error shapes, an index of every namespace, and DTOs known to disagree with the schema or their controller. Use this skill whenever adding or changing an API endpoint, request body, response shape, query parameter or error response, whenever editing a *.dto.ts file or a typed controller, when a frontend type disagrees with what the API returns, or when asked what an endpoint accepts or returns, even if the user never says "DTO".
---

# Backend DTOs

Verified against the code on 2026-11-07. For columns and JSONB shapes, see `techcare-database-schema`.

## What a DTO is here
A DTO is a **compile-time description** of one handler's request and response. Three things follow from that, and most DTO bugs come from forgetting them:

- **No runtime validation.** `req.body as addUser.body` checks nothing, so a client can send anything. Validate input by hand in the controller. Shared validators are in `utils/consultationValidation.ts`.
- **Not linked to SQL.** The compiler can't see a query's columns, so a DTO can list a column that doesn't exist and still build. Passing `tsc` doesn't prove a DTO is accurate.
- **Not shared with the frontend.** The frontend has its own types in `frontend/src/interface/`. If you change a response, update the matching type there by hand.

The DTO is a claim about the API, so check it against the query and the schema instead of trusting it.

## Layout and naming
```
backend/src/controllers/<role>/
├── getRequests.controller.ts     → dto/get.dto.ts
├── postRequests.controller.ts    → dto/post.dto.ts
├── updateRequests.controller.ts  → dto/update.dto.ts      (PUT and PATCH)
└── deleteRequest.controller.ts   → dto/delete.dto.ts
```
Roles are `admin`, `auth`, `doctor`, `fdstaff`, `labstaff`, `patient`. Controller filenames vary (`getRequest`, `updateRequest`, `deleteRequest`), so check the folder.

| Thing | Convention |
|---|---|
| Namespace | same name as the handler, one per handler: `export namespace addUser` |
| Standard members | lowercase `body`, `query`, `response`, `error` |
| Row and nested types | lowercase singular inside the namespace: `user`, `service`, `pagination` |
| Field names | snake_case, same as the columns |
| Reuse | within a file, refer to another namespace: `getBills.bill`. There is no shared DTO module |

`techcare-mvp-deploy` shows a different style (`AddConsultationRequest as C`). That is for its proposed rebuild; follow this one in the current code.

The same namespace name can mean different things in different roles. `getMedicalHistory`, `getMedicalHistoryDetails`, `getMedicalHistoryFull`, `getRoomSpecificServices`, `skipQueueEntry` and `addLaboratoryRequest` each exist in more than one role with different shapes, so check that you're in the right folder.

## Writing one
```ts
// controllers/fdstaff/dto/update.dto.ts
export namespace confirmPayment {
  export interface body {
    payment_method?: "Cash" | "Instapay/QRpH";
    amount_received?: number | string | null;
  }

  export interface response {
    message: string;
    bill: Record<string, unknown>;
    change: number;
  }

  export interface error {
    message: string;
  }
}
```
Keep namespaces types-only. A `const` or function inside would make it a runtime value, while `import type` assumes it isn't one.

## Using one in a controller
```ts
import type { Request, Response } from "express";
import type { addService } from "./dto/post.dto.js";   // `import type` and the .js extension

export async function addService(
  req: Request,
  res: Response<addService.response | addService.error>,
) {
  const { service_name, price } = req.body as addService.body;
  if (!service_name) return res.status(400).json({ message: "Service name is required." });
  // ...
}
```
A handler and its namespace can share a name because one is a value and the other a type. If they clash, alias the import, as `getPatientMedicalHistory as MedicalHistoryDTO` does in `fdstaff/getRequests.controller.ts`.

- **Body:** `req.body as ns.body`. Only `fdstaff`'s `getPatientMedicalHistory` uses a typed `Request<...>`.
- **Query:** `req.query as ns.query`. Values are strings, so `page` and `limit` are `string` until parsed.
- **Params:** no DTO type. Read `req.params` directly and check for a string.
- **Multipart routes:** `addUser`, `updateUser`, `addPatient` and `updatePatient` use `upload.single("image")`, so every body field arrives as a string, even ones typed `number` or `null`.

## What the compiler actually checks
Tested with `tsc` against the project's settings, with `res` typed as `Response<ok | err>`:

| Code | Result |
|---|---|
| `res.json({ message: "x", extra: 1 })` | **error**: undeclared field |
| `res.status(200).json({ wrong: 1 })` | **error** |
| `res.json({ message: 1 })` | **error**: wrong type |
| `res.json({ rows: sqlRows })` | **error**: `Record<string, any>[]` doesn't match the row type |
| `res.json({ message: "x", bill: {}, extra: 1 } as ok)` | **passes**: a cast allows extra fields |
| `res.json({ rows: sqlRows } as typed)` | **passes**: no column check |
| `res.json(anyValue)` | **passes** |
| Any literal, if the type has `[key: string]: unknown` | **passes**, even `password_hash: "leak"` |

So:
- **Don't cast response literals.** `res.status(201).json({...} as ns.response)` is common here, with about 245 such casts, but it hides fields the DTO doesn't declare. `fdstaff`'s `addLaboratoryRequest` and `addConsultationRecord` both return `bill` and `is_new_bill` that their DTOs leave out, and the casts hide it. Without a cast, the compiler catches this.
- **Cast only at the database boundary**, where you have to: `rows as unknown as getBills.bill[]`. That line is an unchecked promise, so compare the type with the `SELECT` by hand.
- **Avoid `[key: string]: unknown` in new DTOs.** About 44 interfaces have it, and it turns off the undeclared-field check. It also breaks `Omit`: `login.response.user` is `Omit<account, "password_hash">`, which collapses to an open type, so it doesn't actually exclude `password_hash` and `user.username` reads as `unknown`. The controller must still strip the hash itself.
- **Prefer explicit `SELECT` columns over `SELECT *`.** The type system won't stop a secret from leaving through a cast.

## Mapping database types to DTO fields
| Database | DTO type | Why |
|---|---|---|
| `NUMERIC`, `DECIMAL` | `string` | the driver returns strings; add a comment, as `getBills.bill` does |
| `NUMERIC` computed in JS first | `number` | only after `Number(...)` |
| `INTEGER`, `SERIAL` | `number` | |
| `TIMESTAMP`, `DATE`, `TIME` | `string` | what the client receives as JSON |
| `BOOLEAN` | `boolean` | |
| nullable column | `T \| null` | |
| column left out of some queries | `field?: T` | optional means "may be absent", not "may be null" |
| JSONB with a known shape | a real interface | see the shapes in `techcare-database-schema` |
| JSONB with no fixed shape | `Record<string, unknown>` or `unknown` | not `string` |
| business ID | `string` | `result_id` is `RES-<uuid>`, not a number |
| status with fixed values | a union: `"Pending" \| "Paid"` | |

Inside the backend a `SELECT` can return a `Date`, but what reaches the client is a string, so type the field as `string`.

## Response and error shapes
Success responses use a wrapper object (`{ message, user }`, `{ services }`) or a bare array (`getLaboratoryQueues`). Use an object for anything new, since it can gain fields later without breaking clients.

Errors have drifted into several shapes:

| Shape | Where |
|---|---|
| `{ message: string }` | most, and the one to use for new code |
| `{ message: string; errors?: Record<string, unknown> }` | field-level validation errors in `doctor` POST handlers |
| `{ message: string; detail?: string }` | some `getMedicalHistory` variants |
| `{ message?: string; error?: string }` | `admin`, `auth`, parts of `fdstaff`; both optional, so nothing is guaranteed |
| `{ error: string; message?: string }` | `fdstaff`'s `getAllPatients`, `deleteQueue` |

Check the frontend's error handling before changing an existing shape.

## Adding or changing an endpoint
1. Write the query and confirm its columns against `techcare-database-schema`.
2. Add a namespace to `dto/<verb>.dto.ts`, named after the handler, with `response` and `error`, plus `body` or `query` if used.
3. Type the handler: `res: Response<ns.response | ns.error>`.
4. Validate `req.body` and `req.query` by hand, because the cast doesn't.
5. Return literals without `as`, and let the compiler check them.
6. Run `npx tsc --noEmit` in `backend/`.
7. Call the endpoint once and compare the JSON with the DTO, since the compiler can't confirm SQL columns.
8. Update `frontend/src/interface/` to match.

## Namespace index
Handlers come from the same role unless noted.

| File | Namespaces |
|---|---|
| `admin/dto/get.dto.ts` | `getAllUsers`, `getAllActivities`, `getAllservices` (lowercase s), `getMyActivities`, `getAllFormTemplates`, `getFormTemplateById` |
| `admin/dto/post.dto.ts` | `addUser`, `addService`, `addActivity`, `addAction`, `addFormTemplates` |
| `admin/dto/update.dto.ts` | `updateUser`, `updateUserStatus`, `updateFormTemplate` |
| `admin/dto/delete.dto.ts` | `deleteTemplate` |
| `auth/dto/post.dto.ts` | `login` |
| `auth/dto/update.dto.ts` | `logout` |
| `doctor/dto/get.dto.ts` | `getConsultationRequests` (handler is `getConsultationQueues`), `getMedicalHistory`, `getMedicalHistoryDetails`, `getMedicalHistoryFull`, `getRoomSpecificServices`, `getConsultationQueueDetails` |
| `doctor/dto/post.dto.ts` | `addLaboratoryRequest`, `addPrescriptions`, `addConsultationFindings` |
| `doctor/dto/update.dto.ts` | `acceptConsultationQueue`, `cancelConsultationQueue`, `skipQueueEntry` (handler is `skipConsultationQueueEntry`) |
| `fdstaff/dto/get.dto.ts` | `getAllPatients`, `getPrintablePatientRecord`, `getAllQueueEntries`, `getAllServices`, `getLaboratoryRequest` (unused), `getQueueRequests`, `getBills`, `getBillDetails`, `getMedicalHistory`, `getMedicalHistoryDetails`, `getMedicalHistoryFull`, `getPatientMedicalHistory` |
| `fdstaff/dto/post.dto.ts` | `addPatient`, `addBills`, `addToQueue` (unused, handler commented out), `addLaboratoryRequest`, `addConsultationRecord` |
| `fdstaff/dto/update.dto.ts` | `updatePatient`, `serveQueueEntry`, `skipQueueEntry`, `confirmPayment` |
| `fdstaff/dto/delete.dto.ts` | `deleteQueue`, `deletePatient` |
| `labstaff/dto/get.dto.ts` | `getLaboratoryRequestDetails`, `getLaboratoryQueues`, `getRoomSpecificServices`, `getLaboratoryQueueItems`, `getAnalysisItems`, `getSavedLaboratoryResults`, `getAnalysisReadyRequests`, `getAvailableFormTemplates`, `getReleasedLaboratoryResults`, `getReleasedLaboratoryResult` (unused) |
| `labstaff/dto/post.dto.ts` | `saveLaboratoryResult` |
| `labstaff/dto/update.dto.ts` | `acceptQueueEntry`, `completeQueueEntry`, `skipQueueEntry`, `cancelQueueEntry`, `startLaboratoryAnalysis`, `releaseLaboratoryResult` |
| `patient/dto/get.dto.ts` | `getMedicalHistory`, `getMedicalHistoryDetails`, `getMedicalHistoryFull`, `getCurrentPrescriptions` |

Some routes reuse another role's handler, so that role's DTO applies. For example, the `doctor` and `patient` routes call `getReleasedLaboratoryResults`, and `admin` serves `/queues` with `getAllQueueEntries`. Check the route file's imports.

There's no `labstaff/dto/delete.dto.ts` because `labstaff/deleteRequests.controller.ts` exports no handlers. `patient` has only a GET DTO. `queue.route.ts`'s `streamQueue` is SSE and has no DTO.

## DTOs that disagree with the code or schema
All of these compile. Don't copy these fields into new code or trust them when debugging.

| DTO | Field | Reality |
|---|---|---|
| `fdstaff` `getAllPatients.patient` | `address` (required), `emergency_contact_name`, `emergency_contact` | `patients` has none of these; it uses `street`…`zip_code` and `guardian_*` |
| `labstaff` `getLaboratoryRequestDetails.requestDetails` | same three fields | the query reads them, so it fails at runtime |
| `doctor` `getMedicalHistoryDetails.laboratoryResult` | `result_value`, `unit`, `reference_range`, `flag`, `result_id: number` | the columns don't exist; `result_id` is a string |
| `getMedicalHistoryFull.laboratoryResponse` (`doctor`, `fdstaff`, `patient`), `patient` `getMedicalHistoryDetails.laboratoryResult` | `result_value` | use `results` JSONB |
| `fdstaff` `getPatientMedicalHistory` | `result_value`, `unit`, `reference_range`, `flag`, `doctor_id` | the columns don't exist |
| `fdstaff` `getPrintablePatientRecord.visits` | `service_id` | `queue_entries` has no `service_id` |
| `getMedicalHistoryDetails`/`Full.consultationResponse` | `diagnosis: string \| null`, and in `Full` also `presenting_complaint`, `physical_examination` | JSONB: an array and objects |
| `patient` `getMedicalHistoryFull.consultationResponse` | `phyical_examination` | misspelled |
| `doctor` `addLaboratoryRequest.body` | `service_ids`, `priority?: string` | `validateLabRequest` reads `services`, and `priority` must be `"Yes"` or `"No"` |
| `doctor` `addConsultationFindings.body` | `doctor_id` | the INSERT that uses it fails: `consultation_records` has no such column |
| `fdstaff` `addLaboratoryRequest.response`, `addConsultationRecord.response` | no `bill`, `is_new_bill` | the controller returns both |
| `admin` `addService.service` | `price: number` | returned straight from `RETURNING *`, so NUMERIC arrives as a string |
| `admin` `addActivity.response` | `user: activity` | a misleading key name, but it's what the API returns, so check clients before renaming |
| `addPatient.body` | `height_cm: number \| null` | the route is multipart, so it arrives as a string |

To check an endpoint, read its query, compare the columns with the schema, then call it. When the DTO and the query disagree, the schema decides which one is wrong.

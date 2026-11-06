# Release integration for the billing branch

Source branch: `TEC-154-feat/fdstaff/submittransaction` (original head `4e81ae3`).
Integrated release commit: `fa674ea2c2cabe416c0cd5cbb2cc1693559b4834`.

## Resolution

The nine conflicting files were resolved together around release's bill-based payment contract. The integration retains the feature branch's larger fonts, billing layout, confirmation/result dialogs, exact custom discounts, and invoice print/PDF output.

- Front desk queue/history now read `GET /api/fdstaff/billings?status=Pending|Paid`.
- Bill service details load from `GET /api/fdstaff/billings/:bill_id/details`.
- Payment and forwarding recovery use `PATCH /api/fdstaff/billings/:bill_id/pay`.
- Payment fields match release: `payment_method`, `discount_type`, `amount_received`, `reference_num`, and `priority`. Bank transfers require a reference; senior and PWD eligibility are checked on the server.
- Consultation and laboratory records remain associated with release's shared `bill_id`. Doctor queue and SSE changes from release are retained.
- Release's separate patient address/medical fields are retained. Three remaining address displays were adapted to the structured fields instead of restoring the removed `address` field.
- Pending bills use current active clinical lines. Successful payment saves immutable invoice items, totals, discount type/rate, and receipt metadata. Paid history uses those snapshots rather than today's catalog prices. Older bills without saved itemized prices remain explicitly unavailable for itemized export.
- Recorded payments commit before laboratory forwarding. Missing rooms or forwarding failures return a paid response; retrying reuses the same bill/receipt and does not create duplicate queues or charges.
- Invoice fields are declared in both the table creation SQL and the schema synchronizer's desired columns. Production synchronization therefore retains `items`, `discount_pct`, `receipt_id`, `receipt_issued_at`, and `billed_at`.
- The bill table is initialized before clinical tables that reference it, fixing fresh-database foreign-key creation order.
- Standalone invoices save both release's canonical billing totals and the invoice snapshot/receipt fields. Exact peso discounts remain exact, and eligible senior discounts retain their proper recorded type.

## Main integration files

| Area | Files |
| --- | --- |
| Billing APIs | `backend/src/controllers/fdstaff/getRequests.controller.ts`, `postRequests.controller.ts`, `updateRequests.controller.ts`, new `billPayment.controller.ts` |
| Canonical schema and immutable totals | `backend/src/config/db.ts`, `backend/src/utils/recomputeBills.ts` |
| Front desk loading and payment UI | `frontend/src/users/frontdesk_staff/FrontdeskStaff.tsx`, `pages/Billing.tsx`, `components/Billing/ProcessPayment.tsx`, `InvoiceTransaction.tsx` |
| Shared billing types and adapters | `frontend/src/interface/Billing.ts`, `components/Billing/billingModel.ts`, `BillingQueue.tsx`, `BillingUi.tsx` |
| Structured addresses | `frontend/src/utils/formats.ts`, front desk patient table, service-request patient header, legacy patient-history page |
| Restored regression checks | `backend/src/tests/isolated/frontdeskBilling.test.ts`, `frontend/tests/billingReadability.test.mjs`, isolated Vitest config, backend package/lockfile |

## Validation

- Backend PostgreSQL integration tests use PGlite in memory with mocked database connections. They never connect to the configured clinic database.
- 11 backend tests cover fresh schema creation, mixed service bills, price snapshots, senior/PWD eligibility, cash/reference validation, immutable paid totals, history/details, standalone discounts, and forwarding retries.
- 14 frontend billing/dialog/model tests and 7 existing laboratory-print regressions cover the merged types and UI.
- 7 browser workflow checks with synthetic API responses cover bill expansion, canonical payments, recovery, history/PDF export, bank references and failure dialogs, new invoices, structured addresses, and the mobile layout.
- Frontend/backend TypeScript checks, targeted frontend ESLint, and production builds were checked on the combined tree.

Repeat the isolated checks with:

```powershell
cd TechCare/backend
npm install
npm run test:frontdesk

cd ../frontend
npm install
npm run test:billing
node --test tests/laboratoryPrint.test.mjs
```

The existing default backend integration setup truncates tables. It was not run against clinic data. No clinic database writes or startup migrations were performed for this merge.

The merge is local. Push the feature branch to update the GitHub PR. A clean merge against the tested release commit does not guarantee compatibility with later release commits; rerun the check if the target advances.

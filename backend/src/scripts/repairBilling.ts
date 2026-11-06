// One-off repair for databases created before bills were linked to requests.
// Run by hand with: npm run repair:billing. Running it twice changes nothing.
//
// - Active unpaid requests with no bill join the patient's open bill.
// - Requests paid before bills existed get a Paid bill so their tests can be
//   forwarded. Their amount was never recorded, so no price is invented.
// - Finished or cancelled requests are left alone.
import { pathToFileURL } from "node:url";
import { pool } from "../config/db.js";
import { generateBillId } from "../utils/generateId.js";
import { getOrCreateOpenBill } from "../utils/getOrCreateBill.js";
import { recomputeBillTotals } from "../utils/recomputeBills.js";

const UNBILLED_CONSULTATION = `cr.bill_id IS NULL AND cr.is_paid = FALSE
  AND LOWER(TRIM(cr.status)) IN ('created', 'in queue', 'waiting')
  AND NOT EXISTS (
    SELECT 1 FROM queue_entries q
    WHERE q.queue_id = cr.queue_id AND LOWER(TRIM(q.status)) IN ('completed', 'cancelled')
  )`;
const UNFORWARDED_LAB_ITEM = `lri.bill_id IS NULL AND lri.queue_id IS NULL
  AND LOWER(TRIM(lri.status)) = 'requested'
  AND LOWER(TRIM(lr.status)) NOT IN ('cancelled', 'canceled', 'rejected')`;

export async function backfillBillLinks() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('billing_backfill'))");

    // Older bills saved before the payment columns existed.
    await client.query(
      `UPDATE bills SET
         billed_at = COALESCE(billed_at, paid_at, created_at),
         receipt_issued_at = COALESCE(receipt_issued_at, paid_at)
       WHERE billed_at IS NULL`,
    );

    const { rows: patients } = await client.query(
      `SELECT cr.patient_id FROM consultation_records cr WHERE ${UNBILLED_CONSULTATION}
       UNION
       SELECT lr.patient_id FROM laboratory_request_items lri
       JOIN laboratory_requests lr ON lr.request_id = lri.request_id
       WHERE lr.is_paid = FALSE AND ${UNFORWARDED_LAB_ITEM}
       ORDER BY patient_id`,
    );
    for (const { patient_id } of patients) {
      const { bill_id } = await getOrCreateOpenBill(client, patient_id);
      await client.query(
        `UPDATE consultation_records cr SET bill_id = $1
         WHERE cr.patient_id = $2 AND ${UNBILLED_CONSULTATION}`,
        [bill_id, patient_id],
      );
      await client.query(
        `UPDATE laboratory_request_items lri SET bill_id = $1, updated_at = NOW()
         FROM laboratory_requests lr
         WHERE lr.request_id = lri.request_id AND lr.patient_id = $2
           AND lr.is_paid = FALSE AND ${UNFORWARDED_LAB_ITEM}`,
        [bill_id, patient_id],
      );
      await recomputeBillTotals(client, bill_id);
    }

    const { rows: paidRequests } = await client.query(
      `SELECT lr.request_id, lr.patient_id, lr.updated_at,
         jsonb_agg(jsonb_build_object(
           'line_type', 'laboratory', 'item_id', lri.lab_item_id, 'request_id', lr.request_id,
           'service_id', s.service_id, 'service_name', s.service_name,
           'service_category', s.service_category, 'price', NULL, 'quantity', 1
         ) ORDER BY lri.lab_item_id) AS items
       FROM laboratory_request_items lri
       JOIN laboratory_requests lr ON lr.request_id = lri.request_id
       JOIN services s ON s.service_id = lri.service_id
       WHERE lr.is_paid = TRUE AND ${UNFORWARDED_LAB_ITEM}
       GROUP BY lr.request_id, lr.patient_id, lr.updated_at
       ORDER BY lr.request_id`,
    );
    for (const request of paidRequests) {
      await client.query("SELECT pg_advisory_xact_lock(hashtext('bill_ids'))");
      const bill_id = await generateBillId(client);
      await client.query(
        `INSERT INTO bills (bill_id, patient_id, status, items, payment_method, paid_at, billed_at)
         VALUES ($1, $2, 'Paid', $3::jsonb, 'Not recorded', $4, $4)`,
        [bill_id, request.patient_id, JSON.stringify(request.items), request.updated_at],
      );
      await client.query(
        `UPDATE laboratory_request_items lri SET bill_id = $1, updated_at = NOW()
         FROM laboratory_requests lr
         WHERE lr.request_id = lri.request_id AND lr.request_id = $2 AND ${UNFORWARDED_LAB_ITEM}`,
        [bill_id, request.request_id],
      );
    }

    await client.query("COMMIT");
    return { openBills: patients.length, paidBills: paidRequests.length };
  } catch (error) {
    await client.query("ROLLBACK").catch(console.error);
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log("Billing repair finished:", await backfillBillLinks());
  } catch (error) {
    console.error("Billing repair failed:", error);
    process.exitCode = 1;
  }
}

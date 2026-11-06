import { sql } from "./db.js";

// The older clinic database uses subtotal/discount_amount/paid_at. The ZIP's
// billing controllers use JSON line items and receipt fields instead. Keep the
// old columns and amounts; add only the fields those controllers need.
export const BILLING_SCHEMA_REPAIR = `DO $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('billing_schema_20261106'));
  ALTER TABLE bills
    ADD COLUMN IF NOT EXISTS items JSONB,
    ADD COLUMN IF NOT EXISTS discount_pct NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS receipt_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS receipt_issued_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS billed_at TIMESTAMP;

  UPDATE bills b SET
    billed_at = COALESCE(b.billed_at, (to_jsonb(b)->>'paid_at')::timestamp, b.created_at),
    discount_pct = COALESCE(b.discount_pct,
      CASE WHEN (to_jsonb(b)->>'subtotal')::numeric > 0
        AND (to_jsonb(b)->>'discount_amount')::numeric BETWEEN 0 AND (to_jsonb(b)->>'subtotal')::numeric
      THEN ROUND((to_jsonb(b)->>'discount_amount')::numeric / (to_jsonb(b)->>'subtotal')::numeric * 100, 2)
      END),
    receipt_id = COALESCE(b.receipt_id, CASE WHEN LENGTH(to_jsonb(b)->>'reference_num') <= 50 THEN NULLIF(to_jsonb(b)->>'reference_num', '') END),
    receipt_issued_at = COALESCE(b.receipt_issued_at, (to_jsonb(b)->>'paid_at')::timestamp)
  WHERE b.billed_at IS NULL OR b.discount_pct IS NULL;
END $$;`;

export async function repairBillingSchema() {
  await sql.query(BILLING_SCHEMA_REPAIR);
}

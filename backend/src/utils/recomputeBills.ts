import type { PoolClient } from "@neondatabase/serverless";

export async function recomputeBillTotals(client: PoolClient, bill_id: string) {
  const {
    rows: [bill],
  } = await client.query(
    `UPDATE bills b
     SET subtotal        = t.sub,
         discount_amount = t.disc,
         total_amount    = t.sub - t.disc,
         updated_at      = CURRENT_TIMESTAMP
     FROM (
       SELECT s.sub,
              CASE WHEN bb.discount_rate IS NOT NULL
                   THEN ROUND(s.sub * bb.discount_rate / 100, 2)
                   ELSE LEAST(bb.discount_amount, s.sub)
              END AS disc
       FROM bills bb
       CROSS JOIN LATERAL (
         SELECT COALESCE(SUM(l.price), 0) AS sub
         FROM (
           SELECT sv.price
           FROM consultation_records cr
           JOIN services sv ON sv.service_id = cr.service_id
           WHERE cr.bill_id = bb.bill_id
             AND lower(trim(cr.status)) NOT IN ('cancelled', 'canceled', 'rejected')
           UNION ALL
           SELECT sv.price
           FROM test_request_items tri
           JOIN services sv ON sv.service_id = tri.service_id
           JOIN test_requests tr ON tr.request_id = tri.request_id
           WHERE tri.bill_id = bb.bill_id
             AND lower(trim(tri.status)) NOT IN ('cancelled', 'canceled', 'rejected')
             AND lower(trim(tr.status)) NOT IN ('cancelled', 'canceled', 'rejected')
         ) l
       ) s
       WHERE bb.bill_id = $1
     ) t
     WHERE b.bill_id = $1
       AND lower(trim(b.status)) IN ('pending', 'unpaid')
       AND (b.items IS NULL OR jsonb_typeof(b.items) <> 'array' OR b.items = '[]'::jsonb)
     RETURNING b.*`,
    [bill_id],
  );
  return bill;
}

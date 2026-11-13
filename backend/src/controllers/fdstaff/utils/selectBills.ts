import { sql } from "../../../config/db.js";

// Shared by the bill list and the bill details so both always agree.
// Legacy "Unpaid" rows come out as "Pending". The stored value is left alone.
export function selectBills(billId: string | null, days: number | null = null) {
  return sql`
    SELECT b.bill_id, b.patient_id, b.items, b.discount_type, b.discount_amount, b.payment_method,
      b.reference_num, b.invoice_id, b.paid_at, b.created_at,
      CASE WHEN LOWER(TRIM(b.status)) = 'paid' THEN 'Paid' ELSE 'Pending' END AS status,
      CASE WHEN LOWER(TRIM(b.status)) <> 'paid' AND lines.count > 0 THEN lines.subtotal ELSE b.subtotal END AS subtotal,
      CASE WHEN LOWER(TRIM(b.status)) <> 'paid' AND lines.count > 0 THEN lines.subtotal ELSE b.total_amount END AS total_amount,
      COALESCE(
        CASE WHEN LOWER(TRIM(b.status)) = 'paid' OR lines.count = 0 THEN (
          SELECT ARRAY_AGG(item->>'service_name')
          FROM jsonb_array_elements(CASE WHEN jsonb_typeof(b.items) = 'array' THEN b.items ELSE '[]'::jsonb END) item
        ) END,
        lines.names,
        '{}'::text[]
      ) AS services,
      CASE
        WHEN NOT lab.has_items THEN 'No laboratory tests'
        WHEN LOWER(TRIM(b.status)) <> 'paid' THEN 'Waiting for payment'
        WHEN lab.has_unforwarded THEN 'Needs forwarding'
        ELSE 'Forwarded'
      END AS laboratory_status,
      lab.has_priority AS is_priority,
      CONCAT_WS(' ', p.first_name, p.last_name) AS patient_name,
      CONCAT_WS(' ', u.first_name, u.last_name) AS received_by,
      p.sex, p.birthdate, DATE_PART('year', AGE(p.birthdate))::int AS age,
      COALESCE(DATE_PART('year', AGE(p.birthdate)) >= 60, false) AS is_senior,
      COALESCE(p.is_pwd, false) AS is_pwd
    FROM bills b
    JOIN patients p ON p.patient_id = b.patient_id
    LEFT JOIN users u ON u.user_id = b.received_by
    LEFT JOIN LATERAL (
      SELECT ARRAY_AGG(l.service_name::text ORDER BY l.created_at, l.service_name) AS names,
        SUM(l.price) AS subtotal, COUNT(*) AS count
      FROM (
        SELECT s.service_name, s.price, cr.requested_at AS created_at
        FROM consultation_records cr JOIN services s ON s.service_id = cr.service_id
        WHERE cr.bill_id = b.bill_id AND LOWER(TRIM(cr.status)) NOT IN ('cancelled', 'canceled', 'rejected')
        UNION ALL
        SELECT s.service_name, s.price, tri.created_at
        FROM test_request_items tri JOIN services s ON s.service_id = tri.service_id
        JOIN test_requests tr ON tr.request_id = tri.request_id
        WHERE tri.bill_id = b.bill_id AND LOWER(TRIM(tri.status)) NOT IN ('cancelled', 'canceled', 'rejected')
          AND LOWER(TRIM(tr.status)) NOT IN ('cancelled', 'canceled', 'rejected')
      ) l
    ) lines ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) > 0 AS has_items,
        COALESCE(BOOL_OR(tri.queue_id IS NULL AND LOWER(TRIM(tri.status)) = 'requested'), false) AS has_unforwarded,
        COALESCE(BOOL_OR(tr.is_priority), false) AS has_priority
      FROM test_request_items tri JOIN test_requests tr ON tr.request_id = tri.request_id
      WHERE tri.bill_id = b.bill_id AND LOWER(TRIM(tri.status)) NOT IN ('cancelled', 'canceled', 'rejected')
        AND LOWER(TRIM(tr.status)) NOT IN ('cancelled', 'canceled', 'rejected')
    ) lab ON TRUE
    WHERE LOWER(TRIM(b.status)) IN ('pending', 'unpaid', 'paid')
      AND (${billId}::text IS NULL OR b.bill_id = ${billId})
      AND (${days}::int IS NULL
           OR b.created_at >= NOW() - make_interval(days => ${days}::int))
    ORDER BY CASE WHEN LOWER(TRIM(b.status)) = 'paid' THEN 1 ELSE 0 END, COALESCE(b.paid_at, b.created_at) DESC
    LIMIT 1000`;
}

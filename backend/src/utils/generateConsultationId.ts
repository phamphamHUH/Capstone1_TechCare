import type { PoolClient } from "@neondatabase/serverless";

// CR-YY-MMDD-NNNN, same scheme as LR-/LI- in generateId.ts. Call inside a
// transaction that already holds the advisory lock (see consultation controller).
export async function generateConsultationRecordID(client: PoolClient) {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const prefix = `${year}-${month}${day}`;

  const { rows } = await client.query(
    `SELECT consultation_record_id
     FROM consultation_records
     WHERE consultation_record_id LIKE $1
     ORDER BY consultation_record_id DESC
     LIMIT 1`,
    [`CR-${prefix}-%`],
  );
  const nextNumber =
    rows.length > 0 ? Number(rows[0].consultation_record_id.slice(-4)) + 1 : 1;
  return `CR-${prefix}-${String(nextNumber).padStart(4, "0")}`;
}

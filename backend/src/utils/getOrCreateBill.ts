import type { PoolClient } from "@neondatabase/serverless";
import { generateBillId } from "./generateId.js";

export async function getOrCreateOpenBill(
  client: PoolClient,
  patient_id: string,
) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
    `open_bill:${patient_id}`,
  ]);

  const existing = await client.query(
    `SELECT bill_id FROM bills
     WHERE patient_id = $1 AND status = 'Pending'
     FOR UPDATE`,
    [patient_id],
  );
  if (existing.rows.length > 0) {
    return { bill_id: existing.rows[0].bill_id, is_new: false };
  }

  await client.query("SELECT pg_advisory_xact_lock(hashtext('bill_ids'))");
  const bill_id = await generateBillId(client);

  await client.query(
    `INSERT INTO bills (bill_id, patient_id)
     VALUES ($1, $2)`,
    [bill_id, patient_id],
  );
  return { bill_id, is_new: true };
}

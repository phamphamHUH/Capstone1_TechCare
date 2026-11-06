import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import type { PoolClient } from "@neondatabase/serverless";
import { pool } from "../../config/db.js";
import { generateLaboratoryQueueId, generateQueueNumberLaboratory } from "../../utils/generateId.js";
import { publishQueueChange } from "../../services/queue-sse/index.js";

export async function confirmPayment(req: Request, res: Response) {
  const { bill_id } = req.params;
  if (typeof bill_id !== "string" || !bill_id.trim()) return res.status(400).json({ message: "Bill ID is required." });
  const { payment_method = "Cash", discount_type = "Not Eligible", amount_received, reference_num = "", priority } = req.body ?? {};
  if (!["Cash", "Instapay/QRpH"].includes(payment_method) || !["Not Eligible", "Senior Citizen", "PWD"].includes(discount_type)
    || (priority !== undefined && typeof priority !== "boolean")) return res.status(400).json({ message: "A valid payment method, discount and priority are required." });
  let client: PoolClient | undefined;
  let transactionOpen = false;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionOpen = true;
    const reject = async (status: number, message: string) => {
      await client!.query("ROLLBACK"); transactionOpen = false;
      return res.status(status).json({ message });
    };
    const { rows: [original] } = await client.query(
      `SELECT b.*, COALESCE(p.birthdate::date <= ((NOW() AT TIME ZONE 'Asia/Manila')::date - INTERVAL '60 years')::date, false) AS is_senior,
         COALESCE(p.is_pwd, false) AS is_pwd
       FROM bills b JOIN patients p ON p.patient_id = b.patient_id WHERE b.bill_id = $1 FOR UPDATE OF b`, [bill_id]);
    if (!original) return await reject(404, "Bill not found.");
    if (!["Pending", "Paid"].includes(original.status)) return await reject(409, "A cancelled bill cannot be paid.");
    let bill = original;
    let change = 0;
    if (bill.status === "Pending") {
      if ((discount_type === "Senior Citizen" && !bill.is_senior) || (discount_type === "PWD" && !bill.is_pwd)) return await reject(400, "Patient is not eligible for this discount.");
      const { rows: lines } = await client.query(
        `SELECT 'consultation'::text AS line_type, cr.consultation_record_id AS item_id, NULL::text AS request_id,
           cr.service_id, s.service_name, s.service_category, s.price, 1 AS quantity
         FROM consultation_records cr JOIN services s ON s.service_id = cr.service_id
         WHERE cr.bill_id = $1 AND LOWER(TRIM(cr.status)) NOT IN ('cancelled', 'canceled', 'rejected')
         UNION ALL
         SELECT 'laboratory'::text, lri.lab_item_id, lri.request_id, lri.service_id, s.service_name, s.service_category, s.price, 1
         FROM laboratory_request_items lri JOIN services s ON s.service_id = lri.service_id
         JOIN laboratory_requests lr ON lr.request_id = lri.request_id
         WHERE lri.bill_id = $1 AND LOWER(TRIM(lri.status)) NOT IN ('cancelled', 'canceled', 'rejected')
           AND LOWER(TRIM(lr.status)) NOT IN ('cancelled', 'canceled', 'rejected')`, [bill_id]);
      let snapshots = original.items;
      if (typeof snapshots === "string") { try { snapshots = JSON.parse(snapshots); } catch { snapshots = []; } }
      const items = (lines.length ? lines : Array.isArray(snapshots) ? snapshots : []).map((item) => ({ ...item, price: item.price == null ? NaN : Number(item.price), quantity: Number(item.quantity ?? 1) }));
      if (!items.length || items.some((item) => !Number.isFinite(item.price) || item.price < 0 || !Number.isInteger(item.quantity) || item.quantity <= 0)) return await reject(409, "Bill has no valid billable items.");
      const subtotal = Math.round(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;
      const percent = discount_type === "Not Eligible" ? 0 : 20;
      const total = Math.round(subtotal * (1 - percent / 100) * 100) / 100;
      const reference = String(reference_num).trim();
      if (payment_method !== "Cash" && (!reference || reference.length > 50)) return await reject(400, "A transfer reference number of at most 50 characters is required.");
      if (payment_method === "Cash") {
        const received = amount_received === null || amount_received === "" || amount_received === undefined ? NaN : Number(amount_received);
        if (!Number.isFinite(received) || Math.round(received * 100) < Math.round(total * 100)) return await reject(400, "Amount received is less than the total.");
        change = (Math.round(received * 100) - Math.round(total * 100)) / 100;
      }
      const { rows: [saved] } = await client.query(
        `UPDATE bills SET status = 'Paid', subtotal = $2, discount_type = $3, discount_rate = $4,
           discount_amount = $5, total_amount = $6, payment_method = $7, reference_num = $8,
           items = $9::jsonb, discount_pct = $4, receipt_id = COALESCE(receipt_id, $10),
           paid_at = NOW(), billed_at = NOW(), receipt_issued_at = NOW(), received_by = $11, updated_at = NOW()
         WHERE bill_id = $1 AND status = 'Pending' RETURNING *`,
        [bill_id, subtotal, percent ? discount_type : null, percent, Math.round((subtotal - total) * 100) / 100, total,
          payment_method, payment_method === "Cash" ? null : reference, JSON.stringify(items), `R-${randomUUID().slice(0, 12).toUpperCase()}`, req.user?.user_id ?? null]);
      if (!saved) throw new Error("Payment could not be saved.");
      bill = saved;
      await client.query("UPDATE consultation_records SET is_paid = TRUE WHERE bill_id = $1", [bill_id]);
      await client.query(
        `UPDATE laboratory_requests lr SET is_paid = TRUE, status = 'Paid', is_priority = COALESCE($2, lr.is_priority), updated_at = NOW()
         WHERE EXISTS (SELECT 1 FROM laboratory_request_items lri WHERE lri.request_id = lr.request_id AND lri.bill_id = $1)
           AND LOWER(TRIM(lr.status)) NOT IN ('cancelled', 'canceled', 'rejected')`, [bill_id, priority ?? null]);
    }
    await client.query("COMMIT"); transactionOpen = false;

    // Once the bill is paid, forwarding can be retried without altering it.
    let queues: Record<string, unknown>[] = [];
    let queueError: string | undefined;
    let hasLaboratoryItems = false;
    let createdQueues = false;
    try {
      await client.query("BEGIN"); transactionOpen = true;
      await client.query("SELECT pg_advisory_xact_lock(hashtext('queue_ids'))");
      const { rows: items } = await client.query(
        `SELECT lri.lab_item_id, lri.request_id, lri.queue_id, lri.status, lr.patient_id, lr.is_priority, s.room
         FROM laboratory_request_items lri JOIN services s ON s.service_id = lri.service_id
         JOIN laboratory_requests lr ON lr.request_id = lri.request_id
         WHERE lri.bill_id = $1 AND LOWER(TRIM(lri.status)) NOT IN ('cancelled', 'canceled', 'rejected')
           AND LOWER(TRIM(lr.status)) NOT IN ('cancelled', 'canceled', 'rejected')
         ORDER BY lri.request_id, lri.lab_item_id FOR UPDATE OF lri`, [bill_id]);
      hasLaboratoryItems = items.length > 0;
      const groups = new Map<string, { requestId: string; room: string; patientId: string; priority: boolean; ids: string[] }>();
      for (const item of items.filter((item) => !item.queue_id)) {
        if (String(item.status).trim().toLowerCase() !== "requested" || typeof item.room !== "string" || !item.room.trim()) {
          queueError = "Payment was recorded, but some laboratory tests still need an assigned room before they can be forwarded."; break;
        }
        const key = JSON.stringify([item.request_id, item.room]);
        const group = groups.get(key) ?? { requestId: item.request_id, room: item.room, patientId: item.patient_id, priority: item.is_priority === true, ids: [] as string[] };
        group.ids.push(item.lab_item_id); groups.set(key, group);
      }
      if (!queueError) {
        for (const group of groups.values()) {
          const queueId = await generateLaboratoryQueueId(client);
          const number = await generateQueueNumberLaboratory(client, group.room);
          await client.query("INSERT INTO queue_entries (queue_id, patient_id, queue_number, is_priority, status) VALUES ($1, $2, $3, $4, 'Waiting')", [queueId, group.patientId, number, group.priority]);
          const linked = await client.query(
            `UPDATE laboratory_request_items SET queue_id = $1, status = 'Waiting', updated_at = NOW()
             WHERE bill_id = $2 AND lab_item_id = ANY($3::text[]) AND queue_id IS NULL AND LOWER(TRIM(status)) = 'requested' RETURNING lab_item_id`, [queueId, bill_id, group.ids]);
          if (linked.rows.length !== group.ids.length) throw new Error("Some laboratory tests changed while forwarding.");
          createdQueues = true;
        }
        const result = await client.query(
          `SELECT DISTINCT q.*, s.room FROM queue_entries q JOIN laboratory_request_items lri ON lri.queue_id = q.queue_id
           JOIN services s ON s.service_id = lri.service_id WHERE lri.bill_id = $1 ORDER BY q.queue_id, s.room`, [bill_id]);
        queues = result.rows;
        if (hasLaboratoryItems && !queues.length) queueError = "Payment was recorded, but the laboratory queue could not be verified.";
      }
      await client.query(queueError ? "ROLLBACK" : "COMMIT"); transactionOpen = false;
    } catch (error) {
      if (transactionOpen) await client.query("ROLLBACK").catch(console.error);
      transactionOpen = false; queues = [];
      queueError = "Payment was recorded, but laboratory forwarding failed. Retry forwarding from the paid bill.";
      console.error("Unable to forward paid bill:", { bill_id, error });
    }
    if (createdQueues && !queueError) publishQueueChange();
    return res.status(200).json({ message: queueError || "Payment confirmed successfully.", bill, change,
      queues, queued: !queueError && (!hasLaboratoryItems || queues.length > 0), has_laboratory_items: hasLaboratoryItems });
  } catch (error) {
    if (client && transactionOpen) await client.query("ROLLBACK").catch(console.error);
    console.error("Unable to record bill payment:", { bill_id, error });
    return res.status(500).json({ message: "Payment could not be recorded. Refresh the bill status before trying again." });
  } finally { client?.release(); }
}

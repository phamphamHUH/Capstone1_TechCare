import type { Request, Response } from "express";
import { sql } from "../../config/db.js";

// These handlers are mounted behind patientMiddleware. Never trust a URL patient ID.
export async function getPortalHistory(req: Request, res: Response) {
  const patientId = res.locals.patientId as string;
  if (req.params.patient_id !== patientId)
    return res
      .status(403)
      .json({ message: "You can only view your own records." });
  const page = Math.max(1, Number.parseInt(String(req.query.page)) || 1);
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(String(req.query.limit)) || 6),
  );
  const { search, service_category, status, start_date, end_date } = req.query;
  for (const date of [start_date, end_date]) {
    if (
      date &&
      (typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date)
    ) {
      return res
        .status(400)
        .json({ message: "Use a valid date in YYYY-MM-DD format." });
    }
  }
  if (
    typeof start_date === "string" &&
    typeof end_date === "string" &&
    start_date > end_date
  ) {
    return res
      .status(400)
      .json({ message: "Start date must be on or before end date." });
  }
  try {
    const values: unknown[] = [patientId];
    const filters: string[] = [];
    const add = (condition: string, value: unknown) => {
      values.push(value);
      filters.push(condition.replace("?", `$${values.length}`));
    };
    if (typeof search === "string" && search.trim())
      add("service_name ILIKE ?", `%${search.trim()}%`);
    if (typeof service_category === "string" && service_category)
      add("service_category = ?", service_category);
    if (typeof status === "string" && status)
      add("LOWER(status) = LOWER(?)", status);
    if (start_date) add("occurred_at >= ?::date", start_date);
    if (end_date) add("occurred_at < (?::date + INTERVAL '1 day')", end_date);
    // Item status tracks processing; publication is recorded on test_results.
    const history = `WITH history AS (
      SELECT 'consultation'::text AS record_type, cr.consultation_record_id AS record_id,
        s.service_name, s.room, 'Consultation'::text AS service_category, cr.status,
        COALESCE(cr.consulted_at, cr.requested_at) AS occurred_at
      FROM consultation_records cr JOIN services s ON s.service_id = cr.service_id
      WHERE cr.patient_id = $1
      UNION ALL
      SELECT 'laboratory'::text, li.item_id, s.service_name, s.room,
        'Laboratory'::text,
        CASE WHEN EXISTS (
          SELECT 1 FROM test_results r WHERE r.item_id = li.item_id AND r.status = 'Released'
        ) THEN 'Released' ELSE li.status END, lr.requested_at
      FROM test_request_items li
      JOIN test_requests lr ON lr.request_id = li.request_id
      JOIN services s ON s.service_id = li.service_id WHERE lr.patient_id = $1
    ), filtered AS (SELECT * FROM history ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""})`;
    const count = await sql.query(
      `${history} SELECT COUNT(*) AS total FROM filtered`,
      values,
    );
    const records = await sql.query(
      `${history} SELECT * FROM filtered ORDER BY occurred_at DESC, record_id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, (page - 1) * limit],
    );
    const total = Number(count[0]?.total || 0);
    return res.json({
      records,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Unable to load patient history:", error);
    return res.status(500).json({ message: "Unable to load medical history." });
  }
}

export async function getPortalRecord(req: Request, res: Response) {
  const patientId = res.locals.patientId as string;
  const { record_type, record_id } = req.params;
  try {
    if (record_type === "consultation") {
      const [record] = await sql`
        SELECT cr.consultation_record_id, cr.status, cr.consultation_type,
          cr.diagnosis, cr.presenting_complaint, cr.vital_signs, cr.physical_examination,
          cr.notes, COALESCE(cr.consulted_at, cr.requested_at) AS occurred_at,
          s.service_name, s.room,
          CONCAT_WS(' ', ru.first_name, ru.last_name) AS requested_by, ru.role AS requested_by_role,
          CONCAT_WS(' ', du.first_name, du.last_name) AS processed_by, du.role AS processed_by_role
        FROM consultation_records cr JOIN services s ON s.service_id = cr.service_id
        LEFT JOIN users ru ON ru.user_id = cr.requested_by
        LEFT JOIN users du ON du.user_id = cr.consulted_by
        WHERE cr.consultation_record_id = ${record_id} AND cr.patient_id = ${patientId}
      `;
      if (!record)
        return res
          .status(404)
          .json({ message: "Consultation record not found." });
      const prescriptions = await sql`
        SELECT prescription_id, prescription_items, notes, valid_until, prescribed_at, status
        FROM prescription_records WHERE consultation_record_id = ${record_id} AND patient_id = ${patientId}
        ORDER BY prescribed_at DESC
      `;
      return res.json({ record_type, ...record, prescriptions });
    }
    if (record_type === "laboratory") {
      const [record] = await sql`
        SELECT li.item_id AS lab_item_id,
          CASE WHEN EXISTS (
            SELECT 1 FROM test_results r WHERE r.item_id = li.item_id AND r.status = 'Released'
          ) THEN 'Released' ELSE li.status END AS status,
          lr.requested_at AS occurred_at, s.service_name, s.room,
          CONCAT_WS(' ', ru.first_name, ru.last_name) AS requested_by, ru.role AS requested_by_role,
          CONCAT_WS(' ', pu.first_name, pu.last_name) AS processed_by, pu.role AS processed_by_role
        FROM test_request_items li
        JOIN test_requests lr ON lr.request_id = li.request_id
        JOIN services s ON s.service_id = li.service_id
        LEFT JOIN users ru ON ru.user_id = lr.requested_by
        LEFT JOIN users pu ON pu.user_id = li.processed_by
        WHERE li.item_id = ${record_id} AND lr.patient_id = ${patientId}
      `;
      if (!record)
        return res
          .status(404)
          .json({ message: "Laboratory record not found." });
      const results = await sql`
        SELECT result_id, results, remarks, verified_at, released_at
        FROM test_results WHERE item_id = ${record_id} AND status = 'Released'
        ORDER BY created_at DESC
      `;
      return res.json({ record_type, ...record, results });
    }
    return res.status(400).json({ message: "Invalid record type." });
  } catch (error) {
    console.error("Unable to load patient record:", error);
    return res.status(500).json({ message: "Unable to load visit details." });
  }
}

type QueueRow = {
  id: number;
  queue_id: string;
  patient_id: string;
  queue_number: number;
  status: string;
  is_priority: boolean;
  service_type: string;
  service_name: string;
  room: string | null;
};

export async function getPortalReleasedResult(req: Request, res: Response) {
  try {
    const results = await sql`
      SELECT r.result_id, r.item_id, r.item_id AS lab_item_id, r.results, r.remarks, r.image_url,
        r.status, r.released_at, r.verified_by, r.verified_at, r.created_at, r.updated_at,
        lr.request_id, lr.patient_id, lr.requested_at, lr.is_priority,
        li.service_id, li.queue_id, s.service_name, s.room,
        CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name, p.suffix) AS patient_name,
        p.birthdate, p.sex
      FROM test_results r
      JOIN test_request_items li ON li.item_id = r.item_id
      JOIN test_requests lr ON lr.request_id = li.request_id
      JOIN services s ON s.service_id = li.service_id
      JOIN patients p ON p.patient_id = lr.patient_id
      WHERE r.result_id = ${req.params.result_id} AND r.status = 'Released'
        AND lr.patient_id = ${res.locals.patientId}
    `;
    if (!results.length)
      return res.status(404).json({ message: "Released result not found." });
    return res.json({ results });
  } catch (error) {
    console.error("Unable to load patient result:", error);
    return res
      .status(500)
      .json({ message: "Unable to load laboratory result." });
  }
}

export async function getPortalPrescriptions(req: Request, res: Response) {
  const patientId = res.locals.patientId as string;
  if (req.params.patient_id !== patientId)
    return res
      .status(403)
      .json({ message: "You can only view your own prescriptions." });
  const consultationId =
    typeof req.query.consultation_record_id === "string"
      ? req.query.consultation_record_id
      : null;
  try {
    const prescriptions = consultationId
      ? await sql`
      SELECT prescription_id, patient_id, consultation_record_id, prescription_items, notes, valid_until, status, prescribed_at
      FROM prescription_records WHERE patient_id = ${patientId} AND consultation_record_id = ${consultationId}
      ORDER BY prescribed_at DESC
    `
      : await sql`
      SELECT prescription_id, patient_id, consultation_record_id, prescription_items, notes, valid_until, status, prescribed_at
      FROM prescription_records WHERE patient_id = ${patientId} AND status = 'Active'
        AND (valid_until IS NULL OR valid_until >= CURRENT_DATE) ORDER BY prescribed_at DESC
    `;
    return res.json({ prescriptions });
  } catch (error) {
    console.error("Unable to load patient prescriptions:", error);
    return res.status(500).json({ message: "Unable to load prescriptions." });
  }
}

export async function getPortalQueues(_req: Request, res: Response) {
  try {
    // Read today's operational queues, but expose only the caller's rows and anonymous counts.
    const rows = (await sql`
      SELECT q.id, q.queue_id, q.patient_id, q.queue_number, LOWER(q.status) AS status, q.is_priority,
        LOWER(COALESCE(cs.service_type, lab.service_type)) AS service_type,
        COALESCE(cs.service_name, lab.service_name) AS service_name, COALESCE(cs.room, lab.room) AS room
      FROM queue_entries q
      LEFT JOIN consultation_records cr ON cr.queue_id = q.queue_id
      LEFT JOIN services cs ON cs.service_id = cr.service_id
      LEFT JOIN LATERAL (
        SELECT s.service_type, s.service_name, s.room FROM test_request_items li
        JOIN services s ON s.service_id = li.service_id WHERE li.queue_id = q.queue_id
        ORDER BY li.item_id LIMIT 1
      ) lab ON TRUE
      WHERE q.created_at >= CURRENT_DATE AND q.created_at < CURRENT_DATE + INTERVAL '1 day'
    `) as QueueRow[];
    // Match the staff queue panels: serving entries first, then queue number.
    const rank = (row: QueueRow) => (row.status === "serving" ? 0 : 1);
    const queues = rows
      .filter(
        (row) =>
          row.patient_id === res.locals.patientId &&
          !["cancelled", "completed"].includes(row.status),
      )
      .map((own) => {
        const peers = rows
          .filter(
            (row) =>
              row.service_type === own.service_type &&
              row.room === own.room &&
              ["waiting", "serving", "skipped"].includes(row.status),
          )
          .sort(
            (a, b) =>
              rank(a) - rank(b) ||
              a.queue_number - b.queue_number ||
              a.id - b.id,
          );
        const position = peers.findIndex(
          (row) => row.queue_id === own.queue_id,
        );
        return {
          queue_id: own.queue_id,
          queue_number: own.queue_number,
          service_type: own.service_type,
          service_name: own.service_name,
          room: own.room,
          status: own.status,
          now_serving: peers
            .filter((row) => row.status === "serving")
            .map((row) => row.queue_number),
          requests_ahead: own.status === "serving" ? 0 : Math.max(0, position),
        };
      });
    const [release] = await sql`
      SELECT COUNT(*) AS awaiting_results FROM test_request_items li
      JOIN test_requests lr ON lr.request_id = li.request_id
      WHERE lr.patient_id = ${res.locals.patientId} AND li.status = 'Completed'
        AND NOT EXISTS (
          SELECT 1 FROM test_results r WHERE r.item_id = li.item_id AND r.status = 'Released'
        )
    `;
    return res.json({
      queues,
      awaiting_results: Number(release?.awaiting_results || 0),
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Unable to load patient queues:", error);
    return res.status(500).json({ message: "Unable to load queue tracking." });
  }
}

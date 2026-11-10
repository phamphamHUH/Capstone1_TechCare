import { sql } from "../../config/db.js";
import type { Request, Response } from "express";
import type {
  getLaboratoryRequestDetails,
  getLaboratoryQueues,
  getRoomSpecificServices,
  getLaboratoryQueueItems,
  getAnalysisItems,
  getSavedLaboratoryResults,
  getAnalysisReadyRequests,
  getAvailableFormTemplates,
  getReleasedLaboratoryResults,
  getReleasedLaboratoryResult,
} from "./dto/get.dto.js";

export async function getRoomSpecificServices(
  req: Request,
  res: Response<
    getRoomSpecificServices.response | getRoomSpecificServices.error
  >,
) {
  const { room } = req.params;
  if (!room) {
    return res.status(400).json({
      message: "Room field is required.",
    } as getRoomSpecificServices.error);
  }
  try {
    const services = await sql`
    SELECT * FROM services
    WHERE room = ${room}
    ORDER BY service_id ASC
      `;
    if (!services) {
      return res.json({
        message: "there are no services",
      } as getRoomSpecificServices.response);
    }
    return res
      .status(200)
      .json(services as unknown as getRoomSpecificServices.response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Internal Server Error",
    } as getRoomSpecificServices.error);
  }
}

export async function getLaboratoryQueues(
  req: Request,
  res: Response<getLaboratoryQueues.response | getLaboratoryQueues.error>,
) {
  try {
    const { room } = req.params;

    const queues = await sql`
      SELECT
        q.*,
        CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name) AS patient_name,
        ${room}::text AS room,
        COALESCE(
          (
            SELECT s.service_name
            FROM test_request_items tri
            JOIN services s ON s.service_id = tri.service_id
            WHERE tri.queue_id = q.queue_id
              AND s.room::text = ${room}
            ORDER BY tri.item_id
            LIMIT 1
          ), ''
        ) AS service_name,
        COALESCE(
          (
            SELECT s.service_type
            FROM test_request_items tri
            JOIN services s ON s.service_id = tri.service_id
            WHERE tri.queue_id = q.queue_id
              AND s.room::text = ${room}
            ORDER BY tri.item_id
            LIMIT 1
          ), ''
        ) AS service_type,
        COALESCE(
          (
            SELECT s.service_category
            FROM test_request_items tri
            JOIN services s ON s.service_id = tri.service_id
            WHERE tri.queue_id = q.queue_id
              AND s.room::text = ${room}
            ORDER BY tri.item_id
            LIMIT 1
          ), ''
        ) AS service_category
      FROM queue_entries q
      JOIN patients p ON p.patient_id = q.patient_id
      WHERE q.queue_id LIKE 'LAB-%'
        AND EXISTS (
          SELECT 1
          FROM test_request_items tri
          JOIN services s ON s.service_id = tri.service_id
          WHERE tri.queue_id = q.queue_id
            AND s.room::text = ${room}
        )
        AND q.created_at >= CURRENT_DATE
        AND q.created_at <  CURRENT_DATE + INTERVAL '1 day'
      ORDER BY q.queue_number ASC, q.id ASC
    `;

    return res.status(200).json(queues as getLaboratoryQueues.response);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Internal Server Error" } as getLaboratoryQueues.error);
  }
}

export async function getLaboratoryRequestDetails(
  req: Request,
  res: Response<
    getLaboratoryRequestDetails.response | getLaboratoryRequestDetails.error
  >,
) {
  try {
    const { queue_id } = req.params;
    const room = typeof req.query.room === "string" ? req.query.room : "";

    if (!room) {
      return res.status(400).json({
        message: "room is required",
      } as getLaboratoryRequestDetails.error);
    }

    const result = await sql`
      SELECT
        json_build_object(
          'request', json_build_object(
            'request_id', tr.request_id,
            'consultation_record_id', tr.consultation_record_id,
            'requested_by', tr.requested_by,
            'is_priority', q.is_priority,
            'status', q.status,
            'is_paid', tr.is_paid,
            'patient_id', p.patient_id,
            'first_name', p.first_name,
            'last_name', p.last_name,
            'middle_name', p.middle_name,
            'suffix', p.suffix,
            'sex', p.sex,
            'email', p.email,
            'contact_number', p.contact_number,
            'address', CONCAT_WS(', ', p.street, p.barangay, p.city, p.province, p.zip_code),
            'blood_type', p.blood_type,
            'birthdate', p.birthdate,
            'emergency_contact_name', p.guardian_name,
            'emergency_contact', p.guardian_contact,
            'requested_at', tr.requested_at,
            'updated_at', tr.updated_at
          ),
          'items', COALESCE((
            SELECT json_agg(
              json_build_object(
                'item_id', ri.item_id,
                'queue_id', ri.queue_id,
                'status', ri.status,
                'processed_by', ri.processed_by,
                'created_at', ri.created_at,
                'updated_at', ri.updated_at,
                'in_current_room', (s.room = ${room}),
                'service', json_build_object(
                  'service_id', s.service_id,
                  'service_name', s.service_name,
                  'service_type', s.service_type,
                  'service_category', s.service_category,
                  'room', s.room
                )
              )
              ORDER BY (s.room = ${room}) DESC, ri.created_at ASC
            )
            FROM test_request_items ri
            JOIN services s ON s.service_id = ri.service_id
            WHERE ri.request_id = tr.request_id
          ), '[]'::json)
        ) AS response
      FROM queue_entries q
      JOIN test_requests tr ON tr.request_id = (
        SELECT ri2.request_id
        FROM test_request_items ri2
        WHERE ri2.queue_id = q.queue_id
        LIMIT 1
      )
      JOIN patients p ON p.patient_id = tr.patient_id
      WHERE q.queue_id = ${queue_id}
    `;

    if (result.length === 0) {
      return res.status(404).json({
        message: "Laboratory request not found",
      } as getLaboratoryRequestDetails.error);
    }

    return res
      .status(200)
      .json(result[0].response as getLaboratoryRequestDetails.response);
  } catch (error) {
    console.error("getLaboratoryRequestDetails:", error);
    return res.status(500).json({
      message: "Internal Server Error",
    } as getLaboratoryRequestDetails.error);
  }
}

export async function getLaboratoryQueueItems(
  req: Request,
  res: Response<
    getLaboratoryQueueItems.response | getLaboratoryQueueItems.error
  >,
) {
  try {
    const { queue_id } = req.params;

    const items = await sql`
      SELECT
        ri.item_id,
        ri.request_id,
        ri.queue_id,
        ri.service_id,
        ri.processed_by,
        ri.status,
        ri.created_at,
        ri.updated_at,
        s.service_name,
        s.service_type,
        s.service_category,
        s.room
      FROM test_request_items ri
      JOIN services s ON s.service_id = ri.service_id
      WHERE ri.queue_id = ${queue_id}
      ORDER BY ri.created_at ASC
    `;

    return res.status(200).json(items as getLaboratoryQueueItems.response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
    } as getLaboratoryQueueItems.error);
  }
}

export async function getAnalysisReadyRequests(
  req: Request,
  res: Response<
    getAnalysisReadyRequests.response | getAnalysisReadyRequests.error
  >,
) {
  try {
    const analysisReadyRequests = await sql`
      SELECT
        ri.item_id,
        ri.request_id,
        ri.service_id,
        s.room,
        ri.queue_id,
        ri.processed_by,
        ri.status,
        ri.created_at,
        ri.updated_at
      FROM test_request_items ri
      JOIN services s ON s.service_id = ri.service_id
      WHERE ri.status = 'Collected'
      ORDER BY ri.created_at ASC
    `;

    return res
      .status(200)
      .json(analysisReadyRequests as getAnalysisReadyRequests.response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
    } as getAnalysisReadyRequests.error);
  }
}

export async function getAnalysisItems(
  req: Request,
  res: Response<getAnalysisItems.response | getAnalysisItems.error>,
) {
  const room = typeof req.query.room === "string" ? req.query.room.trim() : "";
  if (!room)
    return res
      .status(400)
      .json({ message: "room is required" } as getAnalysisItems.error);
  try {
    const items = await sql`
      SELECT ri.item_id, ri.request_id, ri.service_id, ri.queue_id, ri.status,
        s.room, s.service_name, s.service_type,
        tr.patient_id, tr.requested_at,
        p.first_name, p.last_name, p.middle_name, p.suffix, p.birthdate, p.sex,
        COALESCE(q.is_priority, tr.is_priority) AS is_priority,
        COALESCE(q.status, ri.status) AS request_status,
        CASE WHEN ri.status IN ('Completed', 'Released') OR EXISTS (
          SELECT 1 FROM test_results r WHERE r.item_id = ri.item_id
            AND r.status IN ('Pending', 'Released')
        ) THEN 'Completed'
        WHEN ri.status = 'In Progress' THEN 'In Progress'
        ELSE 'Ready for Analysis' END AS analysis_status
      FROM test_request_items ri
      JOIN services s ON s.service_id = ri.service_id
      JOIN test_requests tr ON tr.request_id = ri.request_id
      JOIN patients p ON p.patient_id = tr.patient_id
      LEFT JOIN queue_entries q ON q.queue_id = ri.queue_id
      WHERE s.room = ${room}
        AND ri.status IN ('Specimen Collected', 'In Progress', 'Completed', 'Released')
      ORDER BY ri.created_at ASC
    `;
    return res.json(items as getAnalysisItems.response);
  } catch (error) {
    console.error("Unable to load analysis items:", error);
    return res.status(500).json({
      message: "Unable to load analysis items.",
    } as getAnalysisItems.error);
  }
}

export async function getSavedLaboratoryResults(
  req: Request,
  res: Response<
    getSavedLaboratoryResults.response | getSavedLaboratoryResults.error
  >,
) {
  const room = typeof req.query.room === "string" ? req.query.room.trim() : "";
  if (!room)
    return res
      .status(400)
      .json({ message: "room is required" } as getSavedLaboratoryResults.error);
  try {
    const results = await sql`
      SELECT r.* FROM test_results r
      JOIN test_request_items ri ON ri.item_id = r.item_id
      JOIN services s ON s.service_id = ri.service_id
      WHERE s.room = ${room} AND r.status IN ('Pending', 'Released')
      ORDER BY r.updated_at DESC
    `;
    return res.json({
      results: results as getSavedLaboratoryResults.resultItem[],
    } as getSavedLaboratoryResults.response);
  } catch (error) {
    console.error("Unable to load saved results:", error);
    return res.status(500).json({
      message: "Unable to load saved results.",
    } as getSavedLaboratoryResults.error);
  }
}

export async function getAvailableFormTemplates(
  req: Request,
  res: Response<
    getAvailableFormTemplates.response | getAvailableFormTemplates.error
  >,
) {
  try {
    const templates = await sql`
      SELECT
        ft.form_id,
        ft.form_name,
        ft.form_description,
        ft.service_id,
        ft.status,
        s.service_name,
        ft.version,
        ft.created_by,
        ft.created_at,
        ft.updated_at,
        COALESCE((
          SELECT jsonb_agg(to_jsonb(fc) ORDER BY fc.display_order, fc.form_component_id)
          FROM form_components fc
          WHERE fc.form_id = ft.form_id
        ), '[]'::jsonb) AS components
      FROM form_templates ft
      JOIN services s ON s.service_id = ft.service_id
      WHERE ft.status = 'Published'
      ORDER BY ft.version DESC, ft.form_name ASC
    `;

    return res
      .status(200)
      .json(templates as getAvailableFormTemplates.response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
    } as getAvailableFormTemplates.error);
  }
}

// IMPORTANT: Fetches laboratory results only after they have been released.
export async function getReleasedLaboratoryResults(
  req: Request,
  res: Response<
    getReleasedLaboratoryResults.response | getReleasedLaboratoryResults.error
  >,
) {
  try {
    const results = await sql`
      SELECT
        result_id,
        item_id,
        results,
        remarks,
        image_url,
        verified_by,
        verified_at,
        created_at,
        updated_at
      FROM test_results
      WHERE status = 'Released'
      ORDER BY updated_at DESC;
    `;

    return res.status(200).json({
      message: "Released laboratory results fetched successfully.",
      results: results as getReleasedLaboratoryResults.releasedResult[],
    } as getReleasedLaboratoryResults.response);
  } catch (error) {
    console.error("Unable to fetch released laboratory results:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    } as getReleasedLaboratoryResults.error);
  }
}

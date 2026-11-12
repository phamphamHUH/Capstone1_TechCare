import { sql } from "../../config/db.js";
import type { Request, Response } from "express";
import type { saveLaboratoryResult } from "./dto/post.dto.js";

export async function saveLaboratoryResult(
  req: Request,
  res: Response<saveLaboratoryResult.response | saveLaboratoryResult.error>,
) {
  try {
    const { item_id } = req.params;
    const { results, remarks, image_url, room } =
      req.body as saveLaboratoryResult.body;
    if (typeof room !== "string" || !room.trim()) {
      return res
        .status(400)
        .json({ message: "room is required" } as saveLaboratoryResult.error);
    }

    if (!item_id) {
      return res.status(400).json({
        message: "Laboratory item ID is required.",
      } as saveLaboratoryResult.error);
    }

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({
        message: "At least one laboratory result is required.",
      } as saveLaboratoryResult.error);
    }

    const invalidResult = results.some(
      (item: { name?: string; result?: string | number }) =>
        !item ||
        typeof item.name !== "string" ||
        !item.name.trim() ||
        item.result === undefined ||
        item.result === null ||
        !["string", "number"].includes(typeof item.result) ||
        (typeof item.result === "string" && !item.result.trim()) ||
        (typeof item.result === "number" && !Number.isFinite(item.result)),
    );

    if (invalidResult) {
      return res.status(400).json({
        message: "Each result must have a valid name and value.",
      } as saveLaboratoryResult.error);
    }

    const [item] = await sql`
      SELECT item_id
      FROM test_request_items
      WHERE item_id = ${item_id}
      LIMIT 1
    `;

    if (!item) {
      return res.status(404).json({
        message: "Laboratory request item not found.",
      } as saveLaboratoryResult.error);
    }

    const result_id = `RES-${crypto.randomUUID()}`;
    const [savedResult] = await sql`
      WITH eligible AS MATERIALIZED (
        SELECT ri.item_id FROM test_request_items ri
        JOIN services s ON s.service_id = ri.service_id
        WHERE ri.item_id = ${item_id} AND s.room = ${room}
          AND ri.status = 'In Progress'
          AND NOT EXISTS (SELECT 1 FROM test_results r WHERE r.item_id = ri.item_id AND r.status = 'Released')
        FOR UPDATE OF ri
      ), updated AS (
        UPDATE test_results r SET
          results = ${JSON.stringify(results)}::jsonb,
          remarks = ${typeof remarks === "string" ? remarks.trim() || null : null},
          image_url = ${typeof image_url === "string" ? image_url.trim() || null : null},
          -- Editing a verified result sends it back for verification.
          status = 'Pending',
          verified_by = NULL,
          verified_at = NULL,
          updated_at = NOW()
        FROM eligible e WHERE r.item_id = e.item_id AND r.status IN ('Pending', 'Verified')
        RETURNING r.*
      ), inserted AS (
        INSERT INTO test_results (result_id, item_id, results, remarks, image_url)
        SELECT ${result_id}, e.item_id, ${JSON.stringify(results)}::jsonb,
          ${typeof remarks === "string" ? remarks.trim() || null : null},
          ${typeof image_url === "string" ? image_url.trim() || null : null}
        FROM eligible e WHERE NOT EXISTS (SELECT 1 FROM test_results r WHERE r.item_id = e.item_id)
        RETURNING *
      ), saved AS (
        SELECT * FROM updated UNION ALL SELECT * FROM inserted
      ), completed AS (
        UPDATE test_request_items ri SET status = 'Completed', updated_at = NOW()
        FROM saved WHERE ri.item_id = saved.item_id
        RETURNING ri.item_id
      )
      SELECT saved.* FROM saved JOIN completed USING (item_id)
    `;

    if (!savedResult)
      return res.status(409).json({
        message:
          "Only an in-progress test in this room can be saved. Refresh the list to check its status.",
      } as saveLaboratoryResult.error);

    return res.status(201).json({
      message: "Laboratory results saved successfully.",
      result: savedResult as unknown as saveLaboratoryResult.laboratoryResult,
    } as saveLaboratoryResult.response);
  } catch (error) {
    console.error("Error saving laboratory results:", error);

    return res.status(500).json({
      message: "Internal server error.",
    } as saveLaboratoryResult.error);
  }
}

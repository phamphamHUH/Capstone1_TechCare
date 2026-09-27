import { sql } from "../../config/db.js";
import { Request, Response } from "express";

// =========================
// DELETE TEMPLATE
// =========================
export async function deleteTemplate(
  req: Request<{ form_id: string }>,
  res: Response,
) {
  // DELETE /api/admin/templates/:template_id

  try {
    const { form_id } = req.params;

     if (!form_id) {
      return res.status(400).json({ message: "form_id is required." });
    }

    const [existingTemplate] = await sql`
      SELECT form_id FROM form_templates WHERE form_id = ${form_id}
    `;

    if (!existingTemplate) {
      return res.status(404).json({
        message: "Template not found",
      });
    }

    await sql.query("BEGIN");

    // form_components.form_id has no ON DELETE CASCADE, so child rows
    // must be removed first or the delete below violates the FK constraint.
    await sql`
      DELETE FROM form_components WHERE form_id = ${form_id}
    `;

    const [deletedTemplate] = await sql`
      DELETE FROM form_templates
      WHERE form_id = ${form_id}
      RETURNING *;
    `;

    await sql.query("COMMIT");

    return res.status(200).json({
      message: "Template deleted successfully!",
      template: deletedTemplate[0],
    });
  } catch (error) {
    console.error("DELETE TEMPLATE ERROR:", error);
    await sql.query("ROLLBACK"); // Rollback the transaction in case of an error

    return res.status(500).json({
      message: "Failed to delete template",
    });
  }
}
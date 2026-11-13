import type { Request, Response } from "express";
import { sql } from "../../config/db.js";
import type { deleteTemplate } from "./dto/delete.dto.js";

export async function deleteTemplate(req: Request, res: Response) {
  const { form_id } = req.params;
  if (!form_id)
    return res.status(400).json({ message: "Form ID is required." });

  try {
    const [, deleted] = await sql.transaction([
      sql`DELETE FROM form_components
          WHERE form_id = ${form_id}
            AND EXISTS (SELECT 1 FROM form_templates WHERE form_id = ${form_id} AND status = 'Draft')`,
      sql`DELETE FROM form_templates WHERE form_id = ${form_id} AND status = 'Draft' RETURNING *`,
    ]);

    if (deleted.length === 0) {
      const [exists] =
        await sql`SELECT status FROM form_templates WHERE form_id = ${form_id}`;
      return exists
        ? res.status(409).json({
            message:
              "Only draft templates can be deleted. Published and archived versions are kept as history.",
          })
        : res.status(404).json({ message: "Form template not found." });
    }
    return res
      .status(200)
      .json({ message: "Draft deleted.", template: deleted[0] });
  } catch (error) {
    console.error("Error deleting form template:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export async function deleteService(req: Request, res: Response) {
  try {
    const { service_id } = req.params as { service_id: string };

    if (!service_id) {
      return res.status(400).json({
        message: "Service ID is required",
      });
    }

    if (service_id.startsWith("P-")) {
      const deletedPackage = await sql`
        DELETE FROM packages
        WHERE package_id = ${service_id}
        RETURNING *
      `;

      if (deletedPackage.length === 0) {
        return res.status(404).json({
          message: "Package not found",
        });
      }

      await sql`
        DELETE FROM package_services
        WHERE package_id = ${service_id}
      `;

      return res.status(200).json({
        message: "Package deleted successfully!",
        package: deletedPackage[0],
      });
    }

    const existingPackages = await sql`
      SELECT p.package_id, p.package_name
      FROM package_services ps
      JOIN packages p ON p.package_id = ps.package_id
      WHERE ps.service_id = ${service_id}
    `;

    if (existingPackages.length > 0) {
      const packageNames = existingPackages
        .map((pkg) => pkg.package_name)
        .join(", ");

      return res.status(409).json({
        message: `Cannot delete this service because it is included in  package/s: ${packageNames}.`,
        packages: existingPackages,
      });
    }

    const deletedService = await sql`
      DELETE FROM services
      WHERE service_id = ${service_id}
      RETURNING *
    `;

    if (deletedService.length === 0) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    return res.status(200).json({
      message: "Service deleted successfully!",
      service: deletedService[0],
    });
  } catch (error) {
    console.error("DELETE SERVICE ERROR:", error);

    return res.status(500).json({
      message: "An error occurred while deleting the service",
    });
  }
}

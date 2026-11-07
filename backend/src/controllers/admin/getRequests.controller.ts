import { sql } from "../../config/db.js";
import type { Request, Response } from "express";
import type {
  getAllUsers,
  getAllActivities,
  getAllservices,
  getMyActivities,
  getFormTemplateById,
  getAllFormTemplates,
} from "./dto/get.dto.js";

// GET ALL USERS
export async function getAllUsers(
  req: Request,
  res: Response<getAllUsers.response | getAllUsers.error>,
) {
  try {
    const users = await sql`
      SELECT
        id, user_id, username, first_name, middle_name, last_name,
        suffix, sex, email, contact_number, emergency_contact_name,
        emergency_contact, address, birthdate, role, department,
        employment_status, date_hired, shift_start, shift_end,
        last_login, account_status, profile_photo, active,
        created_at, updated_at
      FROM users
    `;

    return res.status(200).json({
      users,
    } as getAllUsers.response);
  } catch (error) {
    console.error("GET ALL USERS ERROR:", error);

    return res.status(500).json({
      message: "Error while fetching users",
    } as getAllUsers.error);
  }
}

// GET ALL ACTIVITIES
export async function getAllActivities(
  req: Request,
  res: Response<getAllActivities.response | getAllActivities.error>,
) {
  try {
    const activities = await sql`
      SELECT
        al.id,
        al.user_id,
        a.action_name,
        a.action_description,
        a.module,
        a.is_sensitive,
        al.status,
        al.target_type,
        al.target_id,
        al.metadata,
        al.created_at
      FROM activity_logs al
      JOIN actions a ON a.action_id = al.action_id
      ORDER BY al.created_at DESC
    `;

    if (activities.length === 0) {
      return res.status(200).json({
        activities: [],
        message: "there are no activities",
      } as getAllActivities.response);
    }

    return res.status(200).json({
      activities,
    } as getAllActivities.response);
  } catch (error) {
    console.error("GET ALL ACTIVITIES ERROR:", error);

    return res.status(500).json({
      error: "error on get acts controller",
    } as getAllActivities.error);
  }
}

// GET ALL SERVICES
export async function getAllservices(
  req: Request,
  res: Response<getAllservices.response | getAllservices.error>,
) {
  try {
    const services = await sql`
      SELECT *
      FROM services
      ORDER BY service_id ASC
    `;

    const packages = await sql`
      SELECT
        p.id,
        p.package_id                              AS service_id,
        p.package_name                            AS service_name,
        'package'::text                           AS service_type,
        'Package'::text                           AS service_category,
        p.package_price                           AS price,
        '-'::text                                 AS room,
        (LOWER(TRIM(p.status)) = 'active')        AS active,
        COALESCE(
          ARRAY_AGG(ps.service_id ORDER BY ps.service_id)
            FILTER (WHERE ps.service_id IS NOT NULL),
          '{}'::text[]
        )                                         AS service_ids,
        COALESCE(
          ARRAY_AGG(s.service_name ORDER BY s.service_name)
            FILTER (WHERE s.service_name IS NOT NULL),
          '{}'::text[]
        )                                         AS service_names,
        p.created_at,
        p.updated_at
      FROM packages p
      LEFT JOIN package_services ps ON ps.package_id = p.package_id
      LEFT JOIN services s          ON s.service_id = ps.service_id
      GROUP BY p.id
      ORDER BY p.package_id ASC
    `;

    return res.status(200).json({
      services,
      packages,
    } as getAllservices.response);
  } catch (error) {
    console.error("GET ALL SERVICES ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    } as getAllservices.error);
  }
}

// GET MY ACTIVITIES
export async function getMyActivities(
  req: Request,
  res: Response<getMyActivities.response | getMyActivities.error>,
) {
  try {
    const activities = await sql`
      SELECT *
      FROM system_activity
      WHERE user_id = ${req.user.user_id}
      ORDER BY created_at DESC
    `;

    if (activities.length === 0) {
      return res.status(200).json({
        message: "You have no activities",
        activities: [],
      } as getMyActivities.response);
    }

    return res.status(200).json({
      activities,
    } as getMyActivities.response);
  } catch (error) {
    console.error("GET MY ACTIVITIES ERROR:", error);

    return res.status(500).json({
      error: "error on get your activities",
    } as getMyActivities.error);
  }
}

// GET ALL FORM TEMPLATES
export async function getAllFormTemplates(
  req: Request,
  res: Response<getAllFormTemplates.response | getAllFormTemplates.error>,
) {
  try {
    const { service_id, status } = req.query as getAllFormTemplates.query;

    const templates = await sql`
      SELECT *
      FROM form_templates
      WHERE
        (${service_id ?? null}::VARCHAR IS NULL
          OR service_id = ${service_id ?? null})
        AND (${status ?? null}::VARCHAR IS NULL
          OR status = ${status ?? null})
      ORDER BY created_at DESC
    `;

    return res.status(200).json({
      message: "Form templates fetched successfully",
      formTemplates: templates,
    } as getAllFormTemplates.response);
  } catch (error) {
    console.error("GET ALL FORM TEMPLATES ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error.",
    } as getAllFormTemplates.error);
  }
}

// GET FORM TEMPLATE BY ID
export async function getFormTemplateById(
  req: Request,
  res: Response<getFormTemplateById.response | getFormTemplateById.error>,
) {
  try {
    const { form_id } = req.params;

    if (!form_id) {
      return res.status(400).json({
        message: "Form ID is required.",
      } as getFormTemplateById.error);
    }

    const [formTemplate] = await sql`
      SELECT *
      FROM form_templates
      WHERE form_id = ${form_id}
    `;

    if (!formTemplate) {
      return res.status(404).json({
        message: "Form template not found.",
      } as getFormTemplateById.error);
    }

    const components = await sql`
      SELECT *
      FROM form_components
      WHERE form_id = ${form_id}
      ORDER BY display_order ASC
    `;

    return res.status(200).json({
      message: "Form template fetched successfully",
      formTemplate,
      components,
    } as getFormTemplateById.response);
  } catch (error) {
    console.error("GET FORM TEMPLATE BY ID ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    } as getFormTemplateById.error);
  }
}

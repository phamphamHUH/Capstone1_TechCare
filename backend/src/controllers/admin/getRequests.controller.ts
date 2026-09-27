import { sql } from "../../config/db.js";
import { NextFunction, Request, Response } from "express";

export async function getAllUsers(req: Request, res: Response) {
  // GET /api/admin/users
  try {
    const users = await sql`
      SELECT *
      FROM users
    `;
    return res.status(200).json({
      users,
    });
  } catch (error) {
    console.error("GET ALL USERS ERROR:", error);

    return res.status(500).json({
      message: "Error while fetching users",
    });
  }
}

// Example response:
// {
//   "users": [
//     {
//       "user_id": "USR-2026-0001",
//       "username": "admin",
//       "password_hash": "$2a$10$...",
//       "first_name": "Admin",
//       "middle_name": null,
//       "last_name": "User",
//       "suffix": null,
//       "sex": "Male",
//       "email": "admin@example.com",
//       "contact_number": "1234567890",
//       "emergency_contact_name": "Emergency Contact",
//       "emergency_contact": "09123456789",
//       "address": "Manila, Philippines",
//       "birthdate": "1990-01-01",
//       "role": "Administrator",
//       "department": "Administration",
//       "employment_status": "Regular",
//       "date_hired": "2026-06-28",
//       "shift_start": "08:00:00",
//       "shift_end": "17:00:00",
//       "profile_photo": "https://...",
//       "deleted": false,
//       "created_at": "2026-06-28T20:19:10.904Z",
//       "updated_at": "2026-06-28T20:19:10.904Z"
//     }
//   ]
// }
export async function getAllActivities(req: Request, res: Response) {
  // get /api/admin/activities
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
      JOIN actions a on a.action_id = al.action_id
`;
    if (activities.length === 0) {
      return res
        .status(200)
        .json({ activities: [], message: "there are no activities" });
    }

    res.status(200).json({ activities });
  } catch (error) {
    res.status(500).json({ error: "error on get acts controller" });
  }
}
//----------------------------------------------------------------------------------------------------------------//

export async function getAllservices(req: Request, res: Response) {
  // get /api/admin/services
  try {
    const services = await sql`SELECT * FROM services`;
    return res.status(200).json({ services });

    // {
    //   "services": [
    //   {
    //     "service_id": 1,
    //     "service_name": "Haircut",
    //     "price": "250.00",
    //     "discount_pct": "0.00",
    //     "deleted": false,
    //     "created_at": "2026-07-02T08:00:00.000Z",
    //     "updated_at": "2026-07-02T08:00:00.000Z"
    //   },
    //   {
    //     "service_id": 2,
    //     "service_name": "Hair Coloring",
    //     "price": "1200.00",
    //     "discount_pct": "10.00",
    //     "deleted": false,
    //     "created_at": "2026-07-02T08:05:00.000Z",
    //     "updated_at": "2026-07-02T08:05:00.000Z"
    //   }
    // ]
    // }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
//----------------------------------------------------------------------------------------------------------------//

export async function getMyActivities(req: Request, res: Response) {
  // get /api/admin/activity
  try {
    const response = await sql`
    SELECT * FROM system_activity
    WHERE user_id = ${req.user.user_id}
    `;
    const activities = response[0];
    if (!activities) {
      res.json({ message: "You have no activities " });
    }

    res.status(200).json({ activities });
    // {
    //   "activities":
    //   [{
    //     "activity_id": 1,
    //     "user_id": 11,
    //     "service_name": "pakalbo",
    //     "details": {
    //       "kalbo": "panot",
    //       "semiKal": "utot"},
    //     "created_at": "2026-06-28T20:19:10.904Z",
    //   },
    //   {
    //     "activity_id": 2,
    //     "user_id": 11,
    //     "service_name": "pakalbo",
    //     "details": {
    //       "kalbo": "panot",
    //       "semiKal": "utot"},
    //     "created_at": "2026-06-28T20:19:22.051Z",
    //   }]
    // }
  } catch (error) {
    res.status(500).json({ error: "error on get your activities" });
  }
}

export async function getAllFormTemplates(req: Request, res: Response) {
  try {
    const { service_id, status } = req.query;
    const templates = await sql`
      SELECT * FROM form_templates
      WHERE
        (${service_id ?? null}::VARCHAR IS NULL OR service_id = ${service_id ?? null})
        AND (${status ?? null}::VARCHAR IS NULL OR status = ${status ?? null})
      ORDER BY created_at DESC
    `;

    res.status(200).json({
      message: "Form templates fetched successfully",
      formTemplates: templates,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal Server Error.",
    });
  }
}

export async function getFormTemplateById(req: Request, res: Response) {
  try {
    const { form_id } = req.params;

    if (!form_id) {
      return res.status(400).json({ message: "Form ID is required." });
    }

    const [formTemplate] = await sql`
      SELECT * FROM form_templates
      WHERE form_id = ${form_id}
    `;

    if (!formTemplate) {
      return res.status(404).json({ message: "Form template not found." });
    }

    const components = await sql`
      SELECT * FROM form_components
      WHERE form_id = ${form_id}
      ORDER BY display_order ASC
    `;

    res.status(200).json({
      message: "Form template fetched successfully",
      formTemplate,
      components,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

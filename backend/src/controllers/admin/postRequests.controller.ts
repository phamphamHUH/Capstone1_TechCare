
import { sql } from "../../config/db.js";
import cloudinary from "../../config/cloudinary.js";
import bcrypt from "bcryptjs";
import { registerFormComponentTypes } from "../../utils/formComponentTypes.js";
import { NextFunction, Request, Response } from "express";
import {
  generateUserId,
  generateServiceId,
  generateActivityId,
} from "../../utils/generateId.js";
import type {
  addUser,
  addService,
  addActivity,
  addAction,
  addFormTemplates,
} from "./dto/post.dto.js";

///// the token generation on add user is just for testing purposes,
/// it will be removed later on. optional lang kasi no need tokens right after sign up, its usually on login========

// =========================
// ADD USER
// =========================
export async function addUser(
  req: Request<
    {},
    addUser.response | addUser.error,
    addUser.body
  >,
  res: Response<addUser.response | addUser.error>,
) {
  // POST /api/admin/add-user
  try {
    const {
      username,
      password,
      first_name,
      middle_name,
      last_name,
      suffix,
      sex,
      email,
      contact_number,
      emergency_contact_name,
      emergency_contact,
      address,
      birthdate,
      role,
      department,
      employment_status,
      date_hired,
      shift_start,
      shift_end,
    } = req.body;

    // =========================
    // REQUIRED FIELDS
    // =========================
    if (
      !username ||
      !password ||
      !first_name ||
      !last_name ||
      !sex ||
      !email ||
      !contact_number ||
      !address ||
      !birthdate ||
      !role ||
      !date_hired
    ) {
      return res.status(400).json({
        message: "Please fill out all required fields",
      } as addUser.error);
    }

    // =========================
    // CHECK EXISTING USER
    // =========================
    const existingUser = await sql`
      SELECT user_id
      FROM users
      WHERE username = ${username}
         OR email = ${email}
         OR contact_number = ${contact_number}
    `;

    if (existingUser.length > 0) {
      return res.status(409).json({
        message: "Username, email, or contact number already exists",
      } as addUser.error);
    }

    // =========================
    // HASH PASSWORD
    // =========================
    const hashedPassword = await bcrypt.hash(password, 10);

    // =========================
    // GENERATE USER ID
    // =========================
    const userId = await generateUserId();

    // =========================
    // PROFILE PHOTO
    // =========================
    let profile_photo: string | null = null;

    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "techcare/user_photos",
      });

      profile_photo = uploadResult.secure_url;
    }

    // =========================
    // SHIFT DEFAULTS
    // =========================
    const finalShiftStart = shift_start || "08:00:00";
    const finalShiftEnd = shift_end || "17:00:00";

    // =========================
    // INSERT USER
    // =========================
    const signUpResult = await sql`
      INSERT INTO users (
        user_id,
        username,
        password_hash,
        first_name,
        middle_name,
        last_name,
        suffix,
        sex,
        email,
        contact_number,
        emergency_contact_name,
        emergency_contact,
        address,
        birthdate,
        role,
        department,
        employment_status,
        date_hired,
        shift_start,
        shift_end,
        profile_photo
      )
      VALUES (
        ${userId},
        ${username},
        ${hashedPassword},
        ${first_name},
        ${middle_name || null},
        ${last_name},
        ${suffix || null},
        ${sex},
        ${email},
        ${contact_number},
        ${emergency_contact_name || null},
        ${emergency_contact || null},
        ${address},
        ${birthdate},
        ${role},
        ${department || null},
        ${employment_status || null},
        ${date_hired},
        ${finalShiftStart},
        ${finalShiftEnd},
        ${profile_photo}
      )
      RETURNING *
    `;

    console.log("INSERT RESULT:", signUpResult);

    // =========================
    // REMOVE SENSITIVE DATA
    // =========================
    // Prevents the password hash from being sent to the client.
    const { password_hash, ...safeUser } = signUpResult[0];

    // =========================
    // RESPONSE
    // =========================
    return res.status(201).json({
      user: safeUser,
      message: "User created successfully!",
    } as addUser.response);

    // {
    //   "user": {
    //     "user_id": "USR-2026-0001",
    //     "username": "jiano",
    //     "first_name": "Jiano",
    //     "middle_name": "Freo",
    //     "last_name": "Magtangob",
    //     "suffix": null,
    //     "sex": "Male",
    //     "email": "jiano@example.com",
    //     "contact_number": "09123456789",
    //     "emergency_contact_name": "Juan Magtangob",
    //     "emergency_contact": "09987654321",
    //     "address": "Manila, Philippines",
    //     "birthdate": "2002-05-15",
    //     "role": "Administrator",
    //     "department": "IT",
    //     "employment_status": "Full-time",
    //     "date_hired": "2026-08-21",
    //     "shift_start": "08:00:00",
    //     "shift_end": "17:00:00",
    //     "profile_photo": null
    //   },
    //   "message": "User created successfully!"
    // }
  } catch (error) {
    console.error("ADD USER ERROR:", error);

    return res.status(500).json({
      message: "Error while creating new user",
    } as addUser.error);
  }
}

// =========================
// ADD SERVICE
// =========================
export async function addService(
  req: Request<
    {},
    addService.response | addService.error,
    addService.body
  >,
  res: Response<addService.response | addService.error>,
) {
  // POST /api/admin/services
  try {
    const { service_name, price, service_type, service_category, room } =
      req.body;

    if (
      !service_name ||
      price === undefined ||
      price === null ||
      !service_type ||
      !service_category ||
      !room
    ) {
      return res.status(400).json({
        message: "All fields are required",
      } as addService.error);
    }

    if (isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({
        message: "Price must be a valid non-negative number",
      } as addService.error);
    }

    const existingService = await sql`
      SELECT service_id
      FROM services
      WHERE service_name = ${service_name}
    `;

    if (existingService.length > 0) {
      return res.status(409).json({
        message: "Service already exists",
      } as addService.error);
    }

    const serviceId = await generateServiceId();

    const newService = await sql`
      INSERT INTO services (
        service_id,
        service_type,
        service_name,
        service_category,
        price,
        room
      )
      VALUES (
        ${serviceId},
        ${service_type},
        ${service_name},
        ${service_category},
        ${Number(price)},
        ${room}
      )
      RETURNING *
    `;

    return res.status(201).json({
      message: "Service added successfully!",
      service: newService[0],
    } as addService.response);
  } catch (error) {
    console.error("ADD SERVICE ERROR:", error);

    return res.status(500).json({
      error: "error on service controller",
    } as addService.error);
  }
}

//----------------------------------------------------------------------------------------------------------------//

// =========================
// ADD ACTIVITY
// =========================
export async function addActivity(
  req: Request<
    {},
    addActivity.response | addActivity.error,
    addActivity.body
  >,
  res: Response<addActivity.response | addActivity.error>,
) {
  // POST /api/admin/activities
  try {
    const user_id = req.user.user_id;
    const { service_name, details } = req.body;

    const [service] = await sql`
      SELECT service_name
      FROM services
      WHERE service_name = ${service_name}
    `;

    if (!service) {
      return res.status(404).json({
        error: "There is no service with that name in our database",
      } as addActivity.error);
    }

    const activityId = await generateActivityId();

    const [activity] = await sql`
      INSERT INTO system_activity (
        activity_id,
        user_id,
        service_name,
        details
      )
      VALUES (
        ${activityId},
        ${user_id},
        ${service_name},
        ${JSON.stringify(details)}::jsonb
      )
      RETURNING *
    `;

    return res.status(201).json({
      user: activity,
      message: "Activity added successfully!",
    } as addActivity.response);
  } catch (error) {
    console.error("ADD ACTIVITY ERROR:", error);

    return res.status(500).json({
      error: "error on adding activity controller",
    } as addActivity.error);
  }
}

// =========================
// ADD ACTION
// =========================
export async function addAction(
  req: Request<
    {},
    addAction.response | addAction.error,
    addAction.body
  >,
  res: Response<addAction.response | addAction.error>,
) {
  try {
    const { action_name, action_description, module, is_sensitive } =
      req.body;

    if (!action_name || !module) {
      return res.status(400).json({
        message: "Please fill out required fields.",
      } as addAction.error);
    }

    const [newAction] = await sql`
      INSERT INTO actions (
        action_name,
        action_description,
        module,
        is_sensitive
      )
      VALUES (
        ${action_name},
        ${action_description ?? null},
        ${module},
        ${is_sensitive ?? true}
      )
      RETURNING *
    `;

    return res.status(201).json({
      message: "Action successfully added.",
      newAction: [newAction],
    } as addAction.response);
  } catch (error) {
    console.error("ADD ACTION ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    } as addAction.error);
  }
}

// =========================
// ADD FORM TEMPLATES
// =========================
export async function addFormTemplates(
  req: Request<
    {},
    addFormTemplates.response | addFormTemplates.error,
    addFormTemplates.body
  >,
  res: Response<addFormTemplates.response | addFormTemplates.error>,
) {
  const {
    form_name,
    form_description,
    status,
    service_id,
    created_by,
    form_components,
  } = req.body;

  if (
    !form_name ||
    !service_id ||
    !created_by ||
    !Array.isArray(form_components) ||
    form_components.length === 0
  ) {
    return res.status(400).json({
      message: "Required fields missing.",
    } as addFormTemplates.error);
  }

  try {
    const [checkExisting] = await sql`
      SELECT form_id
      FROM form_templates
      WHERE service_id = ${service_id}
        AND status = 'Published'
    `;

    if (status === "Published" && checkExisting) {
      return res.status(400).json({
        message: "An active form template already exist for the service.",
      } as addFormTemplates.error);
    }

    // NOTE: For Neon HTTP queries, separate BEGIN/COMMIT calls may not share
    // the same connection. Use a transaction-capable client for atomic writes.
    const form_id = `F-${Date.now()}`;

    const [formCreated] = await sql`
      INSERT INTO form_templates (
        form_id,
        form_name,
        form_description,
        service_id,
        status,
        created_by
      )
      VALUES (
        ${form_id},
        ${form_name},
        ${form_description ?? null},
        ${service_id},
        ${status ?? "Published"},
        ${created_by}
      )
      RETURNING *
    `;

    const componentsCreated: addFormTemplates.component[] = [];

    for (let index = 0; index < form_components.length; index++) {
      const component = form_components[index];
      const form_component_id = `FC-${form_id}-${index}`;

      const [createdComponent] = await sql`
        INSERT INTO form_components (
          form_component_id,
          form_id,
          type_id,
          label,
          field_key,
          display_order,
          settings,
          validation
        )
        VALUES (
          ${form_component_id},
          ${form_id},
          ${component.type_id},
          ${component.label},
          ${component.field_key},
          ${component.display_order},
          ${JSON.stringify(component.settings ?? null)}::jsonb,
          ${JSON.stringify(component.validation ?? null)}::jsonb
        )
        RETURNING *
      `;

      componentsCreated.push(createdComponent as addFormTemplates.component);
    }

    return res.status(201).json({
      message: "Form successfully created",
      formCreated,
      componentsCreated,
    } as addFormTemplates.response);
  } catch (error) {
    console.error("ADD FORM TEMPLATES ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    } as addFormTemplates.error);
  }
}

import { sql } from "../../config/db.js";
import cloudinary from "../../config/cloudinary.js";
import bcrypt from "bcryptjs";
import { NextFunction, Request, Response } from "express";
import {
  generateUserId,
  generateServiceId,
  generateActivityId,
} from "../../utils/generateId.js";

///// the tokenantion on ad user is just for testing purposes,
/// it will be removed later on. optional lang kasi no need tokens right after sign up, its usually on login========
export async function addUser(req: Request, res: Response) {
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
      });
    }

    // =========================
    // CHECK EXISTING USER
    // =========================
    const existingUser = await sql`
      SELECT *
      FROM users
      WHERE username = ${username}
         OR email = ${email}
         OR contact_number = ${contact_number}
    `;

    if (existingUser.length > 0) {
      return res.status(409).json({
        message: "Username, email, or contact number already exists",
      });
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
    const { password_hash, ...safeUser } = signUpResult[0]; // it just removed the password hash from the response, so that it won't be sent to the client. This is a security measure to protect sensitive information.

    // =========================
    // RESPONSE
    // =========================
    return res.status(201).json({
      user: safeUser,
      message: "User created successfully!",
    });
    // {
    //   "user": {
    //     "user_id": 123,
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
    //     "role": "admin",
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
    });
  }
}

export async function addService(req: Request, res: Response) {
  // post /api/admin/services
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
      return res.status(400).json({ message: "All fields are required" });
    } else if (isNaN(price)) {
      return res.status(400).json({ message: "Price must be a number" });
    }

    const existingService = await sql`
        SELECT * FROM services
        WHERE service_name = ${service_name}
    `;
    if (existingService.length > 0) {
      return res.status(200).json({ message: "Service already exists" });
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
        ${price}, 
        ${room}
      )
      RETURNING *;
    `;
    res
      .status(201)
      .json({ message: "Service added successfully!", service: newService[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "error on service controller" });
  }
}

export async function addActivity(req: Request, res: Response) {
  // post /api/admin/activities
  try {
    const user_id = req.user.user_id;
    const { activity_id, service_name, details } = req.body;
    const serviceName = await sql`
    SELECT service_name
    FROM services
    WHERE service_name = ${service_name}
    `;
    if (!serviceName) {
      res.json({ message: "there is no service on that on our database" });
    }
    const activityId = await generateActivityId();
    const response = await sql`
      INSERT INTO system_activity (activity_id, user_id, service_name, details)
      values (${activityId}, ${user_id}, ${service_name}, ${details})
    `;
    res.status(201).json({ user: response[0], message: "Sign up successful!" });
  } catch (error) {
    res.status(500).json({ error: "error on adding activity controller" });
  }
}

export async function addAction(req: Request, res: Response) {
  try {
    const { action_name, action_description, module, is_sensitive } = req.body;

    if (!action_name || !module) {
      return res.status(400).json({
        message: "Please fill out required fields.",
      });
    }

    const newAction = await sql`
      INSERT INTO actions(
        action_name,
        action_description,
        module,
        is_sensitive
      )
      VALUES(
        ${action_name},
        ${action_description ?? null},
        ${module},
        ${is_sensitive ?? true}
      )
      RETURNING *;
    `;

    res.status(201).json({
      message: "Action successfully added.",
      newAction,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

export async function addFormTemplates(req: Request, res: Response) {
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
    });
  }

  try {
    const [checkExisting] = await sql`
    SELECT form_id FROM form_templates
    WHERE service_id = ${service_id}
    AND status = 'Published'
    `;

    if (checkExisting) {
      return res.status(400).json({
        message: "An active form template already exist for the service.",
      });
    }

    await sql.query("BEGIN");
    const form_id = `F-${Date.now()}`;
    const [formCreated] = await sql`
      INSERT INTO form_templates (form_id, form_name, form_description, service_id, status, created_by)
      VALUES (${form_id}, ${form_name}, ${form_description}, ${service_id}, ${status}, ${created_by})
      RETURNING *
    `;

    const componentsCreated = [];
    for (let index = 0; index < form_components.length; index++) {
      const c = form_components[index];
      const form_component_id = `FC-${form_id}-${index}`;

      const [component] = await sql`
          INSERT INTO form_components
            (form_component_id, form_id, type_id, label, field_key, display_order, settings, validation)
          VALUES
            (${form_component_id}, ${form_id}, ${c.type_id}, ${c.label}, ${c.field_key}, ${c.display_order}, ${c.settings}, ${c.validation})
          RETURNING *
        `;
      componentsCreated.push(component);
    }

    await sql.query("COMMIT");
    res.status(201).json({
      message: "Form successfully created",
      formCreated,
      componentsCreated,
    });
  } catch (error) {
    console.error(error);
    await sql.query("ROLLBACK");
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

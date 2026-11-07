import { sql } from "../../config/db.js";
import cloudinary from "../../config/cloudinary.js";
import bcrypt from "bcryptjs";
import { registerFormComponentTypes } from "../../utils/formComponentTypes.js";
import type { Request, Response } from "express";
import { logActivity } from "../../utils/activityLogger.js";
import type {
  updateUser,
  updateUserStatus,
  updateFormTemplate,
  updateService,
} from "./dto/update.dto.js";

// =========================
// UPDATE USER
// =========================
export async function updateUser(
  req: Request,
  res: Response<updateUser.response | updateUser.error>,
) {
  // PATCH /api/admin/users/:user_id
  try {
    const { user_id } = req.params;

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
    } = req.body as updateUser.body;

    // =========================
    // PASSWORD
    // =========================
    let hashedPassword: string | null = null;

    if (typeof password === "string" && password.trim()) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // =========================
    // PROFILE PHOTO
    // =========================
    let profilePhoto: string | null = null;

    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "techcare/user_photos",
      });

      profilePhoto = uploadResult.secure_url;
    }

    // =========================
    // UPDATE USER
    // =========================
    const updatedUser = await sql`
      UPDATE users
      SET
        username = COALESCE(${username ?? null}, username),
        password_hash = COALESCE(${hashedPassword}, password_hash),
        first_name = COALESCE(${first_name ?? null}, first_name),
        middle_name = CASE
          WHEN ${middle_name === undefined} THEN middle_name
          ELSE ${middle_name ?? null}
        END,
        last_name = COALESCE(${last_name ?? null}, last_name),
        suffix = CASE
          WHEN ${suffix === undefined} THEN suffix
          ELSE ${suffix ?? null}
        END,
        sex = COALESCE(${sex ?? null}, sex),
        email = COALESCE(${email ?? null}, email),
        contact_number = COALESCE(${contact_number ?? null}, contact_number),
        emergency_contact_name = CASE
          WHEN ${emergency_contact_name === undefined} THEN emergency_contact_name
          ELSE ${emergency_contact_name ?? null}
        END,
        emergency_contact = CASE
          WHEN ${emergency_contact === undefined} THEN emergency_contact
          ELSE ${emergency_contact ?? null}
        END,
        address = COALESCE(${address ?? null}, address),
        birthdate = COALESCE(${birthdate ?? null}, birthdate),
        role = COALESCE(${role ?? null}, role),
        department = CASE
          WHEN ${department === undefined} THEN department
          ELSE ${department ?? null}
        END,
        employment_status = CASE
          WHEN ${employment_status === undefined} THEN employment_status
          ELSE ${employment_status ?? null}
        END,
        date_hired = COALESCE(${date_hired ?? null}, date_hired),
        shift_start = COALESCE(${shift_start ?? null}, shift_start),
        shift_end = COALESCE(${shift_end ?? null}, shift_end),
        profile_photo = COALESCE(${profilePhoto}, profile_photo),
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${user_id}
      RETURNING *;
    `;

    // =========================
    // USER NOT FOUND
    // =========================
    if (updatedUser.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // =========================
    // REMOVE SENSITIVE DATA
    // =========================
    const { password_hash, ...safeUser } = updatedUser[0];

    // =========================
    // RESPONSE
    // =========================
    return res.status(200).json({
      message: "User updated successfully!",
      user: safeUser,
    } as updateUser.response);
  } catch (error) {
    console.error("UPDATE USER ERROR:", error);

    return res.status(500).json({
      message: "Failed to update user",
    });
  }
}

// =========================
// UPDATE USER STATUS
// =========================
export async function updateUserStatus(
  req: Request,
  res: Response<updateUserStatus.response | updateUserStatus.error>,
) {
  try {
    const { user_id } = req.params;
    const { account_status } = req.body as updateUserStatus.body;
    if (typeof user_id !== "string" || !user_id) {
      return res.status(400).json({
        message: "User ID is required.",
      } as updateUserStatus.error);
    }
    if (account_status === undefined) {
      return res.status(400).json({
        message: "Account status is required.",
      } as updateUserStatus.error);
    }

    if (typeof account_status !== "boolean") {
      return res.status(400).json({
        message: "Account status must be a boolean.",
      } as updateUserStatus.error);
    }

    if (user_id === req.user.user_id) {
      await logActivity({
        userId: req.user.user_id,
        actionName: "user.deactivate",
        status: "blocked",
        targetType: "user",
        targetId: user_id as string,
        metadata: { reason: "self-deactivation attempt" },
      });

      return res.status(400).json({
        message: `You can't ${account_status ? "activate" : "deactivate"} your own account.`,
      } as updateUserStatus.error);
    }

    const updatedAccountStatus = await sql`
      UPDATE users
      SET
        account_status = ${account_status},
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${user_id}
      RETURNING
        user_id,
        first_name,
        last_name,
        middle_name,
        role,
        account_status;
    `;

    if (updatedAccountStatus.length === 0) {
      return res.status(404).json({
        message: "User not found.",
      } as updateUserStatus.error);
    }

    await logActivity({
      userId: req.user.user_id,
      actionName: account_status ? "user.activate" : "user.deactivate",
      status: "success",
      targetType: "user",
      targetId: user_id,
      metadata: {
        newStatus: account_status ? "activated" : "deactivated",
      },
    });

    return res.status(200).json({
      message: `User successfully ${account_status ? "activated" : "deactivated"}.`,
      updatedAccountStatus,
    } as updateUserStatus.response);
  } catch (error) {
    console.error("UPDATE USER STATUS ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error.",
    } as updateUserStatus.error);
  }
}

// =========================
// UPDATE FORM TEMPLATE
// =========================

export async function updateFormTemplate(
  req: Request,
  res: Response<updateFormTemplate.response | updateFormTemplate.error>,
) {
  const { form_id } = req.params;

  const { form_name, form_description, service_id, status, form_components } =
    req.body as updateFormTemplate.body;

  if (!form_id) {
    return res.status(400).json({
      message: "form_id is required.",
    } as updateFormTemplate.error);
  }

  if (
    !form_name?.trim() ||
    !Array.isArray(form_components) ||
    form_components.length === 0
  ) {
    return res.status(400).json({
      message: "Required fields missing.",
    } as updateFormTemplate.error);
  }

  try {
    const [checkExisting] = await sql`
      SELECT *
      FROM form_templates
      WHERE form_id = ${form_id}
    `;

    if (!checkExisting) {
      return res.status(404).json({
        message: "Form template not found.",
      } as updateFormTemplate.error);
    }

    const serviceId = service_id ?? checkExisting.service_id;
    const updatedStatus = status ?? checkExisting.status;

    if (updatedStatus === "Published") {
      const [published] = await sql`
        SELECT form_id
        FROM form_templates
        WHERE service_id = ${serviceId}
          AND status = 'Published'
          AND form_id <> ${form_id}
      `;

      if (published) {
        return res.status(400).json({
          message: "An active form template already exists for this service.",
        } as updateFormTemplate.error);
      }
    }

    const results = await sql.transaction([
      registerFormComponentTypes(),

      sql`
        UPDATE form_templates
        SET
          form_name = ${form_name},
          form_description = ${form_description ?? null},
          service_id = ${serviceId},
          status = ${updatedStatus},
          version = version + 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE form_id = ${form_id}
        RETURNING *
      `,

      sql`
        DELETE FROM form_components
        WHERE form_id = ${form_id}
      `,

      ...form_components.map((component, index) => {
        const form_component_id = `FC-${form_id}-${index}`;

        return sql`
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
      }),
    ]);

    const [formUpdated] = results[1];
    const componentsUpdated = results.slice(3).flat();

    return res.status(200).json({
      message: "Form template updated successfully",
      formUpdated: formUpdated as updateFormTemplate.template,
      componentsUpdated: componentsUpdated as updateFormTemplate.component[],
    } as updateFormTemplate.response);
  } catch (error) {
    console.error("UPDATE FORM TEMPLATE ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    } as updateFormTemplate.error);
  }
}

export async function updateService(
  req: Request,
  res: Response<updateService.response | updateService.error>,
) {
  try {
    const { service_id } = req.params as { service_id: string };
    const {
      service_name,
      service_category,
      service_type,
      room,
      price,
      active,
    } = req.body;

    if (isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({
        message: "Price must be a valid non-negative number",
      } as updateService.error);
    }

    if (service_id.startsWith("P-")) {
      if (!service_name) {
        return res.status(400).json({
          message: "Package name is required",
        } as updateService.error);
      }

      const duplicatePackage = await sql`
        SELECT package_id
        FROM packages
        WHERE package_name = ${service_name} AND package_id <> ${service_id}
      `;

      if (duplicatePackage.length > 0) {
        return res.status(409).json({
          message: "Package name already exists",
        } as updateService.error);
      }

      const updatedPackage = await sql`
        UPDATE packages
        SET package_name = ${service_name},
            package_price = ${Number(price)},
            status = ${active === false ? "Inactive" : "Active"},
            updated_at = NOW()
        WHERE package_id = ${service_id}
        RETURNING *
      `;

      if (updatedPackage.length === 0) {
        return res.status(404).json({
          message: "Package not found",
        } as updateService.error);
      }

      return res.status(200).json({
        message: "Package updated successfully!",
        service: updatedPackage[0],
      } as unknown as updateService.response);
    }

    if (!service_name || !service_category || !service_type || !room) {
      return res.status(400).json({
        message: "All fields are required",
      } as updateService.error);
    }

    const duplicate = await sql`
      SELECT service_id
      FROM services
      WHERE service_name = ${service_name} AND service_id <> ${service_id}
    `;

    if (duplicate.length > 0) {
      return res.status(409).json({
        message: "Service name already exists",
      } as updateService.error);
    }

    const updated = await sql`
      UPDATE services
      SET service_name = ${service_name},
          service_category = ${service_category},
          service_type = ${service_type},
          room = ${room},
          price = ${Number(price)},
          active = ${active === true},
          updated_at = NOW()
      WHERE service_id = ${service_id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return res.status(404).json({
        message: "Service not found",
      } as updateService.error);
    }

    return res.status(200).json({
      message: "Service updated successfully!",
      service: updated[0],
    } as updateService.response);
  } catch (error) {
    console.error("UPDATE SERVICE ERROR:", error);
    return res.status(500).json({
      message: "error on service controller",
    } as updateService.error);
  }
}

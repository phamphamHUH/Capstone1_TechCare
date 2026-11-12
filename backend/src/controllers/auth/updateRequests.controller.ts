
import type { Request, Response } from "express";
import { sql } from "../../config/db.js";
import fs from "fs/promises";
import cloudinary from "../../config/cloudinary.js";
import type { AccountRef } from "../../middlewares/account.middleware.js";
import type { logout, updateMyAccount } from "./dto/update.dto.js";

export async function logout(
  req: Request,
  res: Response<logout.response | logout.error>,
) {
  try {
    const { user_id }  = req.user;

    // =========================
    // REQUIRED CREDENTIALS
    // =========================
    if (!user_id) {
      return res.status(400).json({
        message: "User ID is required",
      } as logout.error);
    }

    await sql`
      UPDATE users
      SET active = FALSE
      WHERE user_id = ${user_id}
    `;

    return res.status(200).json({
      message: "Logout successful",
    } as logout.response);
  } catch (error) {
    console.error("Error logging out:", error);

    return res.status(500).json({
      message: "Internal server error",
    } as logout.error);
  }
}

const THEMES = ["light", "dark", "system"] as const;

// =========================
// UPDATE MY ACCOUNT
// =========================
// PATCH /api/auth/me (multipart) — the signed-in account changes its own
// profile photo ("image" file) and/or UI theme. Nothing else is editable here.
export async function updateMyAccount(
  req: Request,
  res: Response<updateMyAccount.response | updateMyAccount.error>,
) {
  const account = res.locals.account as AccountRef;
  try {
    const { theme } = (req.body ?? {}) as updateMyAccount.body;

    if (theme !== undefined && !THEMES.includes(theme)) {
      return res
        .status(400)
        .json({ message: "Theme must be light, dark or system." });
    }
    if (theme === undefined && !req.file) {
      return res.status(400).json({ message: "Nothing to update." });
    }

    let photo: string | null = null;
    if (req.file) {
      const upload = await cloudinary.uploader.upload(req.file.path, {
        folder:
          account.type === "patient"
            ? "techcare/patient_photos"
            : "techcare/user_photos",
      });
      photo = upload.secure_url;
    }

    // Patients keep their photo in image_url (set by the front desk);
    // staff use profile_photo (set by the admin).
    const [row] =
      account.type === "patient"
        ? await sql`
            UPDATE patients
            SET image_url = COALESCE(${photo}, image_url),
                theme = COALESCE(${theme ?? null}, theme),
                updated_at = CURRENT_TIMESTAMP
            WHERE patient_id = ${account.id}
            RETURNING *
          `
        : await sql`
            UPDATE users
            SET profile_photo = COALESCE(${photo}, profile_photo),
                theme = COALESCE(${theme ?? null}, theme),
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ${account.id}
            RETURNING *
          `;

    if (!row) return res.status(404).json({ message: "Account not found." });

    const { password_hash, password_token_hash, password_token_expires_at, ...user } =
      row;

    return res.status(200).json({
      message: "Account updated.",
      user,
    } as updateMyAccount.response);
  } catch (error) {
    console.error("Error updating account:", error);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    // multer wrote the upload to a temp file; it's on Cloudinary now.
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
  }
}

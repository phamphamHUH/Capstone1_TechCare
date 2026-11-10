import type { Request, Response } from "express";
import { sql } from "../../config/db.js";
import { recipientOf } from "../../services/notification-sse/index.js";
import type { getNotifications, markNotificationsRead } from "./dto/notifications.dto.js";

// The same handlers serve both routers:
//   /api/notifications          (doctor, laboratory staff; authMiddleware)
//   /api/patient/notifications  (patient; patientMiddleware)
// Everyone only ever sees and changes their own rows.
const FORBIDDEN = "Notifications are for doctors, laboratory staff and patients.";

// =========================
// LIST MY NOTIFICATIONS
// =========================
// GET .../notifications  -> newest first (at most 10 are ever kept)
export async function getNotifications(
  req: Request,
  res: Response<getNotifications.response | getNotifications.error>,
) {
  const me = recipientOf(req, res);
  if (!me) return res.status(403).json({ message: FORBIDDEN });

  try {
    const notifications = await sql`
      SELECT id, type, title, message, is_read, created_at
      FROM notifications
      WHERE recipient_type = ${me.type} AND recipient_id = ${me.id}
      ORDER BY created_at DESC, id DESC
    `;

    return res.status(200).json({
      notifications: notifications as getNotifications.response["notifications"],
      unread_count: notifications.filter((n) => !n.is_read).length,
    });
  } catch (error) {
    console.error("GET NOTIFICATIONS ERROR:", error);
    return res.status(500).json({ message: "Couldn't load notifications." });
  }
}

// =========================
// MARK ONE AS READ
// =========================
// PATCH .../notifications/:id/read
export async function markNotificationRead(
  req: Request,
  res: Response<markNotificationsRead.response | markNotificationsRead.error>,
) {
  const me = recipientOf(req, res);
  if (!me) return res.status(403).json({ message: FORBIDDEN });

  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid notification id." });

  try {
    await sql`
      UPDATE notifications SET is_read = TRUE
      WHERE id = ${id} AND recipient_type = ${me.type} AND recipient_id = ${me.id}
    `;
    return res.status(200).json({ message: "Marked as read." });
  } catch (error) {
    console.error("MARK NOTIFICATION READ ERROR:", error);
    return res.status(500).json({ message: "Couldn't update the notification." });
  }
}

// =========================
// MARK ALL AS READ
// =========================
// PATCH .../notifications/read-all
export async function markAllNotificationsRead(
  req: Request,
  res: Response<markNotificationsRead.response | markNotificationsRead.error>,
) {
  const me = recipientOf(req, res);
  if (!me) return res.status(403).json({ message: FORBIDDEN });

  try {
    await sql`
      UPDATE notifications SET is_read = TRUE
      WHERE recipient_type = ${me.type} AND recipient_id = ${me.id} AND is_read = FALSE
    `;
    return res.status(200).json({ message: "All marked as read." });
  } catch (error) {
    console.error("MARK ALL NOTIFICATIONS READ ERROR:", error);
    return res.status(500).json({ message: "Couldn't update notifications." });
  }
}

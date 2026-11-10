import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notifications/notifications.controller.js";
import { streamNotifications } from "../services/notification-sse/index.js";

// Doctors and laboratory staff (the handlers refuse other roles).
// Patients use the same handlers under /api/patient/notifications.
const router = Router();

router.use(authMiddleware);

router.get("/", getNotifications);
router.get("/stream", streamNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);

export default router;

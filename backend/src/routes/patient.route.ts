import { Router } from "express";
import patientMiddleware from "../middlewares/patient.middleware.js";
import {
  getPortalHistory,
  getPortalRecord,
  getPortalQueues,
  getPortalPrescriptions,
  getPortalReleasedResult,
} from "../controllers/patient/portal.controller.js";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notifications/notifications.controller.js";
import { streamNotifications } from "../services/notification-sse/index.js";

const router = Router();

router.get("/laboratory-results/:result_id", patientMiddleware, getPortalReleasedResult);
router.get("/medical-history/:patient_id", patientMiddleware, getPortalHistory);
router.get("/medical-history/:record_type/:record_id", patientMiddleware, getPortalRecord);
router.get("/queues", patientMiddleware, getPortalQueues);
router.get("/prescriptions/:patient_id", patientMiddleware, getPortalPrescriptions);

router.get("/notifications", patientMiddleware, getNotifications);
router.get("/notifications/stream", patientMiddleware, streamNotifications);
router.patch("/notifications/read-all", patientMiddleware, markAllNotificationsRead);
router.patch("/notifications/:id/read", patientMiddleware, markNotificationRead);

export default router;
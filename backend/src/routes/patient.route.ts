import { Router } from "express";
import patientMiddleware from "../middlewares/patient.middleware.js";
import { getReleasedLaboratoryResults } from "../controllers/labstaff/getRequests.controller.js";
import {
  getMedicalHistoryFull,
  getCurrentPrescriptions,
} from "../controllers/patient/getRequest.controller.js";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notifications/notifications.controller.js";
import { streamNotifications } from "../services/notification-sse/index.js";
const router = Router();

router.get("/laboratory-results/:result_id", patientMiddleware, getReleasedLaboratoryResults);

router.get("/medical-history/:patient_id", getMedicalHistoryFull);
router.get("/prescriptions/:patient_id", getCurrentPrescriptions);

// Queue notifications (bell in the patient portal).
router.get("/notifications", patientMiddleware, getNotifications);
router.get("/notifications/stream", patientMiddleware, streamNotifications);
router.patch("/notifications/read-all", patientMiddleware, markAllNotificationsRead);
router.patch("/notifications/:id/read", patientMiddleware, markNotificationRead);

export default router;

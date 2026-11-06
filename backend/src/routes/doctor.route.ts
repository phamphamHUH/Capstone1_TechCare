import { Router } from "express";
import { ENV } from "../config/env.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import doctorMiddleware from "../middlewares/doctor.middleware.js";
import {
  skipConsultationQueueEntry,
  // acceptConsultationQueue,
  // cancelConsultationQueue,
} from "../controllers/doctor/updateRequests.controller.js";
import { getReleasedLaboratoryResults } from "../controllers/labstaff/getRequests.controller.js";
import {
  addLaboratoryRequest,
  addPrescriptions,
  addConsultationFindings,
} from "../controllers/doctor/postRequests.controller.js";
import {
  getConsultationQueueDetails,
  getConsultationQueues,
  getMedicalHistory,
  getMedicalHistoryDetails,
  getMedicalHistoryFull,
  getRoomSpecificServices,
  // getLaboratoryServices,
  // getConsultationPatient,
} from "../controllers/doctor/getRequests.controller.js";
const router = Router();

if (ENV.IS_PRODUCTION) {
  router.use(authMiddleware, doctorMiddleware);
  console.log("Doctor routes enabled");
}
// POST requests
router.post("/laboratory-requests", addLaboratoryRequest);
router.post("/consultations", addConsultationFindings);
router.post("/prescriptions/:consultation_record_id", addPrescriptions);
// GET requests
router.get("/laboratory-results/:result_id", getReleasedLaboratoryResults);
router.get("/services/:room", getRoomSpecificServices);
// router.get("/laboratory-services", getLaboratoryServices);
// router.get("/consultation-patients/:patient_id", getConsultationPatient);
router.get("/consultation-queues/room/:room", getConsultationQueues);
router.get(
  "/consultation-queues/:queue_id/details",
  getConsultationQueueDetails,
);
router.get("/medical-history/:patient_id", getMedicalHistory);
router.get(
  "/medical-history/:record_type/:record_id",
  getMedicalHistoryDetails,
);
router.get(
  "/medical-history/:record_type/:record_id/full",
  getMedicalHistoryFull,
);

// router.patch("/consultation-queues/:queue_id/accept", acceptConsultationQueue);
// router.patch("/consultation-queues/:queue_id/cancel", cancelConsultationQueue);
router.patch("/consultation-queues/:queue_id/skip", skipConsultationQueueEntry);
export default router;

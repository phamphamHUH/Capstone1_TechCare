import { Router } from "express";
import { ENV } from "../config/env.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import doctorMiddleware from "../middlewares/doctor.middleware.js";
import {
  skipConsultationQueueEntry,
  acceptConsultationQueue,
  cancelConsultationQueue,
  completeConsultationQueueEntry,
  addConsultationFindings,
} from "../controllers/doctor/updateRequests.controller.js";
import { getReleasedLaboratoryResults } from "../controllers/labstaff/getRequests.controller.js";
import {
  addLaboratoryRequest,
  addPrescription,
} from "../controllers/doctor/postRequests.controller.js";
import {
  getConsultationQueueDetails,
  getConsultationQueues,
  getMedicalHistory,
  getMedicalHistoryDetails,
  getMedicalHistoryFull,
  getPrescriptionPreviewDetails,
  getRoomSpecificServices,
  // getLaboratoryServices,
  // getConsultationPatient,
} from "../controllers/doctor/getRequests.controller.js";
import { getAllservices } from "../controllers/admin/getRequests.controller.js";
import {
  getIssuedMedicalDocuments,
  getMedicalDocumentTemplates,
  issueMedicalDocument,
  searchMedicalDocumentPatients,
} from "../controllers/doctor/medicalDocuments.controller.js";
const router = Router();

if (ENV.IS_PRODUCTION) {
  router.use(authMiddleware, doctorMiddleware);
  console.log("Doctor routes enabled");
}
// POST requests
router.post("/laboratory-requests", addLaboratoryRequest);
router.post("/prescriptions", addPrescription);
// GET requests
router.get(
  "/medical-document-templates",
  authMiddleware,
  doctorMiddleware,
  getMedicalDocumentTemplates,
);
// The signed-in doctor is printed as the attending physician, so these always
// require a doctor token (also outside production).
router.get(
  "/medical-document-patients",
  authMiddleware,
  doctorMiddleware,
  searchMedicalDocumentPatients,
);
router.get(
  "/medical-documents",
  authMiddleware,
  doctorMiddleware,
  getIssuedMedicalDocuments,
);
router.post(
  "/medical-documents",
  authMiddleware,
  doctorMiddleware,
  issueMedicalDocument,
);
router.get("/laboratory-results/:result_id", getReleasedLaboratoryResults);
router.get("/services/:room", getRoomSpecificServices);
router.get("/services", getAllservices);
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
router.get(
  "/prescriptions/preview/:consultation_record_id",
  getPrescriptionPreviewDetails,
);

router.patch("/consultation-queues/:queue_id/accept", acceptConsultationQueue);
router.patch(
  "/consultation-queues/:queue_id/complete",
  completeConsultationQueueEntry,
);
router.patch("/consultation-queues/:queue_id/cancel", cancelConsultationQueue);
router.patch("/consultation-queues/:queue_id/skip", skipConsultationQueueEntry);
router.patch(
  "/consultation-records/:consultation_record_id/findings",
  addConsultationFindings,
);

export default router;

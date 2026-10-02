import { Router } from "express";
import { ENV } from "../config/env.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import doctorMiddleware from "../middlewares/doctor.middleware.js";
import {
  addLaboratoryRequest,
  addPrescriptions,
} from "../controllers/doctor/postRequests.controller.js";
import {
  getMedicalHistory,
  getMedicalHistoryDetails,
  getMedicalHistoryFull,
} from "../controllers/doctor/getRequests.controller.js";
const router = Router();

if (ENV.IS_PRODUCTION) {
  router.use(authMiddleware, doctorMiddleware);
  console.log("Doctor routes enabled");
}
// POST requests
router.post("/laboratory-requests", addLaboratoryRequest);
router.post("/prescriptions/:consultation_record_id", addPrescriptions);
// GET requests
router.get("/medical-history/:patient_id", getMedicalHistory);
router.get(
  "/medical-history/:record_type/:record_id",
  getMedicalHistoryDetails,
);
router.get(
  "/medical-history/:record_type/:record_id/full",
  getMedicalHistoryFull,
);

export default router;

import { Router } from "express";
import patientMiddleware from "../middlewares/patient.middleware.js";
import { getReleasedLaboratoryResults } from "../controllers/labstaff/getRequests.controller.js";
import {
  getMedicalHistoryFull,
  getCurrentPrescriptions,
  getMyEmailStatus,
} from "../controllers/patient/getRequest.controller.js";
import { resendMyVerification } from "../controllers/patient/postRequest.controller.js";
const router = Router();

router.get("/laboratory-results/:result_id", patientMiddleware, getReleasedLaboratoryResults);

router.get("/medical-history/:patient_id", getMedicalHistoryFull);
router.get("/prescriptions/:patient_id", getCurrentPrescriptions);

// Email verification banner in the patient portal.
router.get("/email-status", patientMiddleware, getMyEmailStatus);
router.post("/verification-email", patientMiddleware, resendMyVerification);

export default router;

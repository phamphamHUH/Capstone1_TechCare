import { Router } from "express";
import patientMiddleware from "../middlewares/patient.middleware.js";
import { getReleasedLaboratoryResults } from "../controllers/labstaff/getRequests.controller.js";
import {
  getMedicalHistoryFull,
  getCurrentPrescriptions,
} from "../controllers/patient/getRequest.controller.js";
const router = Router();

router.get("/laboratory-results/:result_id", patientMiddleware, getReleasedLaboratoryResults);

router.get("/medical-history/:patient_id", getMedicalHistoryFull);
router.get("/prescriptions/:patient_id", getCurrentPrescriptions);


export default router;

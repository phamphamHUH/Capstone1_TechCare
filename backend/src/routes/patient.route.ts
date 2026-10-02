import { Router } from "express";
import {
  getMedicalHistoryFull,
  getCurrentPrescriptions,
} from "../controllers/patient/getRequest.controller.js";
const router = Router();

router.get("/medical-history/:patient_id", getMedicalHistoryFull);
router.get("/prescriptions/:patient_id", getCurrentPrescriptions);

export default router;

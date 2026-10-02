import { Router } from "express";
import {
  //getAllConsultations,
  getCurrentPrescriptions,
} from "../controllers/patient/getRequest.controller.js";
const router = Router();

//router.get("/consultations/:patient_id", getAllConsultations);
router.get("/prescriptions/:patient_id", getCurrentPrescriptions);

export default router;

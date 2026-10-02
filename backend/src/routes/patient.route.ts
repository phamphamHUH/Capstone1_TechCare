import { Router } from "express";
import { getCurrentPrescriptions } from "../controllers/patient/getRequest.controller.js";
const router = Router();

router.get("/prescriptions/:patient_id", getCurrentPrescriptions);

export default router;

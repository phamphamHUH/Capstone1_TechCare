import { Router } from "express";
import { getAllConsultations } from "../controllers/patient/getRequest.controller.js";
const router = Router();

router.get("/consultations/:patient_id", getAllConsultations);

export default router;

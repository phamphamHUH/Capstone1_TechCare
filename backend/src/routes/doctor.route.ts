import { Router } from "express";
import { ENV } from "../config/env.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import doctorMiddleware from "../middlewares/doctor.middleware.js";
import { addLaboratoryRequest } from "../controllers/doctor/postRequests.controller.js";
import {
  getMedicalHistory,
  getMedicalHistoryDetails,
} from "../controllers/doctor/getRequests.controller.js";
const router = Router();

if (ENV.IS_PRODUCTION) {
  router.use(authMiddleware, doctorMiddleware);
  console.log("Doctor routes enabled");
}
// POST requests
router.post("/laboratory-requests", addLaboratoryRequest);
// GET requests
router.get("/medical-history/:patient_id", getMedicalHistory);
router.get(
  "/medical-history/:record_type/:record_id",
  getMedicalHistoryDetails,
);

export default router;

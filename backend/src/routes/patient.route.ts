import { Router } from "express";
import patientMiddleware from "../middlewares/patient.middleware.js";
import { getMyEmailStatus } from "../controllers/patient/getRequest.controller.js";
import { resendMyVerification } from "../controllers/patient/postRequest.controller.js";
import {
  getPortalHistory,
  getPortalRecord,
  getPortalQueues,
  getPortalPrescriptions,
  getPortalReleasedResult,
} from "../controllers/patient/portal.controller.js";
const router = Router();

router.get(
  "/laboratory-results/:result_id",
  patientMiddleware,
  getPortalReleasedResult,
);

router.get("/medical-history/:patient_id", patientMiddleware, getPortalHistory);
router.get(
  "/medical-history/:record_type/:record_id",
  patientMiddleware,
  getPortalRecord,
);
router.get("/queues", patientMiddleware, getPortalQueues);
router.get(
  "/prescriptions/:patient_id",
  patientMiddleware,
  getPortalPrescriptions,
);

// Email verification banner in the patient portal.
router.get("/email-status", patientMiddleware, getMyEmailStatus);
router.post("/verification-email", patientMiddleware, resendMyVerification);

export default router;

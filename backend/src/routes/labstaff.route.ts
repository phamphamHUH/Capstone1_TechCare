import { Router } from "express";

import {
  getRoomSpecificServices,
  getLaboratoryQueueItems,
  getAnalysisReadyRequests,
  getAvailableFormTemplates,
  getLaboratoryQueues,
  getLaboratoryRequestDetails,
  getReleasedLaboratoryResults,
  getAnalysisItems,
  getSavedLaboratoryResults,
} from "../controllers/labstaff/getRequests.controller.js";

import {
  acceptQueueEntry,
  skipQueueEntry,
  cancelQueueEntry,
  completeQueueEntry,
  releaseLaboratoryResult,
  verifyLaboratoryResult,
  startLaboratoryAnalysis,
} from "../controllers/labstaff/updateRequest.controller.js";

import { saveLaboratoryResult } from "../controllers/labstaff/postRequests.controller.js";

import authMiddleware from "../middlewares/auth.middleware.js";
import labstaffMiddleware from "../middlewares/labstaff.middleware.js";
import { ENV } from "../config/env.js";

const router = Router();

if (ENV.IS_PRODUCTION) {
  router.use(authMiddleware, labstaffMiddleware);
  console.log("Lab Staff routes enabled");
}

// GET ROUTES
router.get("/laboratory-queues/room/:room", getLaboratoryQueues);
router.get("/services/:room", getRoomSpecificServices);
router.get("/laboratory-queues/:queue_id/items", getLaboratoryQueueItems);
router.get("/laboratory-queues/:queue_id/request", getLaboratoryRequestDetails);
router.get("/laboratory-requests/items/", getAnalysisReadyRequests);
router.get("/laboratory-results/form-templates/", getAvailableFormTemplates);
router.get("/laboratory-results/analysis-items", getAnalysisItems);
router.get("/laboratory-results/saved", getSavedLaboratoryResults);

// IMPORTANT: Fetches laboratory results only after they have been released.
router.get("/laboratory-results", getReleasedLaboratoryResults);

// POST ROUTES
router.post("/laboratory-results/:item_id", saveLaboratoryResult);

// PATCH ROUTES
router.patch("/laboratory-requests/analysis/start", startLaboratoryAnalysis);
// Queue mutations publish through the shared stream so the doctor, lab, and
// admin queue pages all refresh together.
router.patch("/laboratory-queues/:queue_id/accept", acceptQueueEntry); // status -> serving
router.patch("/laboratory-queues/:queue_id/skip", skipQueueEntry); // moved back in the queue
router.patch("/laboratory-queues/:queue_id/cancel", cancelQueueEntry); // status -> cancelled
router.patch("/laboratory-queues/:queue_id/complete", completeQueueEntry); // status -> completed
router.patch("/laboratory-results/:result_id/verify", verifyLaboratoryResult);
router.patch("/laboratory-results/:result_id/release", releaseLaboratoryResult);

export default router;

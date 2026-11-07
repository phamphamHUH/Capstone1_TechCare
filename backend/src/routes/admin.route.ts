import { Router } from "express";
import { ENV } from "../config/env.js";
import {
  getAllUsers,
  getAllservices,
  getMyActivities,
  getAllActivities,
  getAllFormTemplates,
  getFormTemplateById,
} from "../controllers/admin/getRequests.controller.js";
import {
  addUser,
  addService,
  addActivity,
  addAction,
  addFormTemplates,
  addPackages,
} from "../controllers/admin/postRequests.controller.js";
import {
  updateFormTemplate,
  updateUser,
  updateUserStatus,
} from "../controllers/admin/updateRequests.controller.js";
import { deleteTemplate } from "../controllers/admin/deleteRequest.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import adminMiddleware from "../middlewares/admin.middleware.js";
import { getAllQueueEntries } from "../controllers/fdstaff/getRequests.controller.js";
import {
  streamQueue,
  getQueueStreamStats,
} from "../services/queue-sse/index.js";

const router = Router();

if (ENV.IS_PRODUCTION) {
  router.use(authMiddleware, adminMiddleware);
  console.log("Admin routes enabled");
}

router.use(authMiddleware, adminMiddleware);

// SSE ROUTES (live Queue Monitor)
// IMPORTANT: this route does NOT trigger an update. It is where the Queue Monitor
// page CONNECTS and listens. The updates are triggered by the fdstaff and
// labstaff routes that change the queue (look for "SSE TRIGGER" in those files).
router.get("/queue/stream", streamQueue);
router.get("/queue/stream/stats", getQueueStreamStats); // how many screens are connected

// The Queue Monitor reloads the queue from this route every time SSE says
// "queue-changed". It reuses the same controller the front desk uses
// (getAllQueueEntries), because the fdstaff route is only allowed for the
// frontdesk-staff role, so an admin could not call it.
router.get("/queues", getAllQueueEntries);

router.get("/services", getAllservices);
router.get("/activity", getMyActivities);
router.get("/activities", getAllActivities);
router.get("/users", getAllUsers);
router.get("/form-templates", getAllFormTemplates);
router.get("/form-templates/:form_id", getFormTemplateById);

router.post("/add-user", upload.single("image"), addUser);
router.post("/services", addService);
router.post("/activities", addActivity);
router.post("/actions", addAction);
router.post("/form-templates", addFormTemplates);
router.post("/packages", addPackages);

router.put("/form-templates/:form_id", updateFormTemplate);

router.patch("/users/:user_id", upload.single("image"), updateUser);
router.patch("/users/status/:user_id", updateUserStatus);

router.delete("/form-templates/:form_id", deleteTemplate);
export default router;

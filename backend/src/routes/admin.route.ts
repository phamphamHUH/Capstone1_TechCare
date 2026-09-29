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
const router = Router();

// if (ENV.IS_PRODUCTION) {
//   router.use(authMiddleware, adminMiddleware);
//   console.log("Admin routes enabled");
// }

router.use(authMiddleware, adminMiddleware);

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

router.put("/form-templates/:form_id", updateFormTemplate);

router.patch("/users/:user_id", upload.single("image"), updateUser);
router.patch("/users/status/:user_id", updateUserStatus);

router.delete("/form-templates/:form_id", deleteTemplate);
export default router;

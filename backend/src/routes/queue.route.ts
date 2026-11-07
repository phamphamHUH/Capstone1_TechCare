import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { streamQueue } from "../services/queue-sse/index.js";

const router = Router();

router.get("/stream", authMiddleware, streamQueue);

export default router;

import { Router } from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import {
  getMessagesSSE,
  writeMessageSSE,
} from "../../controllers/test/sse_message/sseMessage.controller.js";
import {
  receiveQueueSSE,
  sendQueueSSE,
} from "../../controllers/test/sse_queue/sseQueue.controller.js";

const router = Router();

// Test-only SSE playground. Production queue pages use /api/queue/stream.
router.get("/message/message-receive", getMessagesSSE);
router.post("/message/message-send", writeMessageSSE);
router.get("/queue/message-receive", authMiddleware, receiveQueueSSE);
router.post("/queue/message-send", authMiddleware, sendQueueSSE);

export default router;

import { Router } from "express";
import { getMessagesSSE,  writeMessageSSE } from "../../controllers/test/sse_message/sseMessage.controller.js";
import { receiveQueueSSE, sendQueueSSE } from "../../controllers/test/sse_queue/sseQueue.controller.js";
const router = Router();

router.get("/message/message-receive", getMessagesSSE);
router.post("/message/message-send", writeMessageSSE);


router.get("/queue/message-receive", getMessagesSSE);
router.post("/queue/message-send", writeMessageSSE);

export default router;
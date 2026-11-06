import type { Request, Response } from "express";
import { getQueueMonitorEntries } from "../../utils/getQueueMonitorEntries.js";
import {
  addClient,
  removeClient,
  sendInitialData,
} from "./queueStream.hub.js";

// GET /api/queue/stream
// One authenticated stream is shared by the admin TV monitor, doctor
// consultation queue, and laboratory queue page.
export async function streamQueue(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  res.status(200).set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  req.socket.setTimeout(0);
  req.socket.setNoDelay(true);

  addClient(res, req.user);

  try {
    const queueEntries = await getQueueMonitorEntries();
    sendInitialData(res, queueEntries);
  } catch (error) {
    removeClient(res);
    console.error("Unable to send initial queue SSE data:", error);
    if (res.headersSent) {
      res.end();
    } else {
      res.status(500).json({ message: "Unable to open queue stream" });
    }
  }
}


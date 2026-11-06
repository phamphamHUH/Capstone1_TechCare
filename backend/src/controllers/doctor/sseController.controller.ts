import type { Request, Response } from "express";
import { addClient, removeClient, broadcast } from "./utils/sse.manager.js";

export function connectQueueStream(req: Request, res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // stop proxy buffering (Render/nginx)
  res.flushHeaders();

  addClient(res);
  res.write(": connected\n\n");

  const heartbeat = setInterval(() => {
    if (!res.writableEnded) res.write(": ping\n\n");
  }, 25_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    removeClient(res);
  });
}

export function publishQueueChange() {
  broadcast("queue-changed", { changedAt: new Date().toISOString() });
}
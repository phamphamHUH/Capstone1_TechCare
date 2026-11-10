import type { Request, Response } from "express";
import {
  addClient,
  removeClient,
  sendInitialData,
  type Recipient,
} from "./notificationStream.hub.js";

// Staff (doctor, laboratory staff) come through authMiddleware -> req.user.
// Patients come through patientMiddleware -> res.locals.patientId.
export function recipientOf(req: Request, res: Response): Recipient | null {
  if (typeof res.locals.patientId === "string") {
    return { type: "patient", id: res.locals.patientId };
  }

  const user = req.user as { user_id?: string; role?: string } | undefined;
  if (user?.user_id && (user.role === "doctor" || user.role === "laboratory-staff")) {
    return { type: "user", id: user.user_id };
  }

  return null;
}

// GET /api/notifications/stream          (doctor, laboratory staff)
// GET /api/patient/notifications/stream  (patient)
// One authenticated stream per bell. It only says "your notifications
// changed"; the bell reloads them from its REST endpoint.
export async function streamNotifications(req: Request, res: Response) {
  const recipient = recipientOf(req, res);
  if (!recipient) {
    return res.status(403).json({ message: "Notifications are for doctors, laboratory staff and patients." });
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

  addClient(res, recipient);

  try {
    sendInitialData(res, [{ connectedAt: new Date().toISOString() }]);
  } catch (error) {
    removeClient(res);
    console.error("Unable to send initial notification SSE data:", error);
    if (res.headersSent) {
      res.end();
    } else {
      res.status(500).json({ message: "Unable to open notification stream" });
    }
  }
}

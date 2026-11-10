import type { Request } from "express";
import { notifyPatient, notifyStaff, patientName } from "./notify.js";

// =========================
// QUEUE EVENTS
// =========================
// One function per queue event, so each controller needs one line.
// All of them never throw; call them after COMMIT with `void`.

type QueueKind = "consultation" | "laboratory";

const staffFor = (kind: QueueKind) => (kind === "consultation" ? "doctor" : "laboratory-staff");
const roomText = (room?: string | null) => (room ? ` (Room ${room})` : "");

// The logged-in staff member who caused the event (they aren't notified).
export function actorId(req: Request) {
  return (req.user as { user_id?: string } | undefined)?.user_id ?? null;
}

// PATIENT: added to a queue.
export async function notifyQueued(patientId: string, kind: QueueKind, queueNumber?: number | null) {
  await notifyPatient(patientId, {
    type: "queued",
    title: `You're in the ${kind} queue`,
    message: queueNumber ? `Your queue number is ${queueNumber}. Please wait to be called.` : "Please wait to be called.",
  });
}

// PATIENT: it's their turn.
export async function notifyCalled(patientId: string, kind: QueueKind, room?: string | null) {
  await notifyPatient(patientId, {
    type: "called",
    title: "It's your turn",
    message: `Please proceed to the ${kind === "consultation" ? "consultation" : "laboratory"} room${roomText(room)}.`,
  });
}

// PATIENT: skipped (moved back in the queue).
export async function notifySkipped(patientId: string, kind: QueueKind) {
  await notifyPatient(patientId, {
    type: "skipped",
    title: "You were skipped",
    message: `You missed your turn in the ${kind} queue, so you were moved back. Please stay nearby; you'll be called again.`,
  });
}

// PATIENT + STAFF: a queue entry was cancelled.
// The patient is told, and so are the doctors or lab staff of that queue
// (except whoever cancelled it).
export async function notifyCancelled(
  patientId: string,
  kind: QueueKind,
  actorUserId: string | null,
  reason?: string | null,
) {
  const name = await patientName(patientId);
  const label = kind === "consultation" ? "Consultation" : "Laboratory";

  await notifyPatient(patientId, {
    type: "cancellation",
    title: `Your ${kind} was cancelled`,
    message: reason ? `Reason: ${reason}` : "Please ask the front desk if you have questions.",
  });

  await notifyStaff(
    staffFor(kind),
    {
      type: "cancellation",
      title: `${label} cancelled: ${name}`,
      message: reason ? `Reason: ${reason}` : null,
    },
    actorUserId,
  );
}

// STAFF: a priority patient (senior, PWD, ...) joined their queue.
export async function notifyPriorityPatient(
  patientId: string,
  kind: QueueKind,
  actorUserId: string | null,
  room?: string | null,
) {
  const name = await patientName(patientId);
  await notifyStaff(
    staffFor(kind),
    {
      type: "priority-patient",
      title: `Priority patient: ${name}`,
      message: `${name} was added to the ${kind} queue as a priority patient${roomText(room)}.`,
    },
    actorUserId,
  );
}

import type { Response } from "express";

// Who a stream belongs to: a staff member (users.user_id) or a patient.
export type Recipient = { type: "user" | "patient"; id: string };

// One shared collection for every open notification bell
// (doctor, laboratory staff and patient screens).
const clients = new Map<Response, Recipient>();

const keyOf = (recipient: Recipient) => `${recipient.type}:${recipient.id}`;

function writeEvent(res: Response, event: string, data: unknown[]) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function addClient(res: Response, recipient: Recipient) {
  clients.set(res, recipient);

  res.on("close", () => {
    clients.delete(res);
  });
}

export function removeClient(res: Response) {
  clients.delete(res);
}

// Notification events are intentionally only a signal. The bell reloads its
// list from its REST endpoint after receiving this event.
// Only the screens of the given people get it.
export function sendData(recipients: Recipient[], data: unknown[]) {
  const targets = new Set(recipients.map(keyOf));

  for (const [client, recipient] of clients) {
    if (client.writableEnded || client.destroyed) {
      clients.delete(client);
      continue;
    }

    if (!targets.has(keyOf(recipient))) continue;

    try {
      writeEvent(client, "notifications-changed", data);
    } catch (error) {
      clients.delete(client);
      console.error("Unable to write notification SSE event:", error);
    }
  }
}

export function sendInitialData(res: Response, data: unknown[]) {
  writeEvent(res, "initial", data);
}

export function publishNotificationChange(recipients: Recipient[]) {
  sendData(recipients, [{ changedAt: new Date().toISOString() }]);
}

export function closeAllNotificationStreams() {
  for (const [client] of clients) {
    client.end();
  }
  clients.clear();
}

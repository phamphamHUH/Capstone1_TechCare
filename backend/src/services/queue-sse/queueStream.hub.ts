import type { Request, Response } from "express";

export type User = NonNullable<Request["user"]>;

// One shared collection for every authenticated queue screen.
const clients = new Map<Response, User>();

function writeEvent(res: Response, event: string, data: unknown[]) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function addClient(res: Response, user: User) {
  clients.set(res, user);

  res.on("close", () => {
    clients.delete(res);
  });
}

export function removeClient(res: Response) {
  clients.delete(res);
}

// Queue events are intentionally only a signal. Each page reloads its own
// queue from its existing REST endpoint after receiving this event.
export function sendData(data: unknown[]) {
  for (const [client] of clients) {
    if (client.writableEnded || client.destroyed) {
      clients.delete(client);
      continue;
    }

    try {
      writeEvent(client, "queue-changed", data);
    } catch (error) {
      clients.delete(client);
      console.error("Unable to write queue SSE event:", error);
    }
  }
}

export function sendInitialData(res: Response, data: unknown[]) {
  writeEvent(res, "initial", data);
}

export function publishQueueChange() {
  sendData([{ changedAt: new Date().toISOString() }]);
}

export function closeAllQueueStreams() {
  for (const [client] of clients) {
    client.end();
  }
  clients.clear();
}


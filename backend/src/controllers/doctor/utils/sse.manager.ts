import type { Response } from "express";

const clients = new Set<Response>();

export function addClient(res: Response) {
  clients.add(res);
}

export function removeClient(res: Response) {
  clients.delete(res);
}

export function broadcast(event: string, payload: unknown) {
  const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) {
    if (res.writableEnded || res.destroyed) {
      clients.delete(res);
      continue;
    }
    res.write(message);
  }
}

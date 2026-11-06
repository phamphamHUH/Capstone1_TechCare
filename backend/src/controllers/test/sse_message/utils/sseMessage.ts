import type { Response } from "express";

const clients = new Set<Response>();

export function addClient(res: Response) {
  clients.add(res);
  res.on("close", () => {
    clients.delete(res);
  });
}

export function sendSSE(data: unknown) {
  for (const client of clients) {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

const specifiedClients = new Map<string, Response>();

export function addSpecifiedClient(userId: string, res: Response) {
  specifiedClients.set(userId, res);
}

export function sendSSEToUser(userId: string, data: unknown) {
  const specifiedClient = specifiedClients.get(userId);

  if (specifiedClient) {
    specifiedClient.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

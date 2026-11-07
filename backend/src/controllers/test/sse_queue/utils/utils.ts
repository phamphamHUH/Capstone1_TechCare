import type { Response } from "express";

type User = {
  role: string;
};

const clients = new Map<Response, User>();

export function addClient(res: Response, user: User) {
  clients.set(res, user);
  res.on("close", () => {
    clients.delete(res);
  });
}

export function sendData(data: unknown[]) {
  for (const [client, user] of clients) {
    if (user.role === "admin") {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  }
}

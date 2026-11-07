import type { Request, Response } from "express";
import { sql } from "../../../config/db.js";
import { addClient, sendData } from "./utils/utils.js";

export async function receiveQueueSSE(req: Request, res: Response) {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    if (!req.user) {
      res.status(401).end();
      return;
    }

    addClient(res, req.user);
    const messages = await sql`
      SELECT * FROM sse_test
    `;

    res.write(`data: ${JSON.stringify(messages)}\n\n`);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Internal Server error" });
    } else {
      res.end();
    }
  }
}

export async function sendQueueSSE(req: Request, res: Response) {
  try {
    const { message } = req.body;
    const addedMessage = await sql`
      INSERT INTO sse_test (message)
      VALUES (${message})
      RETURNING *;
    `;
    sendData(addedMessage);
    res.status(200).json({ message: "Successfully added" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server error" });
  }
}

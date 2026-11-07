import type { Request, Response } from "express";
import { sql } from "../../../config/db.js";
import { addClient, sendSSE } from "./utils/sseMessage.js";

export async function getMessagesSSE(req: Request, res: Response) {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    addClient(res);
    const messages = await sql`
      SELECT * FROM sse_test
    `;

    res.write(`data: ${JSON.stringify({ messages })}\n\n`);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Internal Server error" });
    } else {
      res.end();
    }
  }
}

export async function writeMessageSSE(req: Request, res: Response) {
  try {
    const { message } = req.body;
    const [newMessage] = await sql`
      INSERT INTO sse_test (message)
      VALUES (${message})
      RETURNING *;
    `;

    sendSSE({ messages: [newMessage] });
    res.status(200).json({ message: "Successfully added" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server error" });
  }
}

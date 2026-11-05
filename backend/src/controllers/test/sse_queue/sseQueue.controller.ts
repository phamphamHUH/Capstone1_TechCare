import type { Request, Response } from "express";
import { addClient, sendData } from "./utils/utils.js";
import { sql } from "../../../config/db.js";
export async function receiveQueueSSE(req: Request, res: Response) {
  try {
    // Tell the browser that this response is an SSE stream,
    // not an ordinary JSON response.
    res.setHeader("Content-Type", "text/event-stream");

    // Tell caches not to store this response.
    // We want the client to receive live updates, not a cached response.
    res.setHeader("Cache-Control", "no-cache");

    // Ask the connection to remain open so we can send
    // multiple SSE events through the same HTTP connection.
    res.setHeader("Connection", "keep-alive");

    // Send the response headers immediately instead of waiting
    // for the first piece of data to be written.
    res.flushHeaders();
    addClient(res, req.user);
    const messages = await sql`
        SELECT * FROM sse_test
    `;

    res.write(`data: ${JSON.stringify(messages)}`);

    //example payload
    // data: [
    //   {
    //     id: 1,
    //     message: "Hello",
    //   },
    //   {
    //     id: 2,
    //     message: "Good morning",
    //   },
    //   {
    //     id: 3,
    //     message: "How are you?",
    //   },
    // ];
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      // If headers have not been sent, we can still send a normal
      res.status(500).json({
        message: "Internal Server error",
      });
    } else {
      // If the SSE response has already started,
      // close the connection instead of trying to send JSON
      // as if this were a normal response.
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
  } catch (error) {
    console.error(error);
    res.status(500).json({
      // Return an HTTP 500 error if the operation fails.
      message: "Internal Server error",
    });
  }
}

import type { Request, Response } from "express";
import { sql } from "../../../config/db.js";
import { addClient } from "./utils/sseMessage.js";
import { sendSSE } from "./utils/sseMessage.js";
export async function getMessagesSSE(req: Request, res: Response) {
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

    // Save this client's connection so writeMessageSSE()
    // can send new messages to this client later.
    addClient(res);

    // Query PostgreSQL to retrieve the messages already in the table.
    const messages = await sql`
            SELECT * FROM sse_test
        `;

    // Send the existing messages as the first SSE event.
    // JSON.stringify converts the object to text.
    // The browser receives this text in its onmessage handler.
    // The two newlines mark the end of this event.
    res.write(`data: ${JSON.stringify({ messages })}\n\n`);
  } catch (error) {
    // Print the actual error in the backend terminal for debugging.
    console.error(error);

    // If headers have not been sent, we can still send a normal
    // HTTP 500 error response.
    if (!res.headersSent) {
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

export async function writeMessageSSE(req: Request, res: Response) {
  try {
    // Extract the "message" property from the JSON request body.
    // For example, the frontend might send { "message": "Hello" }.
    const { message } = req.body;

    // Insert the message into PostgreSQL.
    // RETURNING * tells PostgreSQL to return the newly inserted row.
    const [newMessage] = await sql`
            INSERT INTO sse_test (message)
            VALUES (${message})
            RETURNING *;
        `;

    // Broadcast the newly inserted row to every connected SSE client.
    // sendSSE() loops through the clients Set and writes an SSE event
    // to each client's existing connection.
    sendSSE({ messages: [newMessage] });  //[newMessage] extracts the first row from the SQL result array.

    // Send an ordinary HTTP JSON response to the client that
    // submitted the POST request.
    // This confirms the insert succeeded; it is not the SSE broadcast.
    res.status(200).json({
      message: "Successfully added",
    });
  } catch (error) {
    // Log the error in the backend terminal.
    console.error(error);

    // Return an HTTP 500 error if the operation fails.
    res.status(500).json({
      message: "Internal Server error",
    });
  }
}

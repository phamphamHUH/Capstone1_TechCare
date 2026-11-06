Here are the main Express `res` (Response) methods and properties relevant to sending SSE payloads.

### 1. Methods that send data

| Method                               | Purpose                                                           |
| ------------------------------------ | ----------------------------------------------------------------- |
| `res.write(data)`                    | Sends data without closing the connection. Used for SSE payloads. |
| `res.end()`                          | Ends the response and closes the connection.                      |
| `res.json(data)`                     | Sends a JSON response and ends the response.                      |
| `res.send(data)`                     | Sends a response and ends it.                                     |
| `res.writeHead(statusCode, headers)` | Sets the status code and headers, then starts the response.       |
| `res.flushHeaders()`                 | Sends the headers immediately without waiting for the payload.    |

### 2. Methods for configuring the response

| Method                       | Purpose                           |
| ---------------------------- | --------------------------------- |
| `res.setHeader(name, value)` | Sets an HTTP response header.     |
| `res.getHeader(name)`        | Gets a response header value.     |
| `res.removeHeader(name)`     | Removes a response header.        |
| `res.status(code)`           | Sets the HTTP status code.        |
| `res.type(type)`             | Sets the response `Content-Type`. |

### 3. Properties for checking response state

| Property               | Purpose                                                     |
| ---------------------- | ----------------------------------------------------------- |
| `res.headersSent`      | Whether the response headers have been sent.                |
| `res.writable`         | Whether the underlying stream can still be written to.      |
| `res.writableEnded`    | Whether `res.end()` has been called.                        |
| `res.writableFinished` | Whether all data has been flushed to the underlying system. |
| `res.statusCode`       | The HTTP status code.                                       |
| `res.statusMessage`    | The HTTP status message.                                    |
| `res.locals`           | Object for storing request-specific response data.          |

### 4. Methods commonly used with SSE

| Method                       | Purpose                                      |
| ---------------------------- | -------------------------------------------- |
| `res.on("close", callback)`  | Detects when the response connection closes. |
| `res.on("error", callback)`  | Listens for response errors.                 |
| `res.on("finish", callback)` | Fires when the response has finished.        |
| `res.flushHeaders()`         | Sends SSE headers immediately.               |
| `res.write(data)`            | Sends each SSE event.                        |
| `res.end()`                  | Closes the SSE stream.                       |

For your SSE implementation, focus on these five:

```
res.setHeader("Content-Type", "text/event-stream");
res.flushHeaders();
res.write(`data: ${JSON.stringify(data)}\n\n`);
res.on("close", () => {});
res.end();
```

Note: `res` inherits several methods and properties from Node.js's `http.ServerResponse` and writable stream, so this isn't an exhaustive list of every inherited API.
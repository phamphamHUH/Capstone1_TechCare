---
name: techcare-sse
description: Implement Server-Sent Events (SSE) in full-stack TypeScript applications using Express, PostgreSQL, and React. Use when building real-time server-to-client updates, initial data snapshots, client registration, connection cleanup, role-based broadcasting, and frontend EventSource consumption.
---

# Express + React Server-Sent Events (SSE)

## Purpose

Implement straightforward, deployment-ready Server-Sent Events (SSE) for full-stack applications using:

- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL with Postgres.js (`sql` tagged templates)
- Frontend: React, TypeScript
- Authentication: JWT middleware
- Communication: HTTP Server-Sent Events

Follow an MVP-first approach. Prioritize working, maintainable SSE functionality without introducing unnecessary abstractions, event brokers, Redis, WebSockets, or complex synchronization systems.

---

## 1. Core Architecture

Use SSE when the server needs to push updates to connected clients.

The implementation has four main responsibilities:

1. Establish an SSE connection.
2. Register the connected client.
3. Send the initial database records.
4. Broadcast new records to eligible connected clients.

Use a centralized client collection to track open connections.

### Client collection

Use a `Map<Response, User>`.

```typescript
import type { Response } from "express";

const clients = new Map<Response, User>();
```

Each Map entry associates:

- Key: Express `Response` object representing an open SSE connection.
- Value: Authenticated user associated with that connection.

Example:

```typescript
Map(3) {
  [ServerResponse] => {
    user_id: "USR-001",
    username: "alice",
    role: "admin"
  },
  [ServerResponse] => {
    user_id: "USR-002",
    username: "bob",
    role: "doctor"
  },
  [ServerResponse] => {
    user_id: "USR-003",
    username: "charlie",
    role: "patient"
  }
}
```

One Map can contain multiple connected clients. Do not create an array of Maps.

---

## 2. User Type

Define the user type based on the actual database schema.

Example:

```typescript
type User = {
  id: number;
  user_id: string;
  username: string;
  password_hash: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  sex: string;
  email: string;
  contact_number: string;
  emergency_contact_name: string | null;
  emergency_contact: string | null;
  address: string;
  birthdate: string;
  role: string;
  department: string | null;
  employment_status: string | null;
  date_hired: string;
  shift_start: string;
  shift_end: string;
  last_login: Date | null;
  account_status: boolean;
  profile_photo: string | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
};
```

Adjust PostgreSQL date and timestamp types according to the actual driver configuration.

Use the authenticated user supplied by the existing authentication middleware. Do not decode JWT tokens again inside the SSE utility.

Never expose `password_hash` or other sensitive user information through SSE payloads.

---

## 3. Register Connected Clients

Create an `addClient()` function.

```typescript
export function addClient(res: Response, user: User) {
  clients.set(res, user);

  res.on("close", () => {
    clients.delete(res);
  });
}
```

### Registration rules

- Register each connection using `clients.set(res, user)`.
- Store the complete authenticated user object when needed for recipient filtering.
- Remove the connection when its response closes.
- Do not use `clients.push()` or `clients.add()`. The collection is a Map.
- Do not create separate registration logic for admins, doctors, and patients unless there is a specific requirement.

Every authenticated user uses the same registration function.

Controller usage:

```typescript
addClient(res, req.user);
```

---

## 4. Establish the SSE Connection

Create an SSE controller that establishes the connection and sends the initial database records.

```typescript
export async function streamSSE(req: Request, res: Response) {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    res.flushHeaders();

    addClient(res, req.user);

    const messages = await sql`
      SELECT * FROM sse_test
    `;

    res.write(`data: ${JSON.stringify(messages)}\n\n`);

  } catch (error) {
    console.error(error);

    if (!res.headersSent) {
      res.status(500).json({
        message: "Internal server error"
      });
    } else {
      res.end();
    }
  }
}
```

### Important details

- `Content-Type: text/event-stream` identifies the response as SSE.
- `Cache-Control: no-cache` prevents caching.
- `Connection: keep-alive` requests a persistent connection.
- `flushHeaders()` sends the headers immediately.
- `addClient()` registers the connection.
- `SELECT *` retrieves the initial records.
- `res.write()` sends the initial snapshot.

Always terminate an SSE event with `\n\n`.

### Initial payload

The initial query returns multiple database records.

Example actual SSE payload:

```text
data: [{"id":1,"message":"Hello"},{"id":2,"message":"Good morning"},{"id":3,"message":"How are you?"}]

```

The initial snapshot is sent directly through `res.write()` because it only belongs to the client establishing the connection.

---

## 5. Standardize Payloads Using Arrays

Use arrays for all SSE message payloads.

This is a preferred implementation convention because the frontend receives a predictable structure whether it receives one record or multiple records.

### Initial database snapshot

```typescript
const messages = await sql`
  SELECT * FROM sse_test
`;

res.write(`data: ${JSON.stringify(messages)}\n\n`);
```

### Newly inserted record

```typescript
const addedMessage = await sql`
  INSERT INTO sse_test (message)
  VALUES (${message})
  RETURNING *
`;

sendData(addedMessage);
```

Postgres.js returns query results as an array of rows.

Therefore:

- `SELECT *` returns an array containing all matching records.
- `INSERT ... RETURNING *` returns an array containing the inserted record.
- Do not destructure the result if you want to preserve the array structure.
- Do not wrap `addedMessage` in another array because it is already an array.

### Example initial payload

```text
data: [{"id":1,"message":"Hello"},{"id":2,"message":"Good morning"}]

```

### Example new-message payload

```text
data: [{"id":3,"message":"New message"}]

```

Both payloads have the same structure.

---

## 6. Centralized Broadcasting

Create one reusable `sendData()` function.

```typescript
export function sendData(data: any[]) {
  for (const [client, user] of clients) {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}
```

### Responsibilities

- Iterate through every registered client.
- Serialize the array using `JSON.stringify()`.
- Write the SSE event to each connected client.
- Use the same payload structure for initial and subsequent records.

### Role-based broadcasting

Filter recipients using the user object stored in the Map.

Example: admins only.

```typescript
export function sendData(data: any[]) {
  for (const [client, user] of clients) {
    if (user.role === "admin") {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  }
}
```

Example: doctors only.

```typescript
if (user.role === "doctor") {
  client.write(`data: ${JSON.stringify(data)}\n\n`);
}
```

Example: laboratory department.

```typescript
if (user.department === "Laboratory") {
  client.write(`data: ${JSON.stringify(data)}\n\n`);
}
```

### Important distinction

Registration and broadcasting are separate responsibilities.

Registration:

```typescript
addClient(res, req.user);
```

Broadcasting:

```typescript
if (user.role === "admin") {
  client.write(...);
}
```

Do not confuse `req.user` with the stored `user` inside `sendData()`.

- `req.user` identifies the user making the SSE connection.
- `user` inside the Map iteration identifies the recipient associated with each connection.

The role filter determines who receives the event, not who is allowed to connect.

Use authentication and authorization middleware separately when restricting access to the SSE endpoint.

---

## 7. Insert Data and Broadcast

The POST controller should insert the record first, then broadcast the returned database row.

```typescript
export async function addQueue(req: Request, res: Response) {
  try {
    const { message } = req.body;

    const addedMessage = await sql`
      INSERT INTO sse_test (message)
      VALUES (${message})
      RETURNING *
    `;

    sendData(addedMessage);

    res.status(201).json({
      message: "Message added successfully",
      data: addedMessage
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Internal server error"
    });
  }
}
```

### Expected flow

1. Client sends a POST request.
2. Express extracts the request body.
3. PostgreSQL inserts the record.
4. `RETURNING *` retrieves the inserted record.
5. `sendData()` broadcasts the record to eligible connected clients.
6. Express responds to the POST requester.

Do not broadcast before the database operation succeeds.

---

## 8. React Frontend Consumption

Use the browser's `EventSource` API when authentication does not require custom request headers.

Example:

```typescript
useEffect(() => {
  const eventSource = new EventSource("/api/sse/stream");

  eventSource.onmessage = (event) => {
    const messages = JSON.parse(event.data);

    setMessages((prev) => [...prev, ...messages]);
  };

  eventSource.onerror = (error) => {
    console.error("SSE connection error:", error);
  };

  return () => {
    eventSource.close();
  };
}, []);
```

### Important: Initial snapshot vs. new messages

The initial SSE event contains all existing records. It should replace the current frontend state.

Subsequent events contain newly inserted records. They should be appended.

Use an event flag to distinguish them.

Backend initial snapshot:

```typescript
res.write(`event: initial\ndata: ${JSON.stringify(messages)}\n\n`);
```

Backend new-message broadcast:

```typescript
client.write(`event: message\ndata: ${JSON.stringify(data)}\n\n`);
```

Frontend:

```typescript
useEffect(() => {
  const eventSource = new EventSource("/api/sse/stream");

  eventSource.addEventListener("initial", (event) => {
    const messages = JSON.parse(event.data);
    setMessages(messages);
  });

  eventSource.addEventListener("message", (event) => {
    const messages = JSON.parse(event.data);

    setMessages((prev) => [...prev, ...messages]);
  });

  eventSource.onerror = (error) => {
    console.error("SSE connection error:", error);
  };

  return () => {
    eventSource.close();
  };
}, []);
```

This keeps the same array payload contract while distinguishing initial data from new updates.

### Bearer token authentication

Native browser `EventSource` does not support custom Authorization headers.

If the application requires JWT Bearer authentication through an Authorization header, use `@microsoft/fetch-event-source`.

Example:

```typescript
import { fetchEventSource } from "@microsoft/fetch-event-source";

const controller = new AbortController();

await fetchEventSource("/api/sse/stream", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  },
  signal: controller.signal,

  onmessage(event) {
    const messages = JSON.parse(event.data);
    console.log(messages);
  },

  onerror(error) {
    console.error("SSE error:", error);
    throw error;
  }
});
```

Clean up using:

```typescript
controller.abort();
```

Use the authentication approach already established in the application. Do not put JWT tokens in URL query parameters as a workaround.

---

## 9. Routing and Middleware

Protect the SSE endpoint using the existing authentication middleware.

Example:

```typescript
router.get(
  "/stream",
  authMiddleware,
  streamSSE
);
```

For admin-only access:

```typescript
router.get(
  "/admin/stream",
  authMiddleware,
  adminMiddleware,
  streamSSE
);
```

Use role-based filtering in `sendData()` when multiple roles can connect but should receive different updates.

Use route authorization when a particular endpoint itself must be restricted.

Do not rely on frontend filtering for authorization.

---

## 10. MVP Implementation Rules

Prioritize a working implementation.

### Required

- One `Map<Response, User>` for connected clients.
- One `addClient()` function.
- One `sendData()` broadcasting function.
- One SSE endpoint.
- Initial database snapshot.
- Array-based payloads.
- Connection cleanup on close.
- Authentication middleware.
- Role-based recipient filtering when required.
- Proper SSE event termination with `\n\n`.

### Avoid unnecessary complexity

Do not introduce these unless explicitly required:

- WebSockets.
- Redis Pub/Sub.
- Kafka or RabbitMQ.
- Separate Map collections for each user role.
- Arrays of Maps.
- Custom event broker architectures.
- Complex event registries.
- Unnecessary generic event abstractions.
- Database synchronization systems.
- Custom SSE protocol implementations.
- Unnecessary ID generation logic.

Do not overengineer a basic SSE feature.

---

## 11. Important SSE Rules

1. SSE is server-to-client communication.
2. One HTTP response represents one connected SSE client.
3. `res.write()` sends data through that connection.
4. `Map<Response, User>` associates each connection with its authenticated user.
5. `clients.set(res, user)` registers a client.
6. `clients.delete(res)` removes a disconnected client.
7. `JSON.stringify()` serializes JavaScript data into JSON text.
8. An array of records is not an array of Maps.
9. `SELECT *` returns an array of rows.
10. `INSERT ... RETURNING *` also returns an array of rows with Postgres.js.
11. SSE events must end with `\n\n`.
12. The initial snapshot goes to the newly connected client.
13. `sendData()` broadcasts to registered clients.
14. Role filtering uses the stored user associated with each connection.
15. Do not send sensitive database fields to the frontend.

---

## 12. Troubleshooting

### Browser does not receive events

Check:

- Is `Content-Type` set to `text/event-stream`?
- Was `flushHeaders()` called?
- Is the response still open?
- Does the event end with `\n\n`?
- Is the frontend listening to the correct event type?
- Is the connection being terminated by middleware or a proxy?

### `req.user` is undefined

Check:

- Is `authMiddleware` applied to the SSE route?
- Does the middleware assign `req.user`?
- Is the Express Request type properly extended?

### Disconnected clients remain registered

Check that the registration function includes:

```typescript
res.on("close", () => {
  clients.delete(res);
});
```

### JSON parsing fails

Check that the backend sends:

```typescript
client.write(`data: ${JSON.stringify(data)}\n\n`);
```

Do not send raw JavaScript objects through string interpolation.

### Events are sent to the wrong users

Check the stored user object:

```typescript
for (const [client, user] of clients) {
  console.log(user.role);
}
```

Ensure the role filter is applied to the recipient associated with the current connection.

---

## Final Implementation Philosophy

Keep SSE simple:

- Register connections once.
- Associate each connection with its authenticated user.
- Retrieve the initial database snapshot.
- Use arrays for all message payloads.
- Broadcast through one shared function.
- Filter recipients using their stored user properties.
- Remove connections when they close.

Build the smallest reliable implementation that works in production. Add infrastructure only when the application's actual requirements justify it.
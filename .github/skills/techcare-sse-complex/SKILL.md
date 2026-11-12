---
name: techcare-sse-complex
description: Full-stack Server-Sent Events for TechCare - the live Queue Monitor pattern. Use when adding or debugging any realtime/live-update feature (queue board, lab board, notifications), writing a stream hub, the Express SSE route, publish-after-commit calls, the fetch-event-source client with auth header, reconnect/backoff, or a React hook. Trigger on SSE, EventSource, event-stream, publishQueueChange, live monitor, realtime, WebSocket replacement.
---

# SSE Realtime (backend hub + route + React client)

## Design rule: the stream carries a SIGNAL, never data
Server emits `event: <name>` with a timestamp. The client reacts by re-fetching from REST.
This keeps auth, filtering and masking in one place (the REST endpoint) and makes reconnects trivial: on every (re)connect the client reloads.

```
controller mutates data -> COMMIT -> publish()            (debounced 150 ms)
   hub writes "event: queue-changed" to every open response
client onmessage -> loadQueue() -> GET /api/admin/queues
```

## Backend

### `services/queue-sse/queueStream.hub.ts` (generic factory, reuse for any channel)
```ts
import type { Request, Response } from "express";

export function createStreamHub(eventName: string, opts = { max: 50, debounceMs: 150, pingMs: 25_000 }) {
  const screens = new Set<Response>();
  let debounce: NodeJS.Timeout | null = null;
  let pinger: NodeJS.Timeout | null = null;

  const write = (res: Response, chunk: string) => { try { res.write(chunk); } catch { screens.delete(res); } };

  function ensurePinger() {
    if (pinger) return;
    pinger = setInterval(() => {
      screens.forEach((r) => write(r, `event: ping\ndata: ${Date.now()}\n\n`));  // must be a real event so the client sees it
      if (!screens.size && pinger) { clearInterval(pinger); pinger = null; }
    }, opts.pingMs);
  }

  function addScreen(req: Request, res: Response): boolean {
    if (screens.size >= opts.max) { res.status(503).json({ message: "Too many connected screens" }); return false; }
    res.status(200).set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",          // stop nginx/Render proxies buffering the stream
    });
    res.flushHeaders();
    res.write(`retry: 3000\n\n`);
    res.write(`event: ready\ndata: ${Date.now()}\n\n`);
    screens.add(res);
    ensurePinger();
    req.on("close", () => screens.delete(res));
    return true;
  }

  function publish() {
    if (debounce) return;                 // coalesce bursts into one message
    debounce = setTimeout(() => {
      debounce = null;
      screens.forEach((r) => write(r, `event: ${eventName}\ndata: ${Date.now()}\n\n`));
    }, opts.debounceMs);
  }

  function closeAll() {                   // so server.close() does not hang on SIGTERM
    if (pinger) clearInterval(pinger);
    screens.forEach((r) => r.end());
    screens.clear();
  }

  return { addScreen, publish, closeAll, count: () => screens.size };
}
```

### `queueStream.handlers.ts`
```ts
import type { Request, Response } from "express";
import { queueHub } from "./index.js";
export const streamQueue = (req: Request, res: Response) => { queueHub.addScreen(req, res); };
export const getQueueStreamStats = (_req: Request, res: Response) => res.json({ screens: queueHub.count() });
```

### `index.ts`
```ts
import { createStreamHub } from "./queueStream.hub.js";
export const queueHub = createStreamHub("queue-changed");
export const publishQueueChange = () => queueHub.publish();
export const closeAllQueueStreams = () => queueHub.closeAll();
```
(Circular import with handlers is fine because only used at call time. If you prefer, put the hub instance in the hub file.)

### Route (auth header is checked by middleware BEFORE the stream opens)
```ts
router.use(authMiddleware, adminOnly);
router.get("/queue/stream", streamQueue);
router.get("/queue/stream/stats", getQueueStreamStats);
```
Add `GET /api/<role>/queue/stream` to other roles' routers if a display runs under another role.

### Where to publish
Call `publishQueueChange()` **after** the transaction commits, never inside it, in every handler that writes `queue_entries`: create, serve/accept, skip, complete, cancel, delete, payment-forwarding. Forgetting it = stale boards.

### Shutdown (`server.ts`)
```ts
process.on("SIGTERM", () => { closeAllQueueStreams(); server.close(() => process.exit(0)); });
```

### Do NOT
- Add `compression()` middleware to the stream route (buffers events).
- Put secrets or patient data in the event payload.
- Rely on the in-memory `Set` with more than one server instance (see Scaling).

## Frontend

### `services/queue-sse/connectQueueStream.ts`
Uses `@microsoft/fetch-event-source` because native `EventSource` cannot send `Authorization`.
```ts
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { api } from "#lib/axios";   // only for baseURL

class Fatal extends Error {}
export type StreamStatus = "connecting" | "live" | "reconnecting" | "unauthorized";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function connectStream(o: { path: string; event: string; onSignal: () => void; onStatus: (s: StreamStatus) => void }) {
  let stopped = false, attempt = 0, lastSeen = Date.now();
  let ctrl: AbortController | null = null;
  const watchdog = setInterval(() => { if (Date.now() - lastSeen > 65_000) ctrl?.abort(); }, 5_000); // silence => reconnect

  (async () => {
    while (!stopped) {
      ctrl = new AbortController(); lastSeen = Date.now(); o.onStatus(attempt ? "reconnecting" : "connecting");
      try {
        await fetchEventSource(`${api.defaults.baseURL ?? ""}${o.path}`, {
          signal: ctrl.signal,
          openWhenHidden: true,                                   // keep alive in background tabs / TV displays
          headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
          async onopen(res) {
            if (res.ok && res.headers.get("content-type")?.includes("text/event-stream")) {
              attempt = 0; o.onStatus("live"); o.onSignal(); return;   // reload on every (re)connect
            }
            if (res.status === 401 || res.status === 403) throw new Fatal();
            throw new Error(`HTTP ${res.status}`);
          },
          onmessage(m) { lastSeen = Date.now(); if (m.event === o.event) o.onSignal(); },
          onerror(e) { throw e; },                                // we own the retry loop
        });
      } catch (e) {
        if (stopped) break;
        if (e instanceof Fatal) { o.onStatus("unauthorized"); break; }   // 401/403: do not hammer the server
      }
      if (stopped) break;
      attempt++; o.onStatus("reconnecting");
      await sleep(Math.min(2000 * 2 ** (attempt - 1), 15_000));          // 2s, 4s, 8s, 15s max
    }
  })();

  return () => { stopped = true; clearInterval(watchdog); ctrl?.abort(); };
}
```

### Hook `hooks/useLiveQueue.ts`
```ts
import { useCallback, useEffect, useState } from "react";
import { api } from "#lib/axios";
import { connectStream, type StreamStatus } from "../services/queue-sse/connectQueueStream";

export function useLiveQueue() {
  const [queue, setQueue] = useState<any[]>([]);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const load = useCallback(async () => {
    try { setQueue((await api.get("/api/admin/queues")).data.queues ?? []); } catch { /* keep last good data */ }
  }, []);
  useEffect(() => connectStream({ path: "/api/queue/stream", event: "queue-changed", onSignal: load, onStatus: setStatus }), [load]);
  return { queue, status };
}
```
Return value of `useEffect` is the cleanup, so unmounting closes the stream.

### Page (`users/admin/pages/QueueingMonitor.tsx`)
Group by `room`, then `status`: serving first, then waiting ordered by `is_priority DESC, queue_number`. Show a small badge for `status` (live / reconnecting / unauthorized). `components/QueueMonitor/QueueColumn.tsx` renders one room. Mask names on public displays on the server side (initials + queue number) in the REST query.

## Adding a second channel (e.g. lab results ready)
1. `export const labHub = createStreamHub("lab-changed");` + `publishLabChange`.
2. Route `GET /api/labstaff/lab/stream`.
3. `connectStream({ path: "/api/labstaff/lab/stream", event: "lab-changed", ... })`.

## Scaling and hosting notes
- Hub state is per process. One Render instance = fine. Multiple instances: use Postgres `LISTEN/NOTIFY` (publish = `SELECT pg_notify('queue','1')`, each instance listens on a dedicated `pool` client and calls `hub.publish()`), or Redis pub/sub.
- Render free tier sleeps; the client's reconnect loop recovers automatically and reloads on reconnect.
- Max 50 screens by default: adjust `max` if you have many displays.

## Debug checklist
| Symptom | Cause |
|---|---|
| Board updates only after ~30-60 s | proxy buffering: missing `X-Accel-Buffering`, compression on the route |
| 401 loop | token missing in `sessionStorage`; client stops retrying on 401/403 by design |
| Updates stop silently | something is writing queue rows without `publishQueueChange()` |
| Works in dev, not on Render | CORS origin / absolute `baseURL` mismatch; same-origin monolith avoids it |
| Server hangs on deploy | `closeAllQueueStreams()` not called on SIGTERM |
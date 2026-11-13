import { fetchEventSource } from "@microsoft/fetch-event-source";
import api, { endSession, refreshAccessToken } from "../../lib/axios";
import type { QueueStreamStatus } from "../../interface/Queue";

const STREAM_URL = "/api/queue/stream";

class StopRetryingError extends Error {}
// The access token expired and was refreshed: reopen with the new token
// (fetchEventSource keeps the headers it started with, so it can't just retry).
class ReconnectError extends Error {}

type ConnectQueueStreamOptions = {
  onQueueChanged: () => void | Promise<void>;
  onStatusChange?: (status: QueueStreamStatus) => void;
};

export function connectQueueStream({
  onQueueChanged,
  onStatusChange,
}: ConnectQueueStreamOptions) {
  const controller = new AbortController();
  let closed = false;
  // One refresh per failed connection, so a 401 that a new token can't fix
  // doesn't loop forever.
  let justRefreshed = false;

  function open() {
    void fetchEventSource(`${api.defaults.baseURL ?? ""}${STREAM_URL}`, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("token") ?? ""}`,
      },
      // Only the tab you are looking at keeps the stream open. Browsers allow
      // ~6 connections per site over plain HTTP (local dev), so streams in
      // background tabs would block API calls. Coming back reopens it, and the
      // "initial" event reloads the data, so nothing is missed.
      openWhenHidden: false,
      async onopen(response) {
        const isStream = response.headers
          .get("content-type")
          ?.startsWith("text/event-stream");

        if (response.ok && isStream) {
          justRefreshed = false;
          onStatusChange?.("live");
          return;
        }

        if (
          response.status === 401 &&
          !justRefreshed &&
          sessionStorage.getItem("token") &&
          (await refreshAccessToken())
        ) {
          justRefreshed = true;
          throw new ReconnectError("Token refreshed");
        }

        // The session can't be renewed: log out, like any other request.
        if (response.status === 401 && sessionStorage.getItem("token")) {
          endSession();
        }
        if (response.status === 401 || response.status === 403) {
          onStatusChange?.("unauthorized");
          throw new StopRetryingError("Not authorized");
        }

        throw new Error(`Unexpected response: ${response.status}`);
      },
      onmessage(message) {
        if (message.event === "initial" || message.event === "queue-changed") {
          void onQueueChanged();
        }
      },
      onclose() {
        if (!closed) throw new Error("Queue stream closed");
      },
      onerror(error) {
        if (
          error instanceof StopRetryingError ||
          error instanceof ReconnectError ||
          closed
        )
          throw error;
        onStatusChange?.("reconnecting");
        return 3000;
      },
    }).catch((error) => {
      if (closed) return;
      if (error instanceof ReconnectError) {
        open();
        return;
      }
      if (!(error instanceof StopRetryingError)) {
        console.error("Queue SSE connection failed:", error);
      }
    });
  }

  open();

  return function closeQueueStream() {
    closed = true;
    controller.abort();
  };
}

import { fetchEventSource } from "@microsoft/fetch-event-source";
import api, { endSession, refreshAccessToken } from "../../lib/axios";
import type { NotificationStreamStatus } from "../../interface/Notification";

// The server pings every 25 s. Nothing at all for 60 s means the connection
// died quietly (Wi-Fi drop, phone sleep, proxy timeout), so open a fresh one.
const SILENCE_LIMIT_MS = 60_000;

class StopRetryingError extends Error {}
// The access token expired and was refreshed: reopen with the new token
// (fetchEventSource keeps the headers it started with, so it can't just retry).
class ReconnectError extends Error {}

type ConnectNotificationStreamOptions = {
  // "/api/notifications" (doctor, laboratory staff) or "/api/patient/notifications".
  basePath: string;
  onNotificationsChanged: () => void | Promise<void>;
  onStatusChange?: (status: NotificationStreamStatus) => void;
};

export function connectNotificationStream({
  basePath,
  onNotificationsChanged,
  onStatusChange,
}: ConnectNotificationStreamOptions) {
  // One controller per connection, so a dead one can be dropped and replaced.
  let attempt = new AbortController();
  let silenceTimer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  // One refresh per failed connection, so a 401 that a new token can't fix
  // doesn't loop forever.
  let justRefreshed = false;

  // Restarted by every message (pings included). If it ever runs out,
  // the connection is dead: drop it and reconnect.
  function resetSilenceTimer() {
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      if (closed) return;
      // Hidden tabs close their stream on purpose (openWhenHidden: false).
      if (document.hidden) return resetSilenceTimer();
      onStatusChange?.("reconnecting");
      attempt.abort();
      open();
    }, SILENCE_LIMIT_MS);
  }

  function open() {
    attempt = new AbortController();
    resetSilenceTimer();
    void fetchEventSource(`${api.defaults.baseURL ?? ""}${basePath}/stream`, {
      signal: attempt.signal,
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
          resetSilenceTimer();
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
        resetSilenceTimer(); // any message, including "ping", proves it's alive
        if (message.event === "initial" || message.event === "notifications-changed") {
          void onNotificationsChanged();
        }
      },
      onclose() {
        if (!closed) throw new Error("Notification stream closed");
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
        console.error("Notification SSE connection failed:", error);
      }
    });
  }

  open();

  return function closeNotificationStream() {
    closed = true;
    clearTimeout(silenceTimer);
    attempt.abort();
  };
}

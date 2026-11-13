import { fetchEventSource } from "@microsoft/fetch-event-source";
import api, { endSession, refreshAccessToken } from "../../lib/axios";
import type { NotificationStreamStatus } from "../../interface/Notification";

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
  const controller = new AbortController();
  let closed = false;
  // One refresh per failed connection, so a 401 that a new token can't fix
  // doesn't loop forever.
  let justRefreshed = false;

  function open() {
    void fetchEventSource(`${api.defaults.baseURL ?? ""}${basePath}/stream`, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("token") ?? ""}`,
      },
      openWhenHidden: true,
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
    controller.abort();
  };
}

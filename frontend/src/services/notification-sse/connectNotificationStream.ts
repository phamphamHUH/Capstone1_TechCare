import { fetchEventSource } from "@microsoft/fetch-event-source";
import api from "../../lib/axios";
import type { NotificationStreamStatus } from "../../interface/Notification";

class StopRetryingError extends Error {}

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
        onStatusChange?.("live");
        return;
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
      if (error instanceof StopRetryingError || closed) throw error;
      onStatusChange?.("reconnecting");
      return 3000;
    },
  }).catch((error) => {
    if (!closed && !(error instanceof StopRetryingError)) {
      console.error("Notification SSE connection failed:", error);
    }
  });

  return function closeNotificationStream() {
    closed = true;
    controller.abort();
  };
}

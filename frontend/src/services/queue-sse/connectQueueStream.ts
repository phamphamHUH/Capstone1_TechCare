import { fetchEventSource } from "@microsoft/fetch-event-source";
import api from "../../lib/axios";
import type { QueueStreamStatus } from "../../interface/Queue";

const STREAM_URL = "/api/queue/stream";

class StopRetryingError extends Error {}

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

  void fetchEventSource(`${api.defaults.baseURL ?? ""}${STREAM_URL}`, {
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
      if (message.event === "initial" || message.event === "queue-changed") {
        void onQueueChanged();
      }
    },
    onclose() {
      if (!closed) throw new Error("Queue stream closed");
    },
    onerror(error) {
      if (error instanceof StopRetryingError || closed) throw error;
      onStatusChange?.("reconnecting");
      return 3000;
    },
  }).catch((error) => {
    if (!closed && !(error instanceof StopRetryingError)) {
      console.error("Queue SSE connection failed:", error);
    }
  });

  return function closeQueueStream() {
    closed = true;
    controller.abort();
  };
}

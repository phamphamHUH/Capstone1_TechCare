import { useCallback, useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import ErrorMessage from "../../../components/ErrorMessage";
import api from "../../../lib/axios";
import { connectQueueStream } from "../../../services/queue-sse/connectQueueStream";
import QueueColumn from "../components/QueueMonitor/QueueColumn";
import type { QueueEntry, QueueStreamStatus } from "../../../interface/Queue";

type QueueingMonitorProps = {
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  loadData?: () => Promise<void>;
  loading?: boolean;
};

// Label + color of the badge for each connection status.
const STATUS_BADGE: Record<
  QueueStreamStatus,
  { label: string; style: string }
> = {
  connecting: { label: "Connecting…", style: "bg-amber-100 text-amber-700" },
  live: { label: "Live", style: "bg-emerald-100 text-emerald-700" },
  reconnecting: {
    label: "Reconnecting…",
    style: "bg-amber-100 text-amber-700",
  },
  unauthorized: {
    label: "Session expired — log in again",
    style: "bg-red-100 text-red-700",
  },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function QueueingMonitor(_props: QueueingMonitorProps) {
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [status, setStatus] = useState<QueueStreamStatus>("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Used for the Fullscreen button.
  const screenRef = useRef<HTMLDivElement>(null);

  const latestRequest = useRef(0);

  // Live clock in the header.
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadQueue = useCallback(async () => {
    setError("");
    latestRequest.current += 1;
    const thisRequest = latestRequest.current;

    try {
      const res = await api.get("/api/admin/queues");
      if (thisRequest !== latestRequest.current) return; // an older answer, ignore it

      setQueueEntries(res.data.queueEntries);
      setLastUpdated(new Date());
    } catch (error) {
      if (thisRequest !== latestRequest.current) return;
      console.error("Error loading queue entries:", error);
      setError("Unable to load queue entries. Please try again.");
    }
  }, []);

  useEffect(() => {
    const closeQueueStream = connectQueueStream({
      onQueueChanged: loadQueue,
      onStatusChange: setStatus,
    });

    return closeQueueStream;
  }, [loadQueue]);

  function handleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      screenRef.current?.requestFullscreen();
    }
  }

  // Fade the board when we are not live so nobody trusts old numbers.
  const isLive = status === "live";

  return (
    <div
      ref={screenRef}
      className="mx-6 flex min-h-[80vh] flex-col rounded-md bg-slate-100 p-3 text-slate-900"
    >
      {/* HEADER: title, connection badge, clock, fullscreen */}
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-blue-950">
            Queue Monitor
          </h2>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${STATUS_BADGE[status].style}`}
          >
            <span
              className={`h-2 w-2 rounded-full bg-current ${isLive ? "animate-pulse" : ""}`}
            />
            {STATUS_BADGE[status].label}
          </span>
        </div>

        <div className="flex items-center gap-4 text-slate-600">
          <span className="text-xl font-semibold tabular-nums text-blue-950">
            {currentTime.toLocaleTimeString()}
          </span>
          <button
            onClick={handleFullscreen}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Fullscreen
          </button>
        </div>
      </header>

      {/* BOARD: one column per service type */}
      {error && <ErrorMessage className="mb-3">{error}</ErrorMessage>}
      <div
        className={`grid flex-1 gap-3 lg:grid-cols-2 ${isLive ? "" : "opacity-50"}`}
      >
        <QueueColumn
          title="Consultation"
          entries={queueEntries.filter(
            (entry) => entry.service_type === "consultation",
          )}
        />
        <QueueColumn
          title="Laboratory"
          entries={queueEntries.filter(
            (entry) => entry.service_type === "laboratory",
          )}
        />
      </div>

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-sm">
        <span className="flex items-center gap-2 text-blue-950">
          <Info className="h-4 w-4 fill-blue-600 text-white" />
          Please wait for your number to be called.
        </span>
        <span className="text-xs text-slate-500">
          {lastUpdated
            ? `Last update ${lastUpdated.toLocaleTimeString()}`
            : "Waiting for first update…"}
        </span>
      </footer>
    </div>
  );
}

export default QueueingMonitor;

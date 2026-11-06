import { useCallback, useEffect, useRef, useState } from "react";
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
const STATUS_BADGE: Record<QueueStreamStatus, { label: string; style: string }> = {
  connecting: { label: "Connecting…", style: "bg-amber-500/20 text-amber-300" },
  live: { label: "Live", style: "bg-emerald-500/20 text-emerald-300" },
  reconnecting: { label: "Reconnecting…", style: "bg-amber-500/20 text-amber-300" },
  unauthorized: {
    label: "Session expired — log in again",
    style: "bg-red-500/20 text-red-300",
  },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function QueueingMonitor(_props: QueueingMonitorProps) {
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [status, setStatus] = useState<QueueStreamStatus>("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
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
    latestRequest.current += 1;
    const thisRequest = latestRequest.current;

    try {
      const res = await api.get("/api/admin/queues");
      if (thisRequest !== latestRequest.current) return; // an older answer, ignore it

      setQueueEntries(res.data.queueEntries);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error loading queue entries:", error);
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
      className="mx-6 flex min-h-[80vh] flex-col rounded-2xl bg-slate-900 p-6 text-white"
    >
      {/* HEADER: title, connection badge, clock, fullscreen */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight">Queue Monitor</h2>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${STATUS_BADGE[status].style}`}
          >
            <span
              className={`h-2 w-2 rounded-full bg-current ${isLive ? "animate-pulse" : ""}`}
            />
            {STATUS_BADGE[status].label}
          </span>
        </div>

        <div className="flex items-center gap-4 text-slate-300">
          <span className="text-xl tabular-nums">
            {currentTime.toLocaleTimeString()}
          </span>
          <button
            onClick={handleFullscreen}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-800"
          >
            Fullscreen
          </button>
        </div>
      </header>

      {/* BOARD: one column per service type */}
      <div className={`grid flex-1 gap-6 lg:grid-cols-2 ${isLive ? "" : "opacity-50"}`}>
        <QueueColumn
          title="Consultation"
          entries={queueEntries.filter((entry) => entry.service_type === "consultation")}
        />
        <QueueColumn
          title="Laboratory"
          entries={queueEntries.filter((entry) => entry.service_type === "laboratory")}
        />
      </div>

      <footer className="mt-4 text-right text-xs text-slate-500">
        {lastUpdated
          ? `Last update ${lastUpdated.toLocaleTimeString()}`
          : "Waiting for first update…"}
      </footer>
    </div>
  );
}

export default QueueingMonitor;

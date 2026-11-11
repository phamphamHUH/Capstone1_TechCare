import { useEffect, useState } from "react";
import axios from "axios";
import { FileText, FlaskConical, LayoutGrid, UserRound } from "lucide-react";
import ErrorMessage from "../../../components/ErrorMessage";
import LoadingScreen from "../../../components/LoadingScreen";
import { fetchPatientQueues } from "../components/patientApi";
import type { PatientQueueResponse } from "../../../interface/PatientPortal";
import QueueCard, {
  type QueueGroup,
} from "../components/QueueTracking/QueueCard";

const groups: QueueGroup[] = [
  {
    id: "consultation",
    title: "Consultation Queue",
    description:
      "Your queue status and the number being served for your consultation.",
    Icon: UserRound,
  },
  {
    id: "laboratory",
    title: "Laboratory Queue (For Extraction)",
    description:
      "Your queue status and the number being served for laboratory extraction.",
    Icon: FlaskConical,
  },
  {
    id: "release",
    title: "Laboratory Release Queue",
    description: "Check the collection status of your laboratory results.",
    Icon: FileText,
  },
];

export default function QueueTracking({
  refreshKey = 0,
  onLoadingChange,
}: {
  refreshKey?: number;
  onLoadingChange?: (loading: boolean) => void;
}) {
  const [tab, setTab] = useState("all");
  const [data, setData] = useState<PatientQueueResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    async function load(showLoading = false) {
      if (inFlight || controller.signal.aborted) return;
      inFlight = true;
      if (showLoading) {
        setLoading(true);
        onLoadingChange?.(true);
      }
      try {
        const response = await fetchPatientQueues(controller.signal);
        if (!controller.signal.aborted) {
          setData(response);
          setError("");
        }
      } catch (err) {
        if (!axios.isCancel(err) && !controller.signal.aborted)
          setError("Queue tracking could not be refreshed. Please try again.");
      } finally {
        inFlight = false;
        if (showLoading && !controller.signal.aborted) {
          setLoading(false);
          onLoadingChange?.(false);
        }
      }
    }
    void load(true);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [refreshKey, onLoadingChange]);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Queue Tracking</h1>
          <p className="mt-1 text-sm text-gray-500">
            View the current queue number being served for your service
            requests.
          </p>
        </div>
        {data && (
          <p className="text-xs text-gray-400">
            Last updated{" "}
            {new Date(data.updated_at).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
      <div
        role="tablist"
        aria-label="Queue types"
        className="grid grid-cols-1 gap-1 rounded-lg border border-gray-200 bg-white p-1 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[{ id: "all", title: "All Queue", Icon: LayoutGrid }, ...groups].map(
          (group) => (
            <button
              type="button"
              key={group.id}
              role="tab"
              aria-selected={tab === group.id}
              aria-controls="patient-queue-panels"
              onClick={() => setTab(group.id)}
              className={[
                "flex cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-3 text-center text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-sky-500",
                tab === group.id
                  ? "bg-sky-500 text-white"
                  : "text-gray-600 hover:bg-gray-50",
              ].join(" ")}
            >
              <group.Icon size={17} className="shrink-0" />
              {group.title}
            </button>
          ),
        )}
      </div>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {loading && !data ? (
        <LoadingScreen message="Loading queue tracking..." />
      ) : (
        data && (
          <div id="patient-queue-panels" className="space-y-4">
            {groups
              .filter((group) => tab === "all" || tab === group.id)
              .flatMap((group) => {
                const entries = data.queues.filter(
                  (queue) => queue.service_type === group.id,
                );
                return entries.length
                  ? entries.map((queue) => (
                      <QueueCard
                        key={queue.queue_id}
                        group={group}
                        queue={queue}
                        awaitingResults={data.awaiting_results}
                      />
                    ))
                  : [
                      <QueueCard
                        key={group.id}
                        group={group}
                        awaitingResults={data.awaiting_results}
                      />,
                    ];
              })}
          </div>
        )
      )}
    </div>
  );
}

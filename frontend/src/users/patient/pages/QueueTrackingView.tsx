import { useEffect, useState } from "react";
import axios from "axios";
import {
  Clock3,
  FileText,
  FlaskConical,
  Info,
  LayoutGrid,
  UserRound,
} from "lucide-react";
import ErrorMessage from "../../../components/ErrorMessage";
import LoadingScreen from "../../../components/LoadingScreen";
import { fetchPatientQueues } from "../patientApi";
import type { PatientQueueEntry, PatientQueueResponse } from "../types";
import PortalStatus from "../components/PortalStatus";

const groups = [
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

function queueNumber(number: number, type: string) {
  return (
    (type === "laboratory" ? "L-" : "C-") + String(number).padStart(3, "0")
  );
}

function QueueCard({
  group,
  queue,
  awaitingResults,
}: {
  group: (typeof groups)[number];
  queue?: PatientQueueEntry;
  awaitingResults: number;
}) {
  const { Icon } = group;
  const release = group.id === "release";
  const status = release
    ? awaitingResults
      ? "Awaiting release"
      : "No pending results"
    : queue?.status || "Not queued";
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-500">
            <Icon size={22} strokeWidth={1.7} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900">{group.title}</h2>
            <p className="mt-1 text-xs text-gray-500">{group.description}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs text-sky-600">
          <Info size={14} />
          {release ? "Result collection" : "Updates every 15 seconds"}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-sky-100 bg-sky-50 p-3">
          <p className="text-xs font-medium text-sky-600">Now Serving</p>
          <p className="my-1 break-words text-3xl font-bold text-gray-900">
            {!release && queue?.now_serving.length
              ? queue.now_serving
                  .map((number) => queueNumber(number, queue.service_type))
                  .join(" / ")
              : "—"}
          </p>
          <p className="text-xs text-gray-600">
            {release
              ? "Ask laboratory staff about collection."
              : queue?.service_name || "No active queue for this service."}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {queue?.room ||
              (release
                ? "Collection window not assigned"
                : "Room not assigned")}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 p-3">
          <p className="text-xs font-medium text-gray-500">Your Queue Number</p>
          <p className="my-1 text-3xl font-bold text-gray-900">
            {queue ? queueNumber(queue.queue_number, queue.service_type) : "—"}
          </p>
          <p className="text-xs text-gray-600">
            {release
              ? "No release queue number assigned"
              : queue?.service_name || "No active queue number"}
          </p>
          <p className="mt-1 text-xs text-gray-500">{queue?.room || ""}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-3">
          <p className="mb-2 text-xs font-medium text-gray-600">Your Status</p>
          <PortalStatus status={status} />
          {release ? (
            <p className="mt-2 text-xs text-gray-600">
              {awaitingResults} result{awaitingResults === 1 ? "" : "s"}{" "}
              awaiting release
            </p>
          ) : queue ? (
            <>
              <p className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                <Clock3 size={16} />
                {queue.requests_ahead} request
                {queue.requests_ahead === 1 ? "" : "s"} ahead
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Estimated waiting time unavailable.
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs text-gray-500">
              Your queue details appear after registration at the front desk.
            </p>
          )}
        </div>
      </div>
      <p className="mt-3 flex items-start gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-600">
        <Info size={15} className="mt-0.5 shrink-0" />
        {release
          ? "Please confirm result availability with the laboratory staff before collection."
          : queue?.status === "serving"
            ? "Your number is being served. Please proceed to the assigned room."
            : "Please wait for your number to be called, then proceed to the assigned room."}
      </p>
    </section>
  );
}

export default function QueueTrackingView({
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
              timeZone: "Asia/Manila",
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

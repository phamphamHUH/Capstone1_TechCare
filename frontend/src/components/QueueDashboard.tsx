import { useEffect, type ReactNode } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Siren,
  UserRound,
  ArrowUpRight,
} from "lucide-react";
import EmptyState from "./EmptyState";
import ErrorMessage from "./ErrorMessage";
import { connectQueueStream } from "../services/queue-sse/connectQueueStream";
import {
  statusOf,
  summarizeQueue,
  waitedFor,
  type DashboardQueueEntry,
} from "./QueueDashboard/utils/queueSummary";

export type DashboardLink = {
  page: string;
  title: string;
  description: string;
  icon: ReactNode;
};

type QueueDashboardProps = {
  roomLabel: string;
  queueLabel: string; // "consultation" or "laboratory"
  queues: DashboardQueueEntry[];
  serviceCount: number;
  loading: boolean;
  error?: string | null;
  queueLoadFailed?: boolean;
  queuePage: string; // nav page holding the full queue
  links: DashboardLink[];
  setPage: (page: string) => void;
  onQueueChanged: () => void | Promise<void>;
};

// How many waiting patients the "Next in line" list shows.
const NEXT_IN_LINE_LIMIT = 5;

// Today's overview for a staff member's room: queue counts, who is being
// served, who is next, and shortcuts to the role's pages. Shared by the
// doctor and laboratory staff dashboards.
function QueueDashboard({
  roomLabel,
  queueLabel,
  queues,
  serviceCount,
  loading,
  error,
  queueLoadFailed,
  queuePage,
  links,
  setPage,
  onQueueChanged,
}: QueueDashboardProps) {
  // Refresh as soon as the queue changes anywhere. The stream's first
  // message ("initial") arrives right after the role layout has already
  // loaded the queue, so skip it instead of loading everything twice.
  useEffect(() => {
    let skippedInitial = false;
    return connectQueueStream({
      onQueueChanged: () => {
        if (!skippedInitial) {
          skippedInitial = true;
          return;
        }
        return onQueueChanged();
      },
    });
  }, [onQueueChanged]);

  // Only the very first load has nothing to show; later refreshes keep the
  // current numbers on screen (the header's reload icon shows progress).
  const firstLoad = loading && queues.length === 0 && !queueLoadFailed;

  const { waiting, serving, completedCount, priorityWaitingCount } =
    summarizeQueue(queues);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const openQueue = () => setPage(queuePage);

  const stats = [
    {
      label: "Waiting",
      value: waiting.length,
      caption: "In line right now",
      icon: <Clock size={20} strokeWidth={1.5} />,
    },
    {
      label: "Now Serving",
      value: serving.length,
      caption: serving.length === 1 ? "Patient in the room" : "Patients in the room",
      icon: <UserRound size={20} strokeWidth={1.5} />,
    },
    {
      label: "Priority Waiting",
      value: priorityWaitingCount,
      caption: "Senior, PWD or urgent",
      icon: <Siren size={20} strokeWidth={1.5} />,
    },
    {
      label: "Completed Today",
      value: completedCount,
      caption: `Finished ${queueLabel}s`,
      icon: <CheckCircle2 size={20} strokeWidth={1.5} />,
    },
  ];

  return (
    <div className="space-y-6 px-4 pb-6 sm:px-6">
      {/* Room + date */}
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Today in {roomLabel}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {today} · {serviceCount} {serviceCount === 1 ? "service" : "services"} offered
        </p>
      </div>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {/* Stats: 2 columns on phones, 4 on large screens */}
      <section className="overflow-hidden rounded-md border border-gray-300 bg-white">
        <div className="grid grid-cols-2 gap-px bg-gray-300 lg:grid-cols-4">
          {stats.map((stat) => (
            <button
              key={stat.label}
              type="button"
              onClick={openQueue}
              className="group min-w-0 cursor-pointer bg-white p-4 text-left transition-colors hover:bg-sky-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky-500 sm:p-6"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="shrink-0">{stat.icon}</span>
                <p className="truncate text-sm text-gray-500">{stat.label}</p>
                <ChevronRight
                  size={16}
                  strokeWidth={1.5}
                  className="ml-auto shrink-0 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100"
                />
              </div>
              <p className="mt-3 text-2xl font-semibold tabular-nums sm:mt-4 sm:text-3xl">
                {queueLoadFailed ? "—" : firstLoad ? "…" : stat.value}
              </p>
              <p className="mt-2 text-sm text-gray-400">{stat.caption}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Now serving + next in line: side by side on large screens */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="min-w-0 rounded-md border border-gray-300 bg-white">
          <h2 className="border-b border-gray-300 px-4 py-4 text-base font-semibold sm:px-6">
            Now Serving
          </h2>
          <div className="p-4 sm:p-6">
            {serving.length === 0 ? (
              <EmptyState
                compact
                message={firstLoad ? "Loading..." : "No one is being served."}
              />
            ) : (
              <ul className="space-y-3">
                {serving.map((entry) => (
                  <li
                    key={entry.queue_id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-green-50 px-4 py-3"
                  >
                    <span className="text-xl font-bold tabular-nums text-green-800">
                      {entry.queue_id}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
                      {entry.patient_name || "Unknown patient"}
                    </span>
                    {entry.service_name && (
                      <span className="text-xs text-gray-500">{entry.service_name}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="min-w-0 rounded-md border border-gray-300 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-gray-300 px-4 py-4 sm:px-6">
            <h2 className="text-base font-semibold">Next in Line</h2>
            <button
              type="button"
              onClick={openQueue}
              className="flex shrink-0 cursor-pointer items-center gap-1 text-sm text-sky-600 hover:text-sky-700"
            >
              View queue <ChevronRight size={16} />
            </button>
          </div>
          <div className="p-4 sm:p-6">
            {waiting.length === 0 ? (
              <EmptyState
                compact
                message={
                  queueLoadFailed
                    ? "The queue is unavailable."
                    : firstLoad
                      ? "Loading..."
                      : "No one is waiting."
                }
              />
            ) : (
              <ol className="divide-y divide-gray-100">
                {waiting.slice(0, NEXT_IN_LINE_LIMIT).map((entry, index) => (
                  <li
                    key={entry.queue_id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="w-5 shrink-0 text-sm text-gray-400">{index + 1}</span>
                    <span className="font-semibold tabular-nums text-sky-700">
                      {entry.queue_id}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
                      {entry.patient_name || "Unknown patient"}
                    </span>
                    {entry.is_priority && (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                        Priority
                      </span>
                    )}
                    {statusOf(entry) === "skipped" && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Skipped
                      </span>
                    )}
                    <span className="text-xs text-gray-500 tabular-nums" title="Time in queue">
                      {waitedFor(entry.created_at)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {waiting.length > NEXT_IN_LINE_LIMIT && (
              <p className="mt-3 text-sm text-gray-500">
                +{waiting.length - NEXT_IN_LINE_LIMIT} more waiting
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Shortcuts to the role's pages */}
      <div className="grid gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <button
            key={link.page}
            type="button"
            onClick={() => setPage(link.page)}
            className="flex cursor-pointer items-start gap-4 rounded-md border border-gray-200 bg-white p-4 text-left transition hover:border-sky-300 hover:bg-sky-50/30 focus-visible:outline-2 focus-visible:outline-sky-500 sm:p-5"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-500">
              {link.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-gray-900">{link.title}</span>
              <span className="mt-1 block text-sm text-gray-500">{link.description}</span>
            </span>
            <ArrowUpRight size={18} className="shrink-0 text-gray-400" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default QueueDashboard;

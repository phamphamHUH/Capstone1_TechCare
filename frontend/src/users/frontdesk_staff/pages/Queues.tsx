import LoadingScreen from "../../../components/LoadingScreen";
import ErrorMessage from "../../../components/ErrorMessage";
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import type {
  PriorityFilter,
  QueueEntry,
  QueueRequests,
  QueueStatFilter,
  QueueStatistics,
  QueueTab,
} from "../../../interface/Queue";
import QueueStats from "../components/Queues/QueueStats";
import QueueTabs from "../components/Queues/QueueTabs";
import QueueFilters from "../components/Queues/QueueFilters";
import QueueTable from "../components/Queues/QueueTable";
import RoomInfo from "../components/Queues/RoomInfo";
import { connectQueueStream } from "../../../services/queue-sse/connectQueueStream";

type QueuesProps = {
  queues: QueueEntry[];
  queueRequests: QueueRequests[];
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadData: () => Promise<void>;
  loading: boolean;
  error?: string;
  loadFailed?: boolean;
};

const isToday = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }) ===
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

// Status rules shared by the stat card counts and the stat card filters,
// so a card's number always matches the rows it shows when clicked.
const statusOf = (q: QueueEntry) => q.status.toLowerCase();
const isActive = (q: QueueEntry) =>
  !["completed", "cancelled"].includes(statusOf(q));
const isWaiting = (q: QueueEntry) => statusOf(q) === "waiting";
const isInService = (q: QueueEntry) =>
  ["in service", "in progress", "serving"].includes(statusOf(q));
const isCompletedToday = (q: QueueEntry) =>
  statusOf(q) === "completed" && isToday(q.updated_at);

const STAT_FILTERS: Record<QueueStatFilter, (q: QueueEntry) => boolean> = {
  all: () => true,
  active: isActive,
  priority: (q) => isActive(q) && q.is_priority,
  waiting: isWaiting,
  "in-service": isInService,
  "completed-today": isCompletedToday,
};

function Queues({
  queues,
  queueRequests,
  loadData,
  loading,
  error,
  loadFailed,
}: QueuesProps) {
  const [activeTab, setActiveTab] = useState<QueueTab>("all");
  const [, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [statFilter, setStatFilter] = useState<QueueStatFilter>("all");

  useEffect(() => {
    const closeQueueStream = connectQueueStream({
      onQueueChanged: loadData,
    });

    return closeQueueStream;
  }, [loadData]);

  const serviceOptions = Array.from(
    new Set(
      queues
        .filter(
          (q) =>
            activeTab === "all" ||
            q.service_type?.toLowerCase() === activeTab.toLowerCase(),
        )
        .map((q) => q.service_category),
    ),
  ).filter(Boolean);

  const stats: QueueStatistics = useMemo(() => {
    const count = (filter: QueueStatFilter) =>
      queues.filter(STAT_FILTERS[filter]).length;

    return {
      totalQueue: count("active"),
      priorityQueue: count("priority"),
      waiting: count("waiting"),
      inService: count("in-service"),
      completedToday: count("completed-today"),
    };
  }, [queues]);

  const visibleQueues = useMemo(() => {
    const q = search.trim().toLowerCase();

    return queues.filter((entry) => {
      if (!STAT_FILTERS[statFilter](entry)) return false;
      if (
        activeTab !== "all" &&
        entry.service_type?.toLowerCase() !== activeTab
      )
        return false;
      if (serviceFilter !== "all" && entry.service_category !== serviceFilter)
        return false;
      if (priority === "yes" && !entry.is_priority) return false;
      if (priority === "none" && entry.is_priority) return false;
      if (
        q &&
        !entry.patient_name?.toLowerCase().includes(q) &&
        !entry.queue_id.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [queues, statFilter, activeTab, serviceFilter, priority, search]);

  if (loading && !queues.length && !queueRequests.length) {
    return <LoadingScreen variant="page" message="Loading queues..." />;
  }

  return (
    <main className="flex-1 min-w-0 ">
      <div className="flex  items-center  justify-between px-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-80">Queue Management</h1>
          <h3 className="text-sm">View Queue Status and Rooms in Real-Time</h3>
        </div>
        <button
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
          onClick={() => setSearchParams({ page: "service-request" })}
        >
          New Service Request
        </button>
      </div>

      <div className="px-6">
        {error && <ErrorMessage className="mt-5">{error}</ErrorMessage>}
        <QueueStats
          stats={stats}
          activeFilter={statFilter}
          onFilterChange={setStatFilter}
        />
        <QueueTabs
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setServiceFilter("all");
          }}
        />
        {queueRequests.some(
          (request) => request.record_type === "laboratory",
        ) && (
          <p className="my-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Some paid requests still need laboratory forwarding.{" "}
            <button
              className="underline"
              onClick={() => setSearchParams({ page: "billing" })}
            >
              Open Billing
            </button>{" "}
            to send them.
          </p>
        )}
        <QueueFilters
          search={search}
          setSearch={setSearch}
          serviceFilter={serviceFilter}
          setServiceFilter={setServiceFilter}
          serviceOptions={serviceOptions}
          priority={priority}
          setPriority={setPriority}
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-7">
          <div className="xl:col-span-5 flex flex-col gap-2">
            <QueueTable
              queues={visibleQueues}
              onRefresh={loadData}
              loadFailed={loadFailed}
            />
          </div>
          <div className="xl:col-span-2">
            <RoomInfo queues={queues} loadFailed={loadFailed} />
          </div>
        </div>
      </div>
    </main>
  );
}

export default Queues;

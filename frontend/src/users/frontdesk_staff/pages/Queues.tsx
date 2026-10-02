import Header from "#components/Header";
import React, { useCallback, useMemo, useState } from "react";
import type {
  PriorityFilter,
  QueueEntry,
  QueueRequests,
  QueueStatistics,
  QueueTab,
} from "../../../interface/Queue";
import QueueStats from "../components/Queues/QueueStats";
import QueueTabs from "../components/Queues/QueueTabs";
import QueueFilters from "../components/Queues/QueueFilters";
import QueueTable from "../components/Queues/QueueTable";
import RoomInfo from "../components/Queues/RoomInfo";
import QueueRequestsTable from "../components/Queues/QueueRequestsTable";
import AddToQueueModal from "../components/Queues/QueueRequestsTable/AddToQueueModal";

type QueuesProps = {
  queues: QueueEntry[];
  queueRequests: QueueRequests[];
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadData: () => Promise<void>;
  loading: boolean;
};

const isToday = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }) ===
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

function Queues({
  queues,
  queueRequests,
  open,
  setOpen,
  loadData,
  loading,
}: QueuesProps) {
  const [activeTab, setActiveTab] = useState<QueueTab>("all");
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [selectedRequest, setSelectedRequest] = useState<QueueRequests | null>(
    null,
  );
  const closeModal = useCallback(() => setSelectedRequest(null), []);

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
    const active = queues.filter(
      (q) => q.status !== "Completed" && q.status !== "Cancelled",
    );
    return {
      totalQueue: active.length,
      priorityQueue: active.filter((q) => q.is_priority).length,
      waiting: queues.filter((q) => q.status === "Waiting").length,
      inService: queues.filter((q) => q.status === "In Service").length,
      completedToday: queues.filter(
        (q) => q.status === "Completed" && isToday(q.updated_at),
      ).length,
    };
  }, [queues]);

  const visibleQueues = useMemo(() => {
    const q = search.trim().toLowerCase();

    return queues.filter((entry) => {
      if (activeTab !== "all" && entry.status.toLowerCase() !== activeTab)
        return false;
      if (serviceFilter !== "all" && entry.service_name !== serviceFilter)
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
  }, [queues, activeTab, serviceFilter, priority, search]);

  return (
    <main className="flex-1 min-w-0 ">
      <Header
        loading={loading}
        open={open}
        setOpen={setOpen}
        loadData={loadData}
        page="Queues"
      />

      <div className="flex  items-center  justify-between px-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-80">Queue Management</h1>
          <h3 className="text-sm">View Queue Status and Rooms in Real-Time</h3>
        </div>
        <button>Add to Queue</button>
      </div>

      <div className="px-6">
        <QueueStats stats={stats} />
        <QueueTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        <QueueFilters
          search={search}
          setSearch={setSearch}
          serviceFilter={serviceFilter}
          setServiceFilter={setServiceFilter}
          serviceOptions={serviceOptions}
          priority={priority}
          setPriority={setPriority}
        />
        <div className="grid grid-cols-7">
          <div className="col-span-5 flex flex-col gap-2">
            <QueueRequestsTable
              queueRequests={queueRequests}
              onAddToQueue={setSelectedRequest}
            />
            <QueueTable queues={visibleQueues} />
          </div>
          <div className="col-span-2">
            <RoomInfo />
          </div>
        </div>
        {selectedRequest && (
          <AddToQueueModal
            request={selectedRequest}
            onClose={closeModal}
            onSubmitted={async () => {
              setSelectedRequest(null);
              await loadData();
            }}
          />
        )}
      </div>
    </main>
  );
}

export default Queues;

import EmptyState from "../../../../components/EmptyState";
import { useState, type Dispatch, type SetStateAction } from "react";
import QueueTable from "./QueueTable";
import type { PriorityFilter, QueueEntry } from "../../../../interface/Queue";
import type { Service } from "../../../../interface/Service";
import { ChevronDown, Search } from "lucide-react";

type MainFilter = "all" | "waiting" | "serving" | "completed" | "skipped";

type RequestTableProps = {
  queues: QueueEntry[];
  services?: Service[];
  loading: boolean;
  error: string | null;
  loadFailed?: boolean;
  setOpenQueueAccordion: Dispatch<SetStateAction<string | null>>;
  openQueueAccordion: string | null;
  setOpenInformationCard: Dispatch<SetStateAction<boolean>>;
  setQueueIdCard: Dispatch<SetStateAction<string | null>>;
  loadData: () => Promise<void>;
  room: string;
  setSelectedQueue: React.Dispatch<React.SetStateAction<QueueEntry | null>>;
};

const mainFilterValues: { label: string; value: MainFilter }[] = [
  { label: "All", value: "all" },
  { label: "Waiting", value: "waiting" },
  { label: "Serving", value: "serving" },
  { label: "Completed", value: "completed" },
  { label: "Skipped", value: "skipped" },
];

function ConsultationQueuePanel({
  queues,
  loading,
  error,
  loadFailed = Boolean(error),
  setOpenQueueAccordion,
  openQueueAccordion,
  setOpenInformationCard,
  setQueueIdCard,
  room,
  loadData,
  setSelectedQueue,
}: RequestTableProps) {
  // MAIN STATUS TABS AND ADDITIONAL FILTERS
  const [activeMainTab, setActiveMainTab] = useState<MainFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");

  // SERVICE OPTIONS (based on the active status tab)
  const serviceOptions = Array.from(
    new Set(
      queues
        .filter(
          (q) =>
            activeMainTab === "all" ||
            q.status?.toLowerCase() === activeMainTab,
        )
        .map((q) => q.service_category),
    ),
  )
    .filter((c): c is string => Boolean(c))
    .sort();

  // If the selected service isn't available on this tab, treat it as no filter.
  const activeServiceFilter = serviceOptions.includes(serviceFilter)
    ? serviceFilter
    : "";

  const searchLower = searchFilter.trim().toLowerCase();

  const rank = (queue: QueueEntry) => {
    if (queue.queue_id === openQueueAccordion) return 0;
    if (queue.status?.toLowerCase() === "serving") return 1;
    return 2;
  };

  const filterQueues = queues
    .filter((queue) => {
      const status = queue.status?.toLowerCase();

      const matchesStatus =
        activeMainTab === "all"
          ? status !== "completed"
          : status === activeMainTab;

      const matchesSearch =
        !searchLower ||
        queue.queue_id?.toLowerCase().includes(searchLower) ||
        queue.patient_id?.toLowerCase().includes(searchLower);

      const matchesPriority =
        priorityFilter === "all" ||
        (priorityFilter === "yes" && queue.is_priority) ||
        (priorityFilter === "none" && !queue.is_priority);

      const matchesService =
        activeServiceFilter === "" ||
        queue.service_category === activeServiceFilter;

      return (
        matchesStatus && matchesSearch && matchesPriority && matchesService
      );
    })
    .sort((a, b) => rank(a) - rank(b) || a.queue_number - b.queue_number);

  const mainFilterCounts = queues.reduce(
    (counts, queue) => {
      const status = queue.status?.toLowerCase();

      if (status !== "completed") counts.all += 1;
      if (queue.is_priority) counts.priority += 1;

      switch (status) {
        case "waiting":
          counts.waiting += 1;
          break;
        case "serving":
          counts.serving += 1;
          break;
        case "completed":
          counts.completed += 1;
          break;
        case "skipped":
          counts.skipped += 1;
          break;
      }

      return counts;
    },
    {
      all: 0,
      waiting: 0,
      priority: 0,
      serving: 0,
      completed: 0,
      skipped: 0,
    },
  );

  return (
    <div className="flex min-h-20 w-full flex-col justify-around rounded-md border border-gray-300">
      {/* MAIN FILTERS */}
      <div className="flex h-10 w-full items-end justify-around border-b mb-5 border-gray-300">
        {mainFilterValues.map((mainFilter) => {
          const isActive = activeMainTab === mainFilter.value;

          return (
            <button
              key={mainFilter.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setActiveMainTab(mainFilter.value);
                setOpenQueueAccordion(null);
              }}
              className={`px-5 py-1 text-sm ${
                isActive
                  ? "border-b border-blue-600 text-blue-600"
                  : "text-gray-900"
              }`}
            >
              {mainFilter.label} ({mainFilterCounts[mainFilter.value] ?? 0})
            </button>
          );
        })}
      </div>

      {/* SEARCH BAR AND ADDITIONAL FILTERS */}
      <div className="mb-5 flex w-7/12 flex-wrap items-center gap-2 px-6">
        <div className="relative min-w-55 flex-1 basis-70">
          <Search
            size={17}
            strokeWidth={1.5}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search..."
            className="h-9 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-100"
          />
        </div>

        <label className="relative shrink-0">
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="h-9 min-w-27.5 appearance-none rounded-md border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-600 outline-none focus:border-sky-400"
          >
            <option value="">Services</option>
            {serviceOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
        </label>

        <label className="relative shrink-0">
          <select
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(e.target.value as PriorityFilter)
            }
            className="h-9 min-w-25.5 appearance-none rounded-md border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-600 outline-none focus:border-sky-400"
          >
            <option value="all">Priority: All</option>
            <option value="yes">Priority: Yes</option>
            <option value="none">Priority: None</option>
          </select>

          <ChevronDown
            size={15}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
        </label>
      </div>

      {/* QUEUE TABLE */}
      <QueueTable
        filterQueues={filterQueues}
        setOpenInformationCard={setOpenInformationCard}
        setQueueIdCard={setQueueIdCard}
        room={room}
        loadData={loadData}
        setSelectedQueue={setSelectedQueue}
        loading={loading}
        error={error}
        loadFailed={loadFailed}
      />
    </div>
  );
}

export default ConsultationQueuePanel;

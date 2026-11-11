import EmptyState from "../../../../components/EmptyState";
import ErrorMessage from "../../../../components/ErrorMessage";
import LoadingScreen from "../../../../components/LoadingScreen";
import LoadingRegion from "../../../../components/LoadingRegion";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import api from "../../../../lib/axios";
import QueueTabs, { type MainFilter } from "./QueueTabs";
import QueueTable from "./QueueTable";
import type { LaboratoryItem } from "../../../../interface/LaboratoryItem";
import type { PriorityFilter, QueueEntry } from "../../../../interface/Queue";
import type { Service } from "../../../../interface/Service";
import QueueFilters from "./LaboratoryQueuePanel/QueueFilter";

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
};

const mainFilterValues: { label: string; value: MainFilter }[] = [
  { label: "All", value: "all" },
  { label: "Priority", value: "priority" },
  { label: "Waiting", value: "waiting" },
  { label: "Serving", value: "serving" },
  { label: "Completed", value: "completed" },
  { label: "Skipped", value: "skipped" },
];

function LaboratoryQueuePanel({
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
}: RequestTableProps) {
  // MAIN STATUS TABS AND ADDITIONAL FILTERS
  const [activeMainTab, setActiveMainTab] = useState<MainFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");

  // LABORATORY REQUEST ITEM STORAGE
  const [laboratoryItems, setLaboratoryItems] = useState<LaboratoryItem[]>([]);

  // ACCORDION HELPERS
  const [accordionError, setAccordionError] = useState<string | null>(null);
  const [accordionLoading, setAccordionLoading] = useState(false);

  // FETCH ITEMS WHEN A QUEUE ACCORDION IS OPENED
  useEffect(() => {
    if (!openQueueAccordion) {
      return;
    }

    let cancelled = false;

    async function fetchLaboratoryItems() {
      try {
        setAccordionLoading(true);
        setAccordionError(null);

        const itemResponse = await api.get(
          `/api/labstaff/laboratory-queues/${openQueueAccordion}/items`,
        );
        if (cancelled) return;
        setLaboratoryItems(itemResponse.data ?? []);
      } catch (err) {
        if (cancelled) return;
        const message =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || "Laboratory request items could not be loaded.";
        setAccordionError(message);
        setLaboratoryItems([]);
      } finally {
        if (!cancelled) setAccordionLoading(false);
      }
    }

    fetchLaboratoryItems();

    return () => {
      cancelled = true;
    };
  }, [openQueueAccordion]);

  // Which tab a queue entry belongs to. "All" and "Priority" leave out
  // completed entries; the other tabs match the status.
  const matchesTab = (queue: QueueEntry, tab: MainFilter) => {
    const status = queue.status?.toLowerCase();
    if (tab === "all") return status !== "completed";
    if (tab === "priority") return queue.is_priority && status !== "completed";
    return status === tab;
  };

  // SERVICE OPTIONS (based on the active status tab)
  const serviceOptions = Array.from(
    new Set(
      queues
        .filter((q) => matchesTab(q, activeMainTab))
        .map((q) => q.service_category),
    ),
  )
    .filter((c): c is string => Boolean(c))
    .sort();

  // If the selected service isn't available on this tab, treat it as "no filter"
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
      const matchesStatus = matchesTab(queue, activeMainTab);

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
      if (queue.is_priority && status !== "completed") counts.priority += 1;

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

  const loadingLabel = activeMainTab === "all" ? "" : `${activeMainTab} `;

  return (
    <div className="w-full min-h-20 border rounded-md border-gray-300 flex flex-col gap-5 justify-around">
      {/* MAIN FILTERS */}
      <QueueTabs
        mainFilterValues={mainFilterValues}
        activeMainFilter={activeMainTab}
        mainFilterCounts={mainFilterCounts}
        setOpenQueueAccordion={setOpenQueueAccordion}
        onClick={setActiveMainTab}
      />

      {/* SEARCH BAR AND ADDITIONAL FILTERS */}
      <QueueFilters
        search={searchFilter}
        setSearch={setSearchFilter}
        serviceFilter={activeServiceFilter}
        setServiceFilter={setServiceFilter}
        serviceOptions={serviceOptions}
        priority={priorityFilter}
        setPriority={setPriorityFilter}
      />

      {error && <ErrorMessage className="mx-4">{error}</ErrorMessage>}
      <LoadingRegion
        loading={loading && queues.length > 0}
        message="Refreshing laboratory queues..."
      >
        {loading && queues.length === 0 ? (
          <LoadingScreen
            message={`Loading ${loadingLabel}laboratory queues...`}
          />
        ) : filterQueues.length === 0 ? (
          <EmptyState
            message={
              loadFailed
                ? "Laboratory requests are unavailable."
                : "No laboratory requests found."
            }
          />
        ) : (
          <div className="w-full">
            <QueueTable
              filterQueues={filterQueues}
              laboratoryItems={laboratoryItems}
              accordionError={accordionError}
              accordionLoading={accordionLoading}
              setOpenQueueAccordion={setOpenQueueAccordion}
              openQueueAccordion={openQueueAccordion}
              setOpenInformationCard={setOpenInformationCard}
              setQueueIdCard={setQueueIdCard}
              room={room}
              loadData={loadData}
            />
          </div>
        )}
      </LoadingRegion>
    </div>
  );
}

export default LaboratoryQueuePanel;

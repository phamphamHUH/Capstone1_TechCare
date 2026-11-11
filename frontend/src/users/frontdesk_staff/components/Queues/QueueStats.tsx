import {
  Loader,
  ListOrdered,
  FileExclamationPoint,
  ListStart,
  FileCheck,
} from "lucide-react";
import type {
  QueueStatFilter,
  QueueStatistics,
} from "../../../../interface/Queue.ts";

type QueueProps = {
  stats: QueueStatistics;
  activeFilter: QueueStatFilter;
  onFilterChange: (filter: QueueStatFilter) => void;
};

function QueueStats({ stats, activeFilter, onFilterChange }: QueueProps) {
  const cards: {
    filter: QueueStatFilter;
    label: string;
    subLabel: string;
    value: number;
    icon: typeof ListOrdered;
  }[] = [
    {
      filter: "active",
      label: "Total Queue",
      subLabel: "Active queue records",
      value: stats.totalQueue,
      icon: ListOrdered,
    },
    {
      filter: "priority",
      label: "Priority",
      subLabel: "Active priority patients",
      value: stats.priorityQueue,
      icon: FileExclamationPoint,
    },
    {
      filter: "waiting",
      label: "Waiting",
      subLabel: "Currently waiting",
      value: stats.waiting,
      icon: Loader,
    },
    {
      filter: "in-service",
      label: "In Service",
      subLabel: "Currently being served",
      value: stats.inService,
      icon: ListStart,
    },
    {
      filter: "completed-today",
      label: "Completed Today",
      subLabel: "Finished today",
      value: stats.completedToday,
      icon: FileCheck,
    },
  ];

  return (
    <section className="mt-5 mb-6 overflow-hidden rounded-md border border-gray-300 bg-gray-300">
      <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          const selected = activeFilter === card.filter;

          return (
            <button
              key={card.label}
              type="button"
              // Clicking the selected card again clears the filter.
              onClick={() => onFilterChange(selected ? "all" : card.filter)}
              aria-pressed={selected}
              title={
                selected
                  ? "Click to show all"
                  : `Show ${card.label.toLowerCase()}`
              }
              className={`p-6 text-left cursor-pointer transition-colors sm:last:col-span-2 lg:last:col-span-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky-500 ${
                selected
                  ? "bg-sky-50 shadow-[inset_0_-3px_0_0_var(--color-sky-500)]"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              <div className="mb-4 flex items-center gap-3">
                <Icon
                  size={20}
                  strokeWidth={1.5}
                  className={`shrink-0 ${selected ? "text-sky-600" : ""}`}
                />

                <p
                  className={`text-sm ${selected ? "font-medium text-sky-700" : "text-gray-500"}`}
                >
                  {card.label}
                </p>
              </div>

              <p
                className={`text-3xl font-semibold ${selected ? "text-sky-700" : ""}`}
              >
                {card.value}
              </p>

              <p className="mt-2 text-sm text-gray-400">{card.subLabel}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default QueueStats;

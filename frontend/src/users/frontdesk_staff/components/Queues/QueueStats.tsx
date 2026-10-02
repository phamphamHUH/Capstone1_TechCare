import {
  Loader,
  ListOrdered,
  FileExclamationPoint,
  ListStart,
  FileCheck,
} from "lucide-react";
import type { QueueStatistics } from "../../../../interface/Queue.ts";

type QueueProps = {
  stats: QueueStatistics;
};

function QueueStats({ stats }: QueueProps) {
  const cards = [
    {
      label: "Total Queue",
      value: stats.totalQueue,
      bg: "bg-sky-50",
      border: "border-sky-400",
      iconBg: "bg-sky-200",
      icon: ListOrdered,
    },
    {
      label: "Priority",
      value: stats.priorityQueue,
      bg: "bg-green-50",
      border: "border-green-400",
      iconBg: "bg-green-200",
      icon: FileExclamationPoint,
    },
    {
      label: "Waiting",
      value: stats.waiting,
      bg: "bg-orange-50",
      border: "border-orange-400",
      iconBg: "bg-orange-200",
      icon: Loader,
    },
    {
      label: "In Service",
      value: stats.inService,
      bg: "bg-red-50",
      border: "border-red-400",
      iconBg: "bg-red-200",
      icon: ListStart,
    },
    {
      label: "Completed Today",
      value: stats.completedToday,
      bg: "bg-fuchsia-50",
      border: "border-fuchsia-400",
      iconBg: "bg-fuchsia-200",
      icon: FileCheck,
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className={`rounded-xl border ${card.border} ${card.bg} px-4 py-3 mt-5`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}
              >
                <Icon size={22} strokeWidth={1.7} className="text-gray-600" />
              </div>

              <span className="text-xs font-medium text-gray-500">
                {card.label}
              </span>
            </div>

            <p className="mt-2 text-center text-3xl font-bold leading-none text-gray-950">
              {card.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default QueueStats;

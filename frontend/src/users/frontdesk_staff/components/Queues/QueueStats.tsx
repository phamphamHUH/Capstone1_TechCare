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
      subLabel: "Active queue records",
      value: stats.totalQueue,
      icon: ListOrdered,
    },
    {
      label: "Priority",
      subLabel: "Active priority patients",
      value: stats.priorityQueue,
      icon: FileExclamationPoint,
    },
    {
      label: "Waiting",
      subLabel: "Currently waiting",
      value: stats.waiting,
      icon: Loader,
    },
    {
      label: "In Service",
      subLabel: "Currently being served",
      value: stats.inService,
      icon: ListStart,
    },
    {
      label: "Completed Today",
      subLabel: "Finished today",
      value: stats.completedToday,
      icon: FileCheck,
    },
  ];

  return (
    <section className="mt-5 mb-6 overflow-hidden rounded-2xl border border-gray-300 bg-gray-300">
      <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="bg-white p-6 sm:last:col-span-2 lg:last:col-span-1"
            >
              <div className="mb-4 flex items-center gap-3">
                <Icon size={20} strokeWidth={1.5} className="shrink-0" />

                <p className="text-sm text-gray-500">{card.label}</p>
              </div>

              <p className="text-3xl font-semibold">{card.value}</p>

              <p className="mt-2 text-sm text-gray-400">{card.subLabel}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default QueueStats;

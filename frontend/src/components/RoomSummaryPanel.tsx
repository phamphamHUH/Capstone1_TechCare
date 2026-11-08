import {
  CircleCheck,
  CircleOff,
  FileCheck,
  FileExclamationPoint,
  Layers,
  ListStart,
  Loader,
  type LucideIcon,
} from "lucide-react";
import type { Queue } from "../interface/Queue";
import type { Service } from "../interface/Service";

type RoomSummaryPanelProps = {
  services: Service[];
  queues: Queue[];
  roomLabel: string;
  onViewServices: () => void;
};

type Stat = {
  label: string;
  subLabel: string;
  value: number;
  icon: LucideIcon;
};

function StatCell({ label, subLabel, value, icon: Icon }: Stat) {
  return (
    <div className="bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={20} strokeWidth={1.5} className="shrink-0" />
        <p className="text-sm text-gray-500">{label}</p>
      </div>

      <p className="text-3xl font-semibold">{value}</p>

      <p className="mt-1 text-sm text-gray-400">{subLabel}</p>
    </div>
  );
}

function RoomSummaryPanel({
  services,
  queues,
  roomLabel,
  onViewServices,
}: RoomSummaryPanelProps) {
  const active = true;

  const serviceStats: Stat[] = [
    {
      label: "All",
      subLabel: "In this room",
      value: services.length,
      icon: Layers,
    },
    {
      label: "Active",
      subLabel: "Available now",
      value: services.filter((service) => service.active).length,
      icon: CircleCheck,
    },
    {
      label: "Inactive",
      subLabel: "Not available",
      value: services.filter((service) => !service.active).length,
      icon: CircleOff,
    },
  ];

  const queueStats: Stat[] = [
    {
      label: "Priority",
      subLabel: "Priority patients",
      value: queues.filter((queue) => queue.is_priority).length,
      icon: FileExclamationPoint,
    },
    {
      label: "Serving",
      subLabel: "Being served",
      value: queues.filter(
        (queue) => queue.status.toLocaleLowerCase() === "serving",
      ).length,
      icon: ListStart,
    },
    {
      label: "Waiting",
      subLabel: "Currently waiting",
      value: queues.filter(
        (queue) => queue.status.toLocaleLowerCase() === "waiting",
      ).length,
      icon: Loader,
    },
    {
      label: "Collected",
      subLabel: "Completed",
      value: queues.filter(
        (queue) => queue.status.toLocaleLowerCase() === "Completed",
      ).length,
      icon: FileCheck,
    },
  ];

  return (
    <section className="w-full overflow-hidden rounded-2xl border border-gray-300 bg-gray-300">
      <div className="flex flex-col gap-px">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white px-5 py-4">
          <div className="flex items-center gap-4">
            <img
              src="/assets/images/reyna-g-logo.png"
              alt="Reyna G Diagnostic Laboratory"
              className="h-16 w-16 shrink-0 object-contain"
            />
            <div>
              <p className="text-sm text-gray-500">You are in</p>
              <h2 className="text-2xl font-semibold">{roomLabel}</h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${active ? "bg-green-600" : "bg-red-600"}`}
              />
              {active ? "Active" : "Inactive"}
            </span>
            <span className="text-gray-400">
              Last Update:{" "}
              {new Date().toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}{" "}
              {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-px lg:grid-cols-[3fr_4fr]">
          <div className="flex flex-col gap-px">
            <div className="flex flex-wrap items-center justify-between gap-x-4 bg-white px-5 py-3">
              <h3 className="text-sm font-semibold">
                Services Offered in this Room
              </h3>
              <button
                type="button"
                onClick={onViewServices}
                className="cursor-pointer text-sm text-sky-700 hover:underline"
              >
                View All Services
              </button>
            </div>
            <div className="grid flex-1 grid-cols-1 gap-px sm:grid-cols-3">
              {serviceStats.map((stat) => (
                <StatCell key={stat.label} {...stat} />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-px">
            <div className="bg-white px-5 py-3">
              <h3 className="text-sm font-semibold">Queue Summary</h3>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-px sm:grid-cols-4">
              {queueStats.map((stat) => (
                <StatCell key={stat.label} {...stat} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default RoomSummaryPanel;

import { ChevronRight, Layers } from "lucide-react";

export type ServiceStatusFilter = "all" | "active" | "inactive";

type RoomSummaryPanelProps = {
  roomLabel: string;
  // Opens the role's own services modal (counts and filters live there).
  onViewServices: (filter: ServiceStatusFilter) => void;
};

// One card: the room on the left, a button to its services on the right.
function RoomSummaryPanel({ roomLabel, onViewServices }: RoomSummaryPanelProps) {
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
    <section className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-300 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <img
          src="/assets/images/reyna-g-logo.png"
          alt="Reyna G Diagnostic Laboratory"
          className="h-10 w-10 shrink-0 object-contain"
        />
        <div>
          <p className="text-xs text-gray-500">You are in</p>
          <h2 className="text-lg font-semibold leading-tight">{roomLabel}</h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs">
            <span className="flex items-center gap-1.5">
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
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onViewServices("all")}
        aria-haspopup="dialog"
        className="group flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm cursor-pointer transition-colors hover:border-sky-300 hover:bg-sky-50 active:bg-sky-100"
      >
        <Layers size={16} strokeWidth={1.75} className="text-gray-500 group-hover:text-sky-700" />
        <span className="font-medium group-hover:text-sky-700">Services Offered in this Room</span>
        <ChevronRight
          size={16}
          className="text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-700"
        />
      </button>
    </section>
  );
}

export default RoomSummaryPanel;

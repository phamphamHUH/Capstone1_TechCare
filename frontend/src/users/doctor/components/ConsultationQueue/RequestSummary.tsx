import { useState } from "react";
// import ServiceModal from "./ServiceModal";
import type { Queue } from "../../../../interface/Queue";
import type { Service } from "../../../../interface/Service";
import ServiceModal from "./ServicesModal";

type RequestSummaryProps = {
  services: Service[];
  queues: Queue[];
  room: string;
};

function RequestSummary({ services, queues, room }: RequestSummaryProps) {
  const active = true;
  const [openServiceModal, setOpenServiceModal] = useState(false);

  // COUNTS FOR SERVICE AND QUEUE SUMMARY
  const serviceCounts = services.reduce(
    (counts, service) => {
      counts.All += 1;

      if (service.active) {
        counts.Active += 1;
      }

      if (!service.active) {
        counts.Inactive += 1;
      }

      return counts;
    },
    {
      All: 0,
      Active: 0,
      Inactive: 0,
    },
  );
  console.log(
    "RequestSummary queues:",
    typeof queues,
    Array.isArray(queues),
    queues,
  );

  const queueCounts = queues.reduce(
    (counts, queue) => {
      if (queue.is_priority) {
        counts.Priority += 1;
      }
      if (queue.status === "Serving") {
        counts.Serving += 1;
      }
      if (queue.status === "Waiting") {
        counts.Waiting += 1;
      }
      if (queue.status === "Completed") {
        counts.Collected += 1;
      }
      return counts;
    },
    {
      Priority: 0,
      Serving: 0,
      Waiting: 0,
      Collected: 0,
    },
  );

  // SERVICE AND QUEUE ARRAYS FOR DESIGN DEFINITIONS
  const serviceStatuses = [
    {
      label: "All",
      count: serviceCounts.All,
      shapeColors: " border-blue-600",
    },
    {
      label: "Active",
      count: serviceCounts.Active,
      shapeColors: "border-green-600",
    },
    {
      label: "Inactive",
      count: serviceCounts.Inactive,
      shapeColors: " border-yellow-600",
    },
  ];

  const queueStatuses = [
    {
      label: "Priority",
      count: queueCounts.Priority,
      shapeColors: "border-red-600",
    },
    {
      label: "Serving",
      count: queueCounts.Serving,
      shapeColors: "border-green-600",
    },
    {
      label: "Waiting",
      count: queueCounts.Waiting,
      shapeColors: " border-blue-600",
    },
    {
      label: "Collected",
      count: queueCounts.Collected,
      shapeColors: " border-yellow-600",
    },
  ];

  return (
    <div className="w-full h-52 border rounded-3xl border-gray-300 flex items-center justify-around">
      <div className="flex gap-7">
        <div className="w-24 h-24 bg-blue-100 rounded-full"></div>
        <div>
          <h3 className="text-lg text-gray-500">You are in</h3>
          <h1 className="text-3xl font-bold">{room}</h1>
          <div className="flex items-end gap-2 mt-2">
            <div
              className={`flex items-center rounded-sm px-5 py-1 text-xs border-2  ${
                active
                  ? "text-green-600 bg-green-100 border border-green-600"
                  : "text-red-600 bg-red-100 border border-red-600"
              }`}
            >
              {active ? "Active" : "Inactive"}
            </div>
            <h6 className="text-xs text-gray-500">
              Last Update:{" "}
              {new Date().toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}{" "}
              {new Date().toLocaleDateString()}
            </h6>
          </div>
        </div>
      </div>
      <div className="border-l border-r border-gray-300 flex flex-col gap-5 px-5">
        <div className="flex gap-2">
          <h3>Services Offered in this Room:</h3>
          <h3
            className="underline text-blue-400 cursor-pointer"
            onClick={() => setOpenServiceModal(true)}
          >
            View All Services
          </h3>
        </div>

        {/* LOADS EACH SERVICE STATUS SUMMARY */}
        <div className="flex items-center justify-around">
          {serviceStatuses.map(({ label, count, shapeColors }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div
                className={`rounded-sm border px-9 py-1 font-semibold ${shapeColors}`}
              >
                {count}
              </div>
              <h3 className="text-xs">{label}</h3>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="font-bold text-gray-600">Queue Summary</h3>

        {/* LOADS EACH QUEUE STATUS SUMMARY */}
        <div className="flex items-center justify-around w-80">
          {queueStatuses.map(({ label, count, shapeColors }, index) => (
            <div
              key={index}
              className={`${shapeColors} border font-semibold w-16 h-16 rounded-sm flex flex-col items-center justify-center`}
            >
              <h3 className="text-lg font-bold">{count}</h3>
              <h3 className="text-[10px]  font-light">{label}</h3>
            </div>
          ))}
        </div>
      </div>

      {/* SERVICE MODAL FOR SERVICES OFFERED IN SPECIFIC LAB ROOM */}
      {openServiceModal && (
        <ServiceModal
          services={services}
          room={room}
          onClose={() => setOpenServiceModal(false)}
        />
      )}
    </div>
  );
}

export default RequestSummary;

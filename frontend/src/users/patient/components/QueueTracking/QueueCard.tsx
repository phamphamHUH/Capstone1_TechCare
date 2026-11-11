import { Clock3, Info, type LucideIcon } from "lucide-react";
import type { PatientQueueEntry } from "../../../../interface/PatientPortal";
import PortalStatus from "../PortalStatus";

export type QueueGroup = {
  id: string;
  title: string;
  description: string;
  Icon: LucideIcon;
};

function queueNumber(number: number, type: string) {
  return (
    (type === "laboratory" ? "L-" : "C-") + String(number).padStart(3, "0")
  );
}

export default function QueueCard({
  group,
  queue,
  awaitingResults,
}: {
  group: QueueGroup;
  queue?: PatientQueueEntry;
  awaitingResults: number;
}) {
  const { Icon } = group;
  const release = group.id === "release";
  const status = release
    ? awaitingResults
      ? "Awaiting release"
      : "No pending results"
    : queue?.status || "Not queued";
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-500">
            <Icon size={22} strokeWidth={1.7} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900">{group.title}</h2>
            <p className="mt-1 text-xs text-gray-500">{group.description}</p>
          </div>
        </div>
        {release && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs text-sky-600">
            <Info size={14} />
            Result collection
          </span>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-sky-100 bg-sky-50 p-3">
          <p className="text-xs font-medium text-sky-600">Now Serving</p>
          <p className="my-1 break-words text-3xl font-bold text-gray-900">
            {!release && queue?.now_serving.length
              ? queue.now_serving
                  .map((number) => queueNumber(number, queue.service_type))
                  .join(" / ")
              : "—"}
          </p>
          <p className="text-xs text-gray-600">
            {release
              ? "Ask laboratory staff about collection."
              : queue?.service_name || "No active queue for this service."}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {queue?.room ||
              (release
                ? "Collection window not assigned"
                : "Room not assigned")}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 p-3">
          <p className="text-xs font-medium text-gray-500">Your Queue Number</p>
          <p className="my-1 text-3xl font-bold text-gray-900">
            {queue ? queueNumber(queue.queue_number, queue.service_type) : "—"}
          </p>
          <p className="text-xs text-gray-600">
            {release
              ? "No release queue number assigned"
              : queue?.service_name || "No active queue number"}
          </p>
          <p className="mt-1 text-xs text-gray-500">{queue?.room || ""}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-3">
          <p className="mb-2 text-xs font-medium text-gray-600">Your Status</p>
          <PortalStatus status={status} />
          {release ? (
            <p className="mt-2 text-xs text-gray-600">
              {awaitingResults} result{awaitingResults === 1 ? "" : "s"}{" "}
              awaiting release
            </p>
          ) : queue ? (
            <>
              <p className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                <Clock3 size={16} />
                {queue.requests_ahead} request
                {queue.requests_ahead === 1 ? "" : "s"} ahead
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Estimated waiting time unavailable.
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs text-gray-500">
              Your queue details appear after registration at the front desk.
            </p>
          )}
        </div>
      </div>
      <p className="mt-3 flex items-start gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-600">
        <Info size={15} className="mt-0.5 shrink-0" />
        {release
          ? "Please confirm result availability with the laboratory staff before collection."
          : queue?.status === "serving"
            ? "Your number is being served. Please proceed to the assigned room."
            : "Please wait for your number to be called, then proceed to the assigned room."}
      </p>
    </section>
  );
}

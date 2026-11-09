import EmptyState from "../../../../components/EmptyState";
import { FlaskConical, Stethoscope } from "lucide-react";
import type { QueueEntry } from "../../../../interface/Queue";

export default function RoomInfo({
  queues,
  loadFailed,
}: {
  queues: QueueEntry[];
  loadFailed?: boolean;
}) {
  const rooms = [
    ...new Set(queues.map((queue) => queue.room).filter(Boolean)),
  ].sort();
  return (
    <aside className="flex flex-col gap-4" aria-label="Room queue status">
      {["Laboratory", "Consultation"].map((type) => {
        const names = rooms.filter((room) =>
          queues.some(
            (queue) =>
              queue.room === room &&
              queue.service_type?.toLowerCase() === type.toLowerCase(),
          ),
        );
        return (
          <section key={type} className="rounded-xl border border-gray-200 p-4">
            <h2 className="mb-3 font-semibold">{type} Rooms</h2>
            {names.length ? (
              names.map((room) => {
                const entries = queues.filter((queue) => queue.room === room);
                const serving = entries.some((queue) =>
                  ["in service", "serving", "in progress"].includes(
                    queue.status.toLowerCase(),
                  ),
                );
                const waiting = entries.filter(
                  (queue) => queue.status.toLowerCase() === "waiting",
                ).length;
                const Icon = type === "Laboratory" ? FlaskConical : Stethoscope;
                return (
                  <div
                    key={room}
                    className={`mb-2 flex items-center justify-between gap-3 rounded-lg border p-3 text-xs ${serving ? "border-amber-200 bg-amber-50 text-amber-800" : "border-blue-100 bg-blue-50 text-blue-800"}`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon size={16} />
                      {room}
                    </span>
                    <span className="text-right">
                      {serving ? "In Service" : "No active service"}
                      <small className="mt-1 block">{waiting} waiting</small>
                    </span>
                  </div>
                );
              })
            ) : (
              <EmptyState
                message={
                  loadFailed
                    ? "Room queues are unavailable."
                    : "No room queues recorded today."
                }
              />
            )}
          </section>
        );
      })}
    </aside>
  );
}

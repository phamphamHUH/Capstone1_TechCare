import { FlaskConical, User } from "lucide-react";
import EmptyState from "../../../../components/EmptyState";
import type { RoomQueue } from "./utils/dashboardSummary";

// Today's queue per room: waiting / being served / done.
function RoomQueues({
  rooms,
  loadFailed,
}: {
  rooms: RoomQueue[];
  loadFailed: boolean;
}) {
  if (rooms.length === 0) {
    return (
      <EmptyState
        compact
        message={loadFailed ? "Queues are unavailable." : "No queue entries today."}
      />
    );
  }

  return (
    <ul className="max-h-80 overflow-y-auto overscroll-contain pr-1 divide-y divide-gray-100">
      {rooms.map((room) => {
        const lab = room.type === "laboratory";
        const Icon = lab ? FlaskConical : User;
        return (
          <li
            key={room.room}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0"
          >
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                lab ? "bg-emerald-50 text-emerald-600" : "bg-sky-50 text-sky-600"
              }`}
            >
              <Icon size={18} />
            </span>
            <span className="min-w-0 flex-1 truncate font-medium text-gray-900">
              {room.room}
            </span>
            <span className="flex flex-wrap gap-2 text-xs">
              <span className="rounded bg-amber-50 px-2 py-1 text-amber-700">
                {room.waiting} waiting
              </span>
              <span className="rounded bg-green-50 px-2 py-1 text-green-700">
                {room.serving} serving
              </span>
              <span className="rounded bg-gray-100 px-2 py-1 text-gray-600">
                {room.completed} done
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default RoomQueues;

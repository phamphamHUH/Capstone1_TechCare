import { Activity } from "lucide-react";
import type { QueueEntry } from "../../../../interface/Queue";

const isServing = (q: QueueEntry) =>
  ["serving", "in service", "in progress"].includes(q.status.toLowerCase());
const isWaiting = (q: QueueEntry) =>
  ["waiting", "skipped"].includes(q.status.toLowerCase());

// Live view of every lab and consultation room: who is being served now and
// who is waiting. The dashboard reloads `queues` on every queue-stream signal.
function RoomActivity({ queues }: { queues: QueueEntry[] }) {
  // A lab queue can appear once per test, so keep one row per queue entry.
  const entries = [...new Map(queues.map((q) => [q.queue_id, q])).values()];

  const rooms = new Map<string, QueueEntry[]>();
  for (const q of entries) {
    if (!q.room || !(isServing(q) || isWaiting(q))) continue;
    rooms.set(q.room, [...(rooms.get(q.room) ?? []), q]);
  }

  return (
    <section className="bg-white border border-gray-300 rounded-md overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-300">
        <Activity size={20} strokeWidth={1.5} />
        <div>
          <h2 className="text-lg font-semibold">Current Activity</h2>
          <p className="text-sm text-gray-500 mt-1">
            Laboratory and consultation rooms, live
          </p>
        </div>
      </div>

      {rooms.size === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-gray-500">
          No patients in any room right now.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-6">
          {[...rooms]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([room, list]) => {
              const serving = list.filter(isServing);
              const waiting = list
                .filter(isWaiting)
                .sort(
                  (a, b) =>
                    Number(b.is_priority) - Number(a.is_priority) ||
                    a.queue_number - b.queue_number,
                );

              return (
                <div
                  key={room}
                  className="rounded-md border border-gray-200 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold truncate">{room}</h3>
                    <span className="shrink-0 text-xs text-gray-500">
                      {list[0].queue_id.startsWith("LAB-")
                        ? "Laboratory"
                        : "Consultation"}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-gray-500">Now serving</p>
                  {serving.length ? (
                    serving.map((q) => (
                      <p
                        key={q.queue_id}
                        className="text-sm font-medium text-green-700"
                      >
                        #{q.queue_number} {q.patient_name}
                      </p>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400">No one</p>
                  )}

                  <p className="mt-3 text-xs text-gray-500">
                    Waiting ({waiting.length})
                  </p>
                  {waiting.slice(0, 3).map((q) => (
                    <p key={q.queue_id} className="text-sm text-gray-700">
                      #{q.queue_number} {q.patient_name}
                      {q.is_priority && (
                        <span className="ml-1 text-xs text-amber-700">
                          Priority
                        </span>
                      )}
                      {q.status.toLowerCase() === "skipped" && (
                        <span className="ml-1 text-xs text-violet-700">
                          Skipped
                        </span>
                      )}
                    </p>
                  ))}
                  {waiting.length > 3 && (
                    <p className="text-xs text-gray-400">
                      +{waiting.length - 3} more
                    </p>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </section>
  );
}

export default RoomActivity;

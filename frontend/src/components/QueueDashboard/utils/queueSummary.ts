// Counts and helpers for a room's queue on the staff dashboards
// (doctor and laboratory staff). Works on today's queue entries for one room.

export type DashboardQueueEntry = {
  queue_id: string;
  patient_name?: string;
  status: string;
  is_priority: boolean;
  created_at: string;
  service_name?: string;
};

// The database has both "Waiting" and "waiting", so compare lowercase.
export const statusOf = (entry: DashboardQueueEntry) =>
  (entry.status ?? "").trim().toLowerCase();

export function summarizeQueue<T extends DashboardQueueEntry>(entries: T[]) {
  // Skipped patients are still in line, just moved back.
  const waiting = entries.filter((entry) =>
    ["waiting", "skipped"].includes(statusOf(entry)),
  );
  const serving = entries.filter((entry) => statusOf(entry) === "serving");
  const completed = entries.filter((entry) => statusOf(entry) === "completed");

  return {
    waiting,
    serving,
    completedCount: completed.length,
    priorityWaitingCount: waiting.filter((entry) => entry.is_priority).length,
  };
}

// "Just now", "12m", "1h 05m" since the entry joined the queue.
export function waitedFor(createdAt: string, now: number = Date.now()) {
  const minutes = Math.floor((now - new Date(createdAt).getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

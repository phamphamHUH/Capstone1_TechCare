// Small helpers for the admin dashboard (today's clinic overview).
import type { QueueEntry } from "../../../../../interface/Queue";
import type { User } from "../../../../../interface/User";

// The database has both "Waiting" and "waiting", so compare lowercase.
export const statusOf = (entry: { status?: string | null }) =>
  (entry.status ?? "").trim().toLowerCase();

export const isWaiting = (entry: QueueEntry) =>
  ["waiting", "skipped"].includes(statusOf(entry));

export type RoomQueue = {
  room: string;
  type: string; // "consultation" | "laboratory" | ...
  waiting: number;
  serving: number;
  completed: number;
};

// Today's queue entries grouped by room, consultation rooms first.
export function groupByRoom(entries: QueueEntry[]): RoomQueue[] {
  const rooms = new Map<string, RoomQueue>();
  for (const entry of entries) {
    const room = entry.room || "Unassigned";
    const current = rooms.get(room) ?? {
      room,
      type: (entry.service_type ?? "").toLowerCase(),
      waiting: 0,
      serving: 0,
      completed: 0,
    };
    if (isWaiting(entry)) current.waiting += 1;
    else if (statusOf(entry) === "serving") current.serving += 1;
    else if (statusOf(entry) === "completed") current.completed += 1;
    rooms.set(room, current);
  }
  return [...rooms.values()].sort(
    (a, b) =>
      Number(a.type !== "consultation") - Number(b.type !== "consultation") ||
      a.room.localeCompare(b.room),
  );
}

// Active staff accounts only (deactivated accounts are left out).
export const activeStaff = (users: User[]) =>
  users.filter((user) => user.account_status !== false);

export const fullName = (user: User) =>
  `${user.first_name} ${user.last_name}`.trim();

// "Just now", "5m ago", "2h ago", or the date for older entries.
export function timeAgo(value: string, now: number = Date.now()) {
  const minutes = Math.floor((now - new Date(value).getTime()) / 60_000);
  if (!Number.isFinite(minutes)) return "";
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h ago`;
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

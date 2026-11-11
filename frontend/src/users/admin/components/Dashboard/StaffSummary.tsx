import EmptyState from "../../../../components/EmptyState";
import type { User } from "../../../../interface/User";
import { roleLabel } from "../UserManagement/utils/userCardUtils";
import { activeStaff } from "./utils/dashboardSummary";

// Staff accounts per role and how many of them are signed in right now.
function StaffSummary({ users, loadFailed }: { users: User[]; loadFailed: boolean }) {
  const staff = activeStaff(users);
  const roles = new Map<string, { total: number; online: number }>();
  for (const user of staff) {
    const current = roles.get(user.role) ?? { total: 0, online: 0 };
    current.total += 1;
    if (user.active) current.online += 1;
    roles.set(user.role, current);
  }

  if (roles.size === 0) {
    return (
      <EmptyState
        compact
        message={loadFailed ? "Staff accounts are unavailable." : "No staff accounts yet."}
      />
    );
  }

  return (
    <ul className="max-h-80 overflow-y-auto overscroll-contain pr-1 space-y-3">
      {[...roles.entries()]
        .sort(([a], [b]) => roleLabel(a).localeCompare(roleLabel(b)))
        .map(([role, counts]) => (
          <li key={role} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-gray-700">{roleLabel(role)}</span>
            <span className="flex items-center gap-3 tabular-nums">
              <span className="inline-flex items-center gap-1.5 text-green-700">
                <span className="size-2 rounded-full bg-green-500" aria-hidden="true" />
                {counts.online} online
              </span>
              <span className="text-gray-400">of {counts.total}</span>
            </span>
          </li>
        ))}
    </ul>
  );
}

export default StaffSummary;

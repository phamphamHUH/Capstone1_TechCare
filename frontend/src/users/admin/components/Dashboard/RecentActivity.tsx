import { ShieldAlert } from "lucide-react";
import EmptyState from "../../../../components/EmptyState";
import type { Activity } from "../../../../interface/Activity";
import { timeAgo } from "./utils/dashboardSummary";

// The list scrolls inside its card, so it can show more than fits.
const LIMIT = 30;

// Latest activity log entries, newest first, with who did them.
function RecentActivity({
  activities,
  nameOf,
  loadFailed,
}: {
  activities: Activity[];
  nameOf: (userId: string) => string;
  loadFailed: boolean;
}) {
  const latest = [...activities]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, LIMIT);

  if (latest.length === 0) {
    return (
      <EmptyState
        compact
        message={loadFailed ? "Activity logs are unavailable." : "No activity yet."}
      />
    );
  }

  return (
    <ol className="max-h-80 overflow-y-auto overscroll-contain pr-1 divide-y divide-gray-100">
      {latest.map((activity, index) => (
        <li
          key={activity.id ?? `${activity.created_at}-${index}`}
          className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
        >
          <span
            className={`mt-1.5 size-2 shrink-0 rounded-full ${
              activity.is_sensitive ? "bg-red-500" : "bg-sky-400"
            }`}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-900">
              <span className="font-medium">{nameOf(activity.user_id)}</span>{" "}
              <span className="text-gray-600">
                {activity.action_description || activity.action_name}
              </span>
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-400">
              {activity.module && <span>{activity.module}</span>}
              {activity.is_sensitive && (
                <span className="inline-flex items-center gap-1 text-red-600">
                  <ShieldAlert size={12} /> Sensitive
                </span>
              )}
            </p>
          </div>
          <span className="shrink-0 text-xs text-gray-400 tabular-nums">
            {timeAgo(activity.created_at)}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default RecentActivity;

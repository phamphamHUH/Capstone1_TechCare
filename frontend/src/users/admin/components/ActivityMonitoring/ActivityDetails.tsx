import { CalendarDays, Clock3, FileText, Folder, UserRound } from "lucide-react";
import type { Activity } from "../../../../interface/Activity.ts";

type ActivityDetailsProps = {
  activity: Activity | undefined;
};

function getMetadataEntries(metadata: Activity["metadata"]) {
  if (!metadata) return [];

  try {
    const parsed = JSON.parse(metadata);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.entries(parsed) as [string, unknown][];
    }
  } catch {
    // Some activity records may contain plain text instead of JSON.
  }

  return [["Details", metadata]] as [string, unknown][];
}

function ActivityDetails({ activity }: ActivityDetailsProps) {
  if (!activity) {
    return (
      <aside className="flex min-h-105 w-full min-w-0 flex-col rounded-xl border border-gray-200 bg-white lg:w-[300px] xl:w-[320px]">
        <div className="border-b border-gray-100 px-4 py-4">
          <h3 className="text-base font-semibold text-gray-700">Activity Details</h3>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-400">
          No activity selected.
        </div>
      </aside>
    );
  }

  const createdAt = new Date(activity.created_at);
  const isCritical = activity.is_sensitive === true;
  const metadataEntries = getMetadataEntries(activity.metadata);

  return (
    <aside className="flex min-h-105 w-full min-w-0 flex-col rounded-xl border border-gray-200 bg-white lg:w-[300px] xl:w-[320px]">
      <div className="border-b border-gray-100 px-4 py-4">
        <h3 className="text-base font-semibold text-gray-700">Activity Details</h3>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-200 text-sky-600">
            <UserRound size={23} strokeWidth={1.7} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-700">
              {activity.user_id}
            </p>
            <p className="text-xs text-gray-400">User ID</p>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold text-gray-500">Date and Time</p>
          <div className="space-y-1 text-xs text-gray-500">
            <p className="flex items-center gap-2">
              <CalendarDays size={14} />
              {createdAt.toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p className="flex items-center gap-2">
              <Clock3 size={14} />
              {createdAt.toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold text-gray-500">Module</p>
          <p className="flex items-center gap-2 text-xs text-gray-500">
            <Folder size={14} />
            {activity.module || "—"}
          </p>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold text-gray-500">Action</p>
          <p className="text-xs text-gray-500">{activity.action_name || "—"}</p>
        </div>

        {activity.target_id && (
          <div>
            <p className="mb-1 text-xs font-semibold text-gray-500">Target ID</p>
            <p className="text-xs text-gray-500">{activity.target_id}</p>
          </div>
        )}

        <div>
          <p className="mb-1 text-xs font-semibold text-gray-500">Details</p>
          <div className="max-h-28 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-2.5 text-[11px] leading-4 text-gray-600">
            {activity.action_description && (
              <p className="mb-2">{activity.action_description}</p>
            )}
            {metadataEntries.length > 0 ? (
              metadataEntries.map(([key, value]) => (
                <p key={key} className="mb-1 last:mb-0">
                  <span className="font-medium">{key}:</span> {String(value)}
                </p>
              ))
            ) : !activity.action_description ? (
              <p className="flex items-center gap-2 text-gray-400">
                <FileText size={13} /> No additional details
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold text-gray-500">Severity</p>
          <p className={isCritical ? "text-xs font-medium text-red-500" : "text-xs font-medium text-green-500"}>
            {isCritical ? "Critical" : "Low"}
          </p>
        </div>
      </div>
    </aside>
  );
}

export default ActivityDetails;

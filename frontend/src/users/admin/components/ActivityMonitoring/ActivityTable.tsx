import type { Dispatch, SetStateAction } from "react";
import type { Activity } from "../../../../interface/Activity.ts";

type ActivityTableProps = {
  activities: Activity[];
  selectedActivityId: number | null;
  setSelectedForm: Dispatch<SetStateAction<number | null>>;
  setShowActivityDetails: Dispatch<SetStateAction<boolean>>;
};

function ActivityTable({
  activities,
  selectedActivityId,
  setSelectedForm,
  setShowActivityDetails,
}: ActivityTableProps) {
  const selectActivity = (activity: Activity) => {
    if (activity.id === null) return;
    setSelectedForm(activity.id);
    setShowActivityDetails(true);
  };

  return (
    <div className="h-105 overflow-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-245 w-full text-sm">
        <thead className="sticky top-0 z-10 bg-white text-gray-500">
          <tr className="border-b border-gray-100">
            <th className="px-4 py-3 text-left font-medium">Date and Time</th>
            <th className="px-4 py-3 text-left font-medium">User</th>
            <th className="px-4 py-3 text-left font-medium">Action</th>
            <th className="px-4 py-3 text-left font-medium">Target ID</th>
            <th className="px-4 py-3 text-left font-medium">Module</th>
            <th className="px-4 py-3 text-left font-medium">Details</th>
          </tr>
        </thead>

        <tbody>
          {activities.length > 0 ? (
            activities.map((activity) => {
              const createdAt = new Date(activity.created_at);
              const isSelected = activity.id === selectedActivityId;
              const isCritical = activity.is_sensitive ? true : false;

              return (
                <tr
                  key={activity.id}
                  onClick={() => selectActivity(activity)}
                  className={`cursor-pointer border-t transition-colors ${
                    isSelected ? "bg-sky-50" : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-gray-800">
                      {createdAt.toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>

                    <div className="text-[11px] text-gray-400">
                      {createdAt.toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </div>
                  </td>

                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-200 text-xs font-semibold text-sky-700">
                        {String(activity.user_id).charAt(0).toUpperCase() || "U"}
                      </span>
                      <div>
                        <div className="font-medium text-gray-700">
                          {activity.user_id}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          User ID
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 align-top text-gray-700">
                    {activity.action_name}
                  </td>

                  <td className="px-4 py-3 align-top text-gray-700">
                    {activity.module}
                  </td>

                  <td className="px-4 py-3 align-top">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectActivity(activity);
                      }}
                      className="text-xs font-medium text-gray-500 underline underline-offset-2 hover:text-sky-600"
                    >
                      View Details
                    </button>
                  </td>

                  <td className="px-4 py-3 align-top">
                    <span
                      className={
                        isCritical
                          ? "font-semibold text-red-500"
                          : "font-semibold text-green-500"
                      }
                    >
                      {isCritical ? "Critical" : "Low"}
                    </span>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={6} className="px-4 py-16 text-center text-gray-400">
                No activities found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ActivityTable;

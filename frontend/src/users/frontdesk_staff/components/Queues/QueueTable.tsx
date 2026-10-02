import type { QueueEntry } from "../../../../interface/Queue";
import { Trash2 } from "lucide-react";

type QueueTableProps = {
  queues: QueueEntry[];
};

const parseDateOnly = (value: string) => {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};

const getAge = (birthdate?: string | null) => {
  if (!birthdate) return null;
  const dob = parseDateOnly(birthdate);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hadBirthday =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hadBirthday) age--;
  return age;
};

const statusStyles: Record<string, string> = {
  waiting: "bg-orange-100 text-orange-600",
  "in service": "bg-sky-100 text-sky-600",
  completed: "bg-green-100 text-green-600",
  cancelled: "bg-gray-100 text-gray-500",
};

function QueueTable({ queues }: QueueTableProps) {
  return (
    <div className="max-h-105 overflow-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <colgroup>
          <col className="w-1/30" />
          <col className="w-9/30" />
          <col className="w-5/30" />
          <col className="w-5/30" />
          <col className="w-5/30" />
          <col className="w-3/30" />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-gray-100 text-gray-500">
          <tr className="border-b border-gray-200">
            <th className="px-4 py-3 text-left font-medium">No.</th>
            <th className="px-4 py-3 text-left font-medium">Patient</th>
            <th className="px-4 py-3 text-left font-medium">Service</th>
            <th className="px-4 py-3 text-left font-medium">Priority</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Action</th>
          </tr>
        </thead>

        <tbody>
          {queues.length > 0 ? (
            queues.map((entry) => {
              const age = getAge(entry.birthdate);
              const statusClass =
                statusStyles[entry.status.toLowerCase()] ??
                "bg-gray-100 text-gray-600";

              return (
                <tr
                  key={entry.id}
                  className="border-b border-gray-200 transition-colors hover:bg-gray-50"
                >
                  <td className="px-4 py-3 align-top font-bold text-gray-800">
                    {entry.queue_number}
                  </td>

                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium text-gray-700">
                          {entry.patient_name}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {entry.patient_id}
                          {age !== null && ` · ${age} yrs`}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-gray-700">
                      {entry.service_name}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {entry.service_category}
                    </div>
                  </td>

                  <td className="px-4 py-3 align-top">
                    {entry.is_priority ? (
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                        Priority
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Regular</span>
                    )}
                  </td>

                  <td className="px-4 py-3 align-top">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass}`}
                    >
                      {entry.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 align-top">
                    <div className="text-[11px] text-gray-400">
                      <button>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                No queue entries found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default QueueTable;

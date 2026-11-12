import EmptyState from "../../../../components/EmptyState";
import ErrorMessage from "../../../../components/ErrorMessage";
import type { QueueEntry } from "../../../../interface/Queue";
import { Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import api from "../../../../lib/axios";

type QueueTableProps = {
  queues: QueueEntry[];
  onRefresh: () => Promise<void>;
  loadFailed?: boolean;
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

function QueueTable({ queues, onRefresh, loadFailed }: QueueTableProps) {
  const [cancelEntry, setCancelEntry] = useState<QueueEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  async function cancel() {
    if (!cancelEntry || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await api.delete(
        `/api/fdstaff/queues/${encodeURIComponent(cancelEntry.queue_id)}`,
      );
      setCancelEntry(null);
      await onRefresh();
    } catch (cause) {
      const response = cause as {
        response?: { data?: { error?: string; message?: string } };
      };
      setError(
        response.response?.data?.message ||
          response.response?.data?.error ||
          "The queue entry could not be cancelled.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      {error && <ErrorMessage className="mb-3">{error}</ErrorMessage>}
      <div className="max-h-105 overflow-auto rounded-md border border-gray-200 bg-white">
        <table className="min-w-[760px] w-full text-sm">
          <colgroup>
            <col className="w-4/30" />
            <col className="w-7/30" />
            <col className="w-6/30" />
            <col className="w-4/30" />
            <col className="w-4/30" />
            <col className="w-3/30" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-gray-100 text-gray-500">
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left font-medium">No.</th>
              <th className="px-4 py-3 text-left font-medium">Patient</th>
              <th className="px-4 py-3 text-left font-medium">Room</th>
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
                    <td className="text-xs px-4 py-3 align-top text-gray-800">
                      {entry.queue_id}
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
                      <div className="text-gray-700">{entry.room}</div>
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
                        <button
                          type="button"
                          aria-label={`Cancel queue ${entry.queue_id}`}
                          title={
                            entry.status.toLowerCase() === "waiting"
                              ? "Cancel waiting entry"
                              : "Only waiting entries can be cancelled"
                          }
                          disabled={
                            entry.status.toLowerCase() !== "waiting" || busy
                          }
                          className="cursor-pointer text-red-600 disabled:cursor-not-allowed disabled:text-gray-300"
                          onClick={() => {
                            setError("");
                            setCancelEntry(entry);
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="p-4">
                  <EmptyState
                    compact
                    message={
                      loadFailed
                        ? "Queue entries are unavailable."
                        : "No queue entries found."
                    }
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {cancelEntry && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-queue-title"
            className="w-full max-w-md rounded-md bg-white p-6 shadow-xl"
          >
            <h2 id="cancel-queue-title" className="text-lg font-semibold">
              Cancel waiting entry?
            </h2>
            <p className="my-4 text-sm text-gray-600">
              Cancel {cancelEntry.queue_id} for {cancelEntry.patient_name}? This
              preserves the patient's records. Payments remain recorded.
            </p>
            {error && <ErrorMessage className="mb-3">{error}</ErrorMessage>}
            <div className="flex justify-end gap-3">
              <button
                autoFocus
                disabled={busy}
                onClick={() => setCancelEntry(null)}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm"
              >
                Keep Entry
              </button>
              <button
                disabled={busy}
                onClick={() => void cancel()}
                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white"
              >
                {busy ? "Cancelling…" : "Cancel Entry"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default QueueTable;

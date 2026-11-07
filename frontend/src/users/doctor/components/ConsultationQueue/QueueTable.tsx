import React, { useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { Queue } from "../../../../interface/Queue";
import api from "#lib/axios";

type QueueTableProps = {
  filterQueues: Queue[];
  setOpenInformationCard: Dispatch<SetStateAction<boolean>>;
  setQueueIdCard: Dispatch<SetStateAction<string | null>>;
  loadData: () => Promise<void>;
  room: string;
};

const PAGE_SIZE = 10;
const MAX_SKIPS = 3;

function QueueTable({
  filterQueues,
  setOpenInformationCard,
  setQueueIdCard,
  room,
  loadData,
}: QueueTableProps) {
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"accept" | "complete" | "skip"| "cancel" | null>(null);
  const requestPending = useRef(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [prevQueues, setPrevQueues] = useState(filterQueues);
  if (filterQueues !== prevQueues) {
    setPrevQueues(filterQueues);
    setPage(1);
  }

  const total = filterQueues.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, total);
  const pageQueues = filterQueues.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const runQueueRequest = async (
    queue_id: string,
    action: "accept" | "complete" | "skip" | "cancel",
    request: () => Promise<unknown>,
    fallbackMessage: string,
  ) => {
    if (requestPending.current) return;
    requestPending.current = true;

    try {
      setAcceptingId(queue_id);
      setPendingAction(action);
      setAcceptError(null);

      await request();
      await loadData();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || fallbackMessage;
      setAcceptError(message);
    } finally {
      requestPending.current = false;
      setAcceptingId(null);
      setPendingAction(null);
    }
  };

  const id = (queue_id: string) => encodeURIComponent(queue_id);

  const handleView = (queue_id: string) => {
    setQueueIdCard(queue_id);
    setOpenInformationCard(true);
  };

  const handleAccept = (queue_id: string) =>
    runQueueRequest(
      queue_id,
      "accept",
      () =>
        api.patch(`/api/doctor/consultation-queues/${id(queue_id)}/accept`, {
          room,
          action: "accept",
        }),
      "Unable to accept queue.",
    );

  const handleComplete = (queue_id: string) =>
    runQueueRequest(
      queue_id,
      "complete",
      () =>
        api.patch(`/api/doctor/consultation-queues/${id(queue_id)}/complete`, {
          room,
          action: "complete",
        }),
      "Unable to complete queue.",
    );

  const handleSkip = (queue_id: string) =>
    runQueueRequest(
      queue_id,
      "skip",
      () =>
        api.patch(`/api/doctor/consultation-queues/${id(queue_id)}/skip`, {
          room,
          action: "skip",
        }),
      "Unable to skip queue.",
    );

  // Same base as the other doctor routes; change the path if your cancel route differs
  const handleCancel = (queue_id: string) => {
  const reason = window.prompt(
    "Reason for cancelling this consultation:",
    "Skipped 3 times without responding",
  );
  if (reason === null) return; // staff closed the prompt

  const trimmed = reason.trim();
  if (!trimmed) {
    setAcceptError("A cancellation reason is required.");
    return;
  }
  if (trimmed.length > 255) {
    setAcceptError("Reason must not exceed 255 characters.");
    return;
  }

  return runQueueRequest(
    queue_id,
    "cancel",
    () =>
      api.patch(`/api/doctor/consultation-queues/${id(queue_id)}/cancel`, {
        room,
        reason: trimmed,
      }),
    "Unable to cancel queue.",
  );
};

  return (
    <>
      {acceptError && (
        <p role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {acceptError}
        </p>
      )}

      <table className="w-full table-fixed">
        <colgroup>
          <col className="w-4/40" />
          <col className="w-6/40" />
          <col className="w-7/40" />
          <col className="w-5/40" />
          <col className="w-5/40" />
          <col className="w-5/40" />
          <col className="w-8/40" />
        </colgroup>

        <thead className="bg-gray-100">
          <tr>
            <th className="px-1 py-2">Queue ID</th>
            <th className="px-1 py-2">Patient ID</th>
            <th className="px-1 py-2">Patient Name</th>
            <th className="px-1 py-2">Priority</th>
            <th className="px-1 py-2">Requested At</th>
            <th className="px-1 py-2">Status</th>
            <th className="px-1 py-2">Action</th>
          </tr>
        </thead>

        <tbody>
          {pageQueues.map((queue) => {
            const status = queue.status?.toLowerCase();
            const busy = acceptingId === queue.queue_id;

            // Skip/cancel logic lives here, where `queue` and `status` exist
            const skipsUsed = queue.skip_count ?? 0;
            const skipsExhausted = skipsUsed >= MAX_SKIPS;
            const canAct =
              status === "waiting" ||
              status === "skipped" ||
              status === "serving";

            return (
              <React.Fragment key={queue.id}>
                <tr
                  className={`border-b border-gray-300 ${
                    status === "serving" ? "bg-green-50" : ""
                  }`}
                >
                  <td className="px-1 py-3 text-center text-sm">
                    {queue.queue_id}
                  </td>

                  <td className="px-1 py-3 text-center text-sm">
                    {queue.patient_id}
                  </td>

                  <td className="wrap-break px-1 py-3 text-center text-sm">
                    {queue.patient_name || "Unknown"}
                  </td>

                  <td className="px-1 py-3 text-center text-sm">
                    {queue.is_priority ? "Priority" : "Non-priority"}
                  </td>

                  <td className="px-1 py-3 text-center text-sm">
                    {(() => {
                      const date = new Date(queue.created_at);
                      const h24 = date.getHours();
                      const m = date.getMinutes().toString().padStart(2, "0");
                      const suffix = h24 >= 12 ? "PM" : "AM";
                      const h12 = h24 % 12 || 12;

                      return `${h12}:${m} ${suffix}`;
                    })()}
                  </td>

                  <td className="px-1 py-3 text-center text-sm">
                    {queue.status}
                    {skipsUsed > 0 && (
                      <span className="ml-1 text-xs text-gray-400">
                        ({skipsUsed}/{MAX_SKIPS})
                      </span>
                    )}
                  </td>

                  <td className="px-1 py-3">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        className="cursor-pointer rounded-sm border-2 border-blue-500 px-4 py-2 text-xs text-blue-500 transition-all duration-300 hover:scale-105 hover:bg-blue-100"
                        onClick={() => handleView(queue.queue_id)}
                      >
                        View
                      </button>

                      {(status === "waiting" || status === "skipped") && (
                        <button
                          type="button"
                          disabled={acceptingId !== null}
                          onClick={() => handleAccept(queue.queue_id)}
                          className="cursor-pointer rounded-sm border-2 border-green-500 px-4 py-2 text-xs text-green-500 transition-all duration-300 hover:scale-105 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busy && pendingAction === "accept" ? "Accepting..." : "Accept"}
                        </button>
                      )}

                      {status === "serving" && (
                        <button
                          type="button"
                          disabled={acceptingId !== null}
                          onClick={() => handleComplete(queue.queue_id)}
                          className="cursor-pointer rounded-sm border-2 border-green-500 px-4 py-2 text-xs text-green-500 transition-all duration-300 hover:scale-105 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busy && pendingAction === "complete" ? "Completing..." : "Complete"}
                        </button>
                      )}

                      {(status === "waiting" || status === "serving" || status === "skipped") &&
                        !skipsExhausted && (
                          <button
                            type="button"
                            disabled={acceptingId !== null}
                            onClick={() => handleSkip(queue.queue_id)}
                            className="cursor-pointer rounded-sm border-2 border-yellow-500 px-4 py-2 text-xs text-yellow-500 transition-all duration-300 hover:scale-105 hover:bg-yellow-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {busy && pendingAction === "skip" ? "Skipping..." : "Skip"}
                          </button>
                        )}

                      {skipsExhausted && canAct && (
                        <button
                          type="button"
                          disabled={acceptingId !== null}
                          onClick={() => handleCancel(queue.queue_id)}
                          className="cursor-pointer rounded-sm border-2 border-red-500 px-4 py-2 text-xs text-red-500 transition-all duration-300 hover:scale-105 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busy && pendingAction === "cancel" ? "Cancelling..." : "Cancel"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 text-xs text-gray-500">
          <span>
            Showing {from} - {to} of {total} queues
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              &lt;
            </button>

            {pages.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg ${
                  p === currentPage
                    ? "bg-sky-500 font-bold text-white shadow-xs"
                    : "border border-gray-200 hover:bg-gray-100"
                }`}
              >
                {p}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              &gt;
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default QueueTable;

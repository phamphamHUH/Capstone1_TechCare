import ErrorMessage from "../../../../../components/ErrorMessage";
import EmptyState from "../../../../../components/EmptyState";
import LoadingScreen from "../../../../../components/LoadingScreen";
import LoadingRegion from "../../../../../components/LoadingRegion";
import React, {
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { QueueEntry } from "../../../../../interface/Queue";
import api from "#lib/axios";
import CancelationReason from "./QueueTable/CancelationReason";

type QueueTableProps = {
  filterQueues: QueueEntry[];
  setOpenInformationCard: Dispatch<SetStateAction<boolean>>;
  setQueueIdCard: Dispatch<SetStateAction<string | null>>;
  loadData: () => Promise<void>;
  room: string;
  setSelectedQueue: React.Dispatch<React.SetStateAction<QueueEntry | null>>;
  loading: boolean;
  error: string | null;
  loadFailed: boolean;
};

const PAGE_SIZE = 10;
const MAX_SKIPS = 3;

function QueueTable({
  filterQueues,
  setOpenInformationCard,
  setQueueIdCard,
  room,
  loadData,
  setSelectedQueue,
  loading,
  error,
  loadFailed,
}: QueueTableProps) {
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "accept" | "skip" | "cancel" | null
  >(null);

  const requestPending = useRef(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // PAGINATION
  const [page, setPage] = useState(1);
  const [prevQueues, setPrevQueues] = useState(filterQueues);

  if (filterQueues !== prevQueues) {
    setPrevQueues(filterQueues);
    setPage(1);
  }

  const [cancelTarget, setCancelTarget] = useState<QueueEntry | null>(null);

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

  // QUEUE REQUEST
  const runQueueRequest = async (
    queue_id: string,
    action: "accept" | "skip" | "cancel",
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

      if (action === "accept") {
        setSelectedQueue(null);
      }

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

  // VIEW QUEUE
  const handleView = (queue_id: string) => {
    setQueueIdCard(queue_id);
    setOpenInformationCard(true);
  };

  // ACCEPT QUEUE
  const handleAccept = (queue: QueueEntry) => {
    runQueueRequest(
      queue.queue_id,
      "accept",
      () =>
        api.patch(
          `/api/doctor/consultation-queues/${id(queue.queue_id)}/accept`,
          {
            room,
            action: "accept",
          },
        ),
      "Unable to accept queue.",
    );
  };

  // SKIP QUEUE
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

  // CANCEL QUEUE
  const handleCancel = (queue: QueueEntry) => setCancelTarget(queue);

  const confirmCancel = async (reason: string) => {
    if (!cancelTarget) return;

    const queue_id = cancelTarget.queue_id;
    setCancelTarget(null);

    await runQueueRequest(
      queue_id,
      "cancel",
      () =>
        api.patch(`/api/doctor/consultation-queues/${id(queue_id)}/cancel`, {
          room,
          reason,
        }),
      "Unable to cancel queue.",
    );
  };

  return (
    <>
      <LoadingRegion
        loading={loading && filterQueues.length > 0}
        message="Refreshing consultation queues..."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-190 table-fixed">
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
                <th className="px-1 py-2">Actions</th>
              </tr>
            </thead>

            <tbody>
              {/* ERROR MESSAGE */}
              {(error || acceptError) && (
                <tr>
                  <td colSpan={7} className="px-4 py-3">
                    <ErrorMessage>{acceptError || error}</ErrorMessage>
                  </td>
                </tr>
              )}

              {/* INITIAL LOADING */}
              {loading && filterQueues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center">
                    <LoadingScreen message="Loading consultation queues..." />
                  </td>
                </tr>
              ) : filterQueues.length === 0 ? (
                /* EMPTY STATE */
                <tr>
                  <td colSpan={7} className="pb-10 text-center">
                    <EmptyState
                      message={
                        loadFailed
                          ? "Consultation requests are unavailable."
                          : "No consultation requests found."
                      }
                    />
                  </td>
                </tr>
              ) : (
                /* QUEUE ROWS */
                pageQueues.map((queue) => {
                  const status = queue.status?.toLowerCase();
                  const busy = acceptingId === queue.queue_id;

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
                          {/* Same badge as the front desk queue table. */}
                          {queue.is_priority ? (
                            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                              Priority
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Non-priority
                            </span>
                          )}
                        </td>

                        <td className="px-1 py-3 text-center text-sm">
                          {(() => {
                            const date = new Date(queue.created_at);
                            const h24 = date.getHours();
                            const m = date
                              .getMinutes()
                              .toString()
                              .padStart(2, "0");

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
                              className="border text-xs border-sky-600 px-3 py-2 rounded-sm transition text-sky-600 cursor-pointer hover:bg-sky-600 hover:text-white"
                              onClick={() => handleView(queue.queue_id)}
                            >
                              View
                            </button>

                            {(status === "waiting" || status === "skipped") && (
                              <button
                                type="button"
                                disabled={acceptingId !== null}
                                onClick={() => handleAccept(queue)}
                                className="border text-xs border-green-600 px-3 py-2 rounded-sm transition text-green-600 cursor-pointer hover:bg-green-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50s"
                              >
                                {busy && pendingAction === "accept"
                                  ? "Accepting..."
                                  : "Accept"}
                              </button>
                            )}

                            {(status === "waiting" ||
                              status === "serving" ||
                              status === "skipped") &&
                              !skipsExhausted && (
                                <button
                                  type="button"
                                  disabled={acceptingId !== null}
                                  onClick={() => handleSkip(queue.queue_id)}
                                  className="border text-xs border-amber-600 px-3 py-2 rounded-sm transition text-amber-600 cursor-pointer hover:bg-amber-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {busy && pendingAction === "skip"
                                    ? "Skipping..."
                                    : "Skip"}
                                </button>
                              )}

                            {skipsExhausted && canAct && (
                              <button
                                type="button"
                                disabled={acceptingId !== null}
                                onClick={() => handleCancel(queue)}
                                className="border text-xs border-red-600 px-3 py-2 rounded-sm transition text-red-600 cursor-pointer hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {busy && pendingAction === "cancel"
                                  ? "Cancelling..."
                                  : "Cancel"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </LoadingRegion>

      {/* PAGINATION */}
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-gray-500">
          <span>
            Showing {from} - {to} of {total} queues
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-gray-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              &lt;
            </button>

            {pages.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md ${
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
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-gray-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              &gt;
            </button>
          </div>
        </div>
      )}

      {/* CANCELLATION MODAL */}
      {cancelTarget && (
        <CancelationReason
          key={cancelTarget.queue_id}
          queueId={cancelTarget.queue_id}
          patientName={cancelTarget.patient_name}
          skipsExhausted={(cancelTarget.skip_count ?? 0) >= MAX_SKIPS}
          onClose={() => setCancelTarget(null)}
          onConfirm={confirmCancel}
        />
      )}
    </>
  );
}

export default QueueTable;

import EmptyState from "../../../../components/EmptyState";
import ErrorMessage from "../../../../components/ErrorMessage";
import LoadingScreen from "../../../../components/LoadingScreen";

import { ChevronDown, ChevronUp } from "lucide-react";
import React, { useState, type Dispatch, type SetStateAction } from "react";
import type { LaboratoryItem } from "../../../../interface/LaboratoryItem";
import type { Queue } from "../../../../interface/Queue";
import api from "#lib/axios";

type QueueTableProps = {
  filterQueues: Queue[];
  laboratoryItems: LaboratoryItem[];
  accordionError: string | null;
  accordionLoading: boolean;
  setOpenQueueAccordion: Dispatch<SetStateAction<string | null>>;
  openQueueAccordion: string | null;
  setOpenInformationCard: Dispatch<SetStateAction<boolean>>;
  setQueueIdCard: Dispatch<SetStateAction<string | null>>;
  loadData: () => Promise<void>;
  room: string;
};

const PAGE_SIZE = 10;

function QueueTable({
  filterQueues,
  laboratoryItems,
  accordionLoading,
  accordionError,
  setOpenQueueAccordion,
  openQueueAccordion,
  setOpenInformationCard,
  setQueueIdCard,
  room,
  loadData,
}: QueueTableProps) {
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
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

  const handleToggleAccordion = (queue_id: string) => {
    setOpenQueueAccordion((currentQueueId) =>
      currentQueueId === queue_id ? null : queue_id,
    );
  };

  const runQueueRequest = async (
    queue_id: string,
    request: () => Promise<unknown>,
    fallbackMessage: string,
  ) => {
    if (acceptingId) return;

    try {
      setAcceptingId(queue_id);
      setAcceptError(null);

      await request();
      await loadData();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || fallbackMessage;
      setAcceptError(message);
    } finally {
      setAcceptingId(null);
    }
  };

  const id = (queue_id: string) => encodeURIComponent(queue_id);

  const handleAccept = (queue_id: string) =>
    runQueueRequest(
      queue_id,
      () =>
        api.patch(`/api/labstaff/laboratory-queues/${id(queue_id)}/accept`, {
          room,
          action: "accept",
        }),
      "Unable to accept queue.",
    );

  const handleComplete = (queue_id: string) =>
    runQueueRequest(
      queue_id,
      () =>
        api.patch(`/api/labstaff/laboratory-queues/${id(queue_id)}/complete`, {
          room,
          action: "complete",
        }),
      "Unable to complete queue.",
    );

  const handleSkip = (queue_id: string) =>
    runQueueRequest(
      queue_id,
      () =>
        api.patch(`/api/labstaff/laboratory-queues/${id(queue_id)}/skip`, {
          room,
          action: "skip",
        }),
      "Unable to skip queue.",
    );

  return (
    <>
      {acceptError && <ErrorMessage>{acceptError}</ErrorMessage>}

      <table className="w-full table-fixed">
        <colgroup>
          <col className="w-1/40" />
          <col className="w-4/40" />
          <col className="w-6/40" />
          <col className="w-7/40" />
          <col className="w-5/40" />
          <col className="w-5/40" />
          <col className="w-5/40" />
          <col className="w-7/40" />
        </colgroup>

        <thead className="bg-gray-100">
          <tr>
            <th className="px-1 py-2"></th>
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
          {pageQueues.map((queue) => (
            <React.Fragment key={queue.id}>
              <tr
                className={`border-b border-gray-300 ${
                  queue.status === "Serving" ? "bg-green-50" : ""
                }`}
              >
                <td className="px-3 py-3">
                  {openQueueAccordion === queue.queue_id ? (
                    <ChevronUp
                      size={20}
                      className="cursor-pointer text-gray-300 transition-all duration-75 hover:text-black"
                      onClick={() => handleToggleAccordion(queue.queue_id)}
                    />
                  ) : (
                    <ChevronDown
                      size={20}
                      className="cursor-pointer text-gray-300 transition-all duration-75 hover:text-black"
                      onClick={() => handleToggleAccordion(queue.queue_id)}
                    />
                  )}
                </td>

                <td className="px-1 py-3 text-center text-sm">
                  {queue.queue_id}
                </td>

                <td className="px-1 py-3 text-center text-sm">
                  {queue.patient_id}
                </td>

                <td className="wrap-break-word px-1 py-3 text-center text-sm">
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
                </td>

                <td className="flex items-center justify-center gap-3 px-1 py-3">
                  <button
                    className="cursor-pointer rounded-sm border-2 border-blue-500 px-4 py-2 text-xs text-blue-500 transition-all duration-300 hover:scale-105 hover:bg-blue-100"
                    onClick={() => {
                      setOpenInformationCard(true);
                      setQueueIdCard(queue.queue_id);
                    }}
                  >
                    View
                  </button>

                  {(() => {
                    const status = queue.status?.toLowerCase();
                    const busy = acceptingId === queue.queue_id;

                    return (
                      <>
                        {(status === "waiting" || status === "skipped") && (
                          <button
                            disabled={busy}
                            onClick={() => handleAccept(queue.queue_id)}
                            className="cursor-pointer rounded-sm border-2 border-green-500 px-4 py-2 text-xs text-green-500 transition-all duration-300 hover:scale-105 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Accept
                          </button>
                        )}

                        {status === "serving" && (
                          <button
                            disabled={busy}
                            onClick={() => handleComplete(queue.queue_id)}
                            className="cursor-pointer rounded-sm border-2 border-green-500 px-4 py-2 text-xs text-green-500 transition-all duration-300 hover:scale-105 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Complete
                          </button>
                        )}

                        {(status === "serving" ||
                          status === "waiting" ||
                          status === "skipped") && (
                          <button
                            disabled={busy}
                            onClick={() => handleSkip(queue.queue_id)}
                            className="cursor-pointer rounded-sm border-2 border-yellow-500 px-4 py-2 text-xs text-yellow-500 transition-all duration-300 hover:scale-105 hover:bg-yellow-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Skip
                          </button>
                        )}
                      </>
                    );
                  })()}
                </td>
              </tr>

              {openQueueAccordion === queue.queue_id && (
                <tr className="border-b border-gray-300 bg-gray-50">
                  <td colSpan={8} className="p-4">
                    {accordionLoading ? (
                      <LoadingScreen message="Loading laboratory items..." />
                    ) : accordionError ? (
                      <ErrorMessage>{accordionError}</ErrorMessage>
                    ) : laboratoryItems.length === 0 ? (
                      <EmptyState message="No laboratory items found." />
                    ) : (
                      <table className="w-full table-fixed bg-gray-100">
                        <colgroup>
                          <col className="w-4/40" />
                          <col className="w-4/40" />
                          <col className="w-8/40" />
                          <col className="w-5/40" />
                          <col className="w-5/40" />
                        </colgroup>

                        <thead className="bg-gray-300">
                          <tr>
                            <th className="px-3 py-2 text-center text-sm font-medium">
                              Lab Item ID
                            </th>
                            <th className="px-3 py-2 text-center text-sm font-medium">
                              Service Name
                            </th>
                            <th className="px-3 py-2 text-center text-sm font-medium">
                              Service Type
                            </th>
                            <th className="px-3 py-2 text-center text-sm font-medium">
                              Status
                            </th>
                            <th className="px-3 py-2 text-center text-sm font-medium">
                              Updated At
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {laboratoryItems.map((item) => (
                            <tr
                              key={item.item_id}
                              className="border-b border-gray-200 bg-white text-sm"
                            >
                              <td className="px-3 py-3 text-center text-xs">
                                {item.item_id}
                              </td>
                              <td className="px-3 py-3 text-center text-xs">
                                {item.service_name}
                              </td>
                              <td className="px-3 py-3 text-center text-xs">
                                {item.service_type}
                              </td>
                              <td className="px-3 py-3 text-center text-xs">
                                {item.status}
                              </td>
                              <td className="px-3 py-3 text-center text-xs">
                                {(() => {
                                  const date = new Date(item.created_at);
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
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
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

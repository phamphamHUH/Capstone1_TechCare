import type { QueueRequests } from "../../../../interface/Queue";

type QueueRequestsTableProps = {
  queueRequests: QueueRequests[];
  onAddToQueue: (request: QueueRequests) => void;
};

function QueueRequestsTable({
  queueRequests,
  onAddToQueue,
}: QueueRequestsTableProps) {
  return (
    <div className="max-h-105 overflow-auto rounded-xl border border-gray-200 bg-white">
      <table className=" w-full text-sm">
        <colgroup>
          <col className="w-1/30" />
          <col className="w-9/30" />
          <col className="w-5/30" />
          <col className="w-9/30" />
          <col className="w-6/30" />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-white text-gray-500">
          <tr className="border-b border-gray-100">
            <th className="px-4 py-3 text-left font-medium">Type</th>
            <th className="px-4 py-3 text-left font-medium">Patient</th>
            <th className="px-4 py-3 text-left font-medium">Service</th>
            <th className="px-4 py-3 text-left font-medium">Created By</th>
            <th className="px-4 py-3 text-left font-medium">Action</th>
          </tr>
        </thead>

        <tbody>
          {queueRequests.length > 0 ? (
            queueRequests.map((request) => {
              return (
                <tr
                  key={`${request.record_type}-${request.record_id}`}
                  className="border-t border-gray-100 transition-colors hover:bg-gray-50"
                >
                  <td className="px-4 py-3 align-top">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize `}
                    >
                      {request.record_type}
                    </span>
                  </td>

                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-gray-700">
                      {request.patient_name}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {request.patient_id}
                    </div>
                  </td>

                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-gray-700">
                      {request.service_name}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {request.service_id}
                    </div>
                  </td>

                  <td className="px-4 py-3 align-top text-gray-700">
                    {request.created_by || "-"}
                  </td>

                  <td className="px-4 py-3 align-top">
                    <button
                      className="cursor-pointer"
                      type="button"
                      onClick={() => onAddToQueue(request)}
                    >
                      Add to Queue
                    </button>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={6} className="px-4 py-16 text-center text-gray-400">
                No requests found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default QueueRequestsTable;

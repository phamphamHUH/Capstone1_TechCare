import type { UnpaidRequests } from "../../../../interface/Billing";

type UnpaidRequestsTableProps = {
  unpaidRequests: UnpaidRequests[];
  onConfirmPayment: (request: UnpaidRequests) => void;
  submittingId: string | number | null;
};

function UnpaidRequestsTable({
  unpaidRequests,
  onConfirmPayment,
  submittingId,
}: UnpaidRequestsTableProps) {
  return (
    <div className="max-h-105 overflow-auto border border-gray-200 bg-white">
      <table className="w-full text-xs">
        <colgroup>
          <col className="w-4/40" />
          <col className="w-5/40" />
          <col className="w-5/40" />
          <col className="w-5/40" />
          <col className="w-3/40" />
          <col className="w-6/40" />
          <col className="w-5/40" />
          <col className="w-7/40" />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-gray-100 text-gray-500">
          <tr className="border-b border-gray-100">
            <th className="px-4 py-3 text-left font-medium">Date & Time</th>
            <th className="px-4 py-3 text-left font-medium">Patient</th>
            <th className="px-4 py-3 text-left font-medium">Request ID</th>
            <th className="px-4 py-3 text-left font-medium">Service(s)</th>
            <th className="px-4 py-3 text-left font-medium">Amount</th>
            <th className="px-4 py-3 text-left font-medium">Payment Method</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {unpaidRequests.length > 0 ? (
            unpaidRequests.map((request) => (
              <tr
                key={`${request.record_type}-${request.lab_item_id}`}
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
                  {request.requested_by || "-"}
                </td>
                <td className="px-4 py-3 align-top">
                  <button
                    className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    disabled={submittingId === request.lab_item_id}
                    onClick={() => onConfirmPayment(request)}
                  >
                    {submittingId === request.lab_item_id
                      ? "Processing..."
                      : "Confirm Payment"}
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-4 py-16 text-center text-gray-400">
                No requests found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default UnpaidRequestsTable;

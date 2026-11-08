import LoadingScreen from "../../../../components/LoadingScreen";
import { useState } from "react";
import { ReceiptText } from "lucide-react";
import type { Bill } from "../../../../interface/Billing";
import { formatDateTime, peso } from "../../../../utils/formats";

type BillingTableProps = {
  bills: Bill[];
  variant: "queue" | "history";
  loading: boolean;
  emptyMessage: string;
  onOpen: (bill: Bill) => void;
};

const PAGE_SIZE = 10;
const COLUMNS = [
  "Bill ID",
  "Patient",
  "Service(s)",
  "Total",
  "Payment Method",
  "Laboratory",
  "Status",
  "Action",
];
const cellClass = "px-4 py-3 align-top text-gray-700";
const LAB_STYLES: Record<Bill["laboratory_status"], string> = {
  "No laboratory tests": "bg-gray-100 text-gray-600",
  "Waiting for payment": "bg-sky-50 text-sky-700",
  "Needs forwarding": "bg-amber-100 text-amber-800",
  Forwarded: "bg-green-100 text-green-800",
};

function BillingTable({
  bills,
  variant,
  loading,
  emptyMessage,
  onOpen,
}: BillingTableProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(bills.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = bills.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table
          className="w-full min-w-250 text-left text-xs"
          aria-busy={loading}
        >
          <thead className="bg-gray-100 text-gray-500">
            <tr>
              {COLUMNS.map((column) => (
                <th key={column} className="px-4 py-3 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((bill) => {
              const date = formatDateTime(
                variant === "history"
                  ? (bill.paid_at ?? bill.created_at)
                  : bill.created_at,
              );
              const needsForwarding =
                bill.laboratory_status === "Needs forwarding";
              return (
                <tr
                  key={bill.bill_id}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className={cellClass}>
                    <div className="font-medium">{bill.bill_id}</div>
                    <div className="text-gray-400">
                      {date ? `${date.date}, ${date.time}` : "No date recorded"}
                    </div>
                  </td>
                  <td className={cellClass}>
                    <div className="font-medium">{bill.patient_name}</div>
                    <div className="text-gray-400">{bill.patient_id}</div>
                  </td>
                  <td className={cellClass}>
                    {bill.services.length === 0 ? (
                      <span className="text-gray-400">
                        No itemized services
                      </span>
                    ) : (
                      <div>
                        {bill.services.length}{" "}
                        {bill.services.length === 1 ? "service" : "services"}
                      </div>
                    )}
                    {/* {bill.services.slice(0, 2).map((service, index) => (
                      <div key={`${service}-${index}`}>{service.length}</div>
                    ))}
                    {bill.services.length > 2 && (
                      <div className="text-gray-400">
                        +{bill.services.length - 2} more
                      </div>
                    )} */}
                  </td>
                  <td className={`${cellClass} font-medium`}>
                    {bill.payment_method === "Not recorded"
                      ? "Not recorded"
                      : peso(bill.total_amount)}
                  </td>
                  <td className={cellClass}>
                    {bill.status === "Pending"
                      ? "Awaiting payment"
                      : (bill.payment_method ?? "Not recorded")}
                  </td>
                  <td className={cellClass}>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 font-semibold ${LAB_STYLES[bill.laboratory_status]}`}
                    >
                      {bill.laboratory_status}
                    </span>
                  </td>
                  <td className={cellClass}>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 font-semibold ${bill.status === "Paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                    >
                      {bill.status}
                    </span>
                  </td>
                  <td className={cellClass}>
                    <button
                      type="button"
                      onClick={() => onOpen(bill)}
                      className={`cursor-pointer whitespace-nowrap rounded border px-3 py-1 font-medium ${
                        bill.status === "Pending" || needsForwarding
                          ? "border-sky-500 text-sky-700 hover:bg-sky-50"
                          : "border-gray-300 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {bill.status === "Pending"
                        ? "Process Payment"
                        : needsForwarding
                          ? "Retry Forwarding"
                          : "View"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="flex flex-col items-center gap-2 px-4 py-16 text-center text-gray-400">
          {loading ? (
            <LoadingScreen message="Loading bills..." className="min-h-0 py-0" />
          ) : (
            <>
              <ReceiptText size={28} />
              <p>{emptyMessage}</p>
            </>
          )}
        </div>
      )}

      {bills.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-gray-500">
          <span>
            Showing {(currentPage - 1) * PAGE_SIZE + 1} -{" "}
            {Math.min(currentPage * PAGE_SIZE, bills.length)} of {bills.length}{" "}
            bills
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className="cursor-pointer rounded-lg border border-gray-200 px-3 py-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="cursor-pointer rounded-lg border border-gray-200 px-3 py-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BillingTable;

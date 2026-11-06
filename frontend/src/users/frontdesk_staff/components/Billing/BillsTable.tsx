import { Fragment, useRef, useState } from "react";
import type { Bill, BillItem } from "../../../../interface/Billing";
import { FlaskConical, Info } from "lucide-react";
import { formatDateTime, peso } from "../../../../utils/formats";

type BillsTableProps = {
  bills: Bill[];
  variant: "queue" | "history";
  onProcessPayment: (bill: Bill) => void;
  fetchBillItems: (bill_id: string) => Promise<BillItem[]>;
};

type ItemsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; items: BillItem[] };

const STATUS_STYLES: Record<string, string> = {
  Paid: "bg-green-50",
  Pending: "bg-gray-200",
};

function BillsTable({
  bills,
  variant,
  onProcessPayment,
  fetchBillItems,
}: BillsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [itemsState, setItemsState] = useState<ItemsState>({
    status: "loading",
  });
  const isHistory = variant === "history";
  const latestRequest = useRef<string | null>(null);

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const [prevBills, setPrevBills] = useState(bills);
  if (bills !== prevBills) {
    setPrevBills(bills);
    setPage(1);
  }
  const total = bills.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, total);
  const pageBills = bills.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  const goToPage = (p: number) => {
    latestRequest.current = null; // drop any in-flight items request
    setExpandedId(null); // collapse the open row
    setPage(p);
  };

  const loadItems = async (bill_id: string) => {
    latestRequest.current = bill_id;
    setItemsState({ status: "loading" });
    try {
      const items = await fetchBillItems(bill_id);
      if (latestRequest.current !== bill_id) return;
      setItemsState({ status: "loaded", items });
    } catch {
      if (latestRequest.current !== bill_id) return;
      setItemsState({ status: "error" });
    }
  };

  const handleToggle = (bill: Bill) => {
    if (expandedId === bill.bill_id) {
      latestRequest.current = null;
      setExpandedId(null);
      return;
    }
    setExpandedId(bill.bill_id);
    void loadItems(bill.bill_id);
  };
  const columnCount = isHistory ? 8 : 9;

  return (
    <div className="border border-gray-200 bg-white">
      <table className="w-full text-xs">
        <colgroup>
          {(isHistory
            ? [
                "w-[14%]",
                "w-[18%]",
                "w-[11%]",
                "w-[11%]",
                "w-[13%]",
                "w-[8%]",
                "w-[15%]",
                "w-[10%]",
              ]
            : [
                "w-[5%]",
                "w-[10%]",
                "w-[15%]",
                "w-[12%]",
                "w-[10%]",
                "w-[10%]",
                "w-[12%]",
                "w-[10%]",
                "w-[16%]",
              ]
          ).map((w, i) => (
            <col key={i} className={w} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-10 bg-gray-100 text-gray-500">
          <tr className="border-b border-gray-100">
            {isHistory ? (
              <th className="px-4 py-3 text-left font-medium">Bill ID</th>
            ) : (
              <th className="px-2 py-3">
                <span className="sr-only">Expand</span>
              </th>
            )}

            {!isHistory && (
              <th className="px-4 py-3 text-left font-medium">Date & Time</th>
            )}
            <th className="px-4 py-3 text-left font-medium">Patient</th>
            {!isHistory && (
              <th className="px-4 py-3 text-left font-medium">Request ID</th>
            )}
            <th className="px-4 py-3 text-left font-medium">Service(s)</th>
            <th className="px-4 py-3 text-left font-medium">Amount</th>
            <th className="px-4 py-3 text-left font-medium">Payment Method</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            {isHistory && (
              <th className="px-4 py-3 text-left font-medium">Received By</th>
            )}
            <th className="px-4 py-3 text-left font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {pageBills.length > 0 ? (
            pageBills.map((bill) => {
              const created = formatDateTime(bill.created_at);
              const paid = formatDateTime(bill.paid_at);

              const isExpanded = expandedId === bill.bill_id;

              return (
                <Fragment key={bill.bill_id}>
                  <tr className="border-t border-gray-100 transition-colors hover:bg-gray-50">
                    {isHistory ? (
                      <td className="px-4 py-3 align-top text-gray-700">
                        {bill.bill_id ?? "-"}
                      </td>
                    ) : (
                      <td className="px-2 py-3 align-top">
                        <button
                          type="button"
                          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-gray-500 hover:bg-gray-200"
                          aria-expanded={isExpanded}
                          aria-label={
                            isExpanded
                              ? `Hide items of ${bill.bill_id}`
                              : `Show items of ${bill.bill_id}`
                          }
                          onClick={() => handleToggle(bill)}
                        >
                          <svg
                            className={`h-4 w-4 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M5 8l5 5 5-5" />
                          </svg>
                        </button>
                      </td>
                    )}
                    {!isHistory && (
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-gray-700">
                          {created?.date ?? "-"}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {created?.time}
                        </div>
                      </td>
                    )}

                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-gray-700">
                        {bill.patient_name}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {bill.patient_id}
                      </div>
                    </td>

                    {!isHistory && (
                      <td className="px-4 py-3 align-top text-gray-700">
                        {bill.bill_id}
                      </td>
                    )}

                    <td className="px-4 py-3 align-top text-gray-700">
                      {bill.services_count ?? 0}{" "}
                      {bill.services_count === 1 ? "service" : "services"}
                    </td>

                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-gray-700">
                        {peso(bill.total_amount)}
                      </div>
                    </td>

                    <td className="px-4 py-3 align-top text-gray-700">
                      {bill.payment_method ?? "-"}
                    </td>

                    <td className="px-4 py-3 align-top">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          STATUS_STYLES[bill.status] ??
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {bill.status}
                      </span>
                    </td>

                    {isHistory && (
                      <td className="px-4 py-3 align-top text-gray-700">
                        {bill.received_by ?? "-"}
                      </td>
                    )}

                    <td className="px-4 py-3 align-top">
                      {isHistory ? (
                        <button
                          type="button"
                          className="cursor-pointer rounded border border-gray-300 px-3 py-1 font-medium text-gray-600 hover:bg-gray-50"
                          // onClick={() => onViewBill(bill)}
                        >
                          View
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="cursor-pointer rounded border border-blue-500 px-3 py-1 font-medium text-blue-600 hover:bg-blue-50"
                          onClick={() => onProcessPayment(bill)}
                        >
                          Process Payment
                        </button>
                      )}
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="border-t border-gray-100">
                      <td colSpan={columnCount} className="px-6 py-3">
                        {itemsState.status === "loading" && (
                          <div className="py-2 text-gray-400">
                            Loading items...
                          </div>
                        )}

                        {itemsState.status === "error" && (
                          <div className="flex items-center gap-3 py-2 text-gray-500">
                            <span>Could not load the items of this bill.</span>
                            <button
                              type="button"
                              className="cursor-pointer font-medium text-blue-600 hover:underline"
                              onClick={() => void loadItems(bill.bill_id)}
                            >
                              Try again
                            </button>
                          </div>
                        )}

                        {itemsState.status === "loaded" &&
                          (itemsState.items.length === 0 ? (
                            <div className="py-2 text-gray-400">
                              This bill has no items.
                            </div>
                          ) : (
                            <div className="grid grid-cols-6 gap-x-5">
                              <div className=" col-span-4 border rounded-md border-gray-300">
                                <div className="flex items-center h-12 px-2 border-b border-gray-100 gap-2 font-semibold bg-sky-50 rounded-t-md">
                                  <FlaskConical size={20} />
                                  Requested Services ({itemsState.items.length})
                                </div>
                                <div className="px-6">
                                  <table className="w-full text-xs">
                                    <tbody>
                                      {itemsState.items.map((item) => {
                                        return (
                                          <tr
                                            key={`${item.line_type}-${item.item_id}`}
                                            className="border-b border-gray-100"
                                          >
                                            <td className="py-1.5 pr-4">
                                              <div className="font-medium">
                                                {item.service_name}
                                              </div>
                                              <div className="text-[11px] text-gray-400">
                                                {item.service_category}
                                              </div>
                                            </td>
                                            <td className="py-1.5 pr-4 capitalize">
                                              {item.line_type}
                                            </td>
                                            <td className="py-1.5 pr-4">
                                              {item.status}
                                            </td>
                                            <td className="py-1.5 text-right">
                                              {peso(item.price)}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              <div className="border col-span-2 flex flex-col px-6 py-3 rounded-md border-gray-400 max-h-60">
                                <h1 className="font-bold text-lg mb-2">
                                  Payment Summary
                                </h1>
                                <div className="flex justify-between font-light text-xs mb-2">
                                  <span className="text-gray-500">
                                    Subtotal ({itemsState.items.length}
                                    services)
                                  </span>
                                  <span>{peso(bill.subtotal)}</span>
                                </div>

                                <div className="flex justify-between font-light text-xs border-b pb-2 mb-2 ">
                                  <span className="text-gray-500">
                                    Discount
                                  </span>
                                  <span>{peso(bill.discount_amount)}</span>
                                </div>

                                <div className="flex justify-between  ">
                                  <span className="font-bold">
                                    Total Amount Due
                                  </span>
                                  <span className="font-bold text-blue-700">
                                    {peso(bill.total_amount)}
                                  </span>
                                </div>
                                <div className="flex border border-sky-300 bg-sky-100 text-sky-500 px-4 py-2 gap-2 rounded-sm mt-5">
                                  <Info size={20} />
                                  <p className="text-xs">
                                    Payment is required before laboratory and
                                    imaging requests get queued.
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={columnCount}
                className="px-4 py-16 text-center text-gray-400"
              >
                No bills found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 text-xs text-gray-500">
          <span>
            Showing {from} - {to} of {total} bills
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              &lt;
            </button>

            {pages.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => goToPage(p)}
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
              onClick={() => goToPage(currentPage + 1)}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              &gt;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BillsTable;

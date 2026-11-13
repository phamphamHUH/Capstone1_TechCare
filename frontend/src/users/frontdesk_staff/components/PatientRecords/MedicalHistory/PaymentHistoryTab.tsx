import { useEffect, useState } from "react";
import EmptyState from "../../../../../components/EmptyState";
import ErrorMessage from "../../../../../components/ErrorMessage";
import LoadingScreen from "../../../../../components/LoadingScreen";
import api from "#lib/axios";
import { Search } from "lucide-react";
import type { Bill, BillItem } from "../../../../../interface/Billing";
import InvoicePreview from "./PaymentHistoryTab/InvoicePreview";

type Props = {
  patientId: string | null;
};

const PAGE_SIZE = 10;

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const errorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data
    ?.message || fallback;

function PaymentHistory({ patientId }: Props) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // Invoice modal
  const [invoiceBill, setInvoiceBill] = useState<Bill | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<BillItem[]>([]);
  const [invoiceLoadingId, setInvoiceLoadingId] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;

    let cancelled = false;

    async function fetchPaymentHistory() {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get(
          `/api/fdstaff/patients/${encodeURIComponent(patientId as string)}/payment-history`,
        );
        if (cancelled) return;

        setBills(response.data?.bills ?? []);
        setPage(1);
      } catch (err) {
        if (cancelled) return;

        setError(errorMessage(err, "Payment history could not be loaded."));
        setBills([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPaymentHistory();

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const handleInvoice = async (bill_id: string) => {
    if (invoiceLoadingId) return;

    try {
      setInvoiceLoadingId(bill_id);
      setInvoiceError(null);

      const response = await api.get(
        `/api/fdstaff/billings/${encodeURIComponent(bill_id)}/details`,
      );

      setInvoiceItems(response.data?.items ?? []);
      setInvoiceBill(response.data?.bill ?? null);
    } catch (err) {
      setInvoiceError(errorMessage(err, "Invoice could not be loaded."));
    } finally {
      setInvoiceLoadingId(null);
    }
  };

  const closeInvoice = () => {
    setInvoiceBill(null);
    setInvoiceItems([]);
  };

  const searchLower = search.trim().toLowerCase();
  const filteredBills = searchLower
    ? bills.filter((bill) => bill.bill_id.toLowerCase().includes(searchLower))
    : bills;

  // Pagination
  const total = filteredBills.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, total);
  const pageBills = filteredBills.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className="mx-6 mt-5 rounded-md border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
        <h2 className="text-base font-semibold text-gray-900">
          Payment History
        </h2>
        <p className="mt-0.5 text-sm text-gray-500">
          All bills issued to this patient
        </p>
      </div>

      {error && (
        <ErrorMessage className="mx-4 mt-4 sm:mx-6">{error}</ErrorMessage>
      )}

      {loading ? (
        <LoadingScreen message="Loading payment history..." />
      ) : bills.length === 0 ? (
        <EmptyState
          message={
            error
              ? "Payment history is unavailable."
              : "No payment history found."
          }
        />
      ) : (
        <>
          {/* SEARCH BAR */}
          <section className="flex w-full items-center gap-2 px-4 py-4 sm:px-6">
            <div className="relative min-w-40 flex-1">
              <Search
                size={17}
                strokeWidth={1.5}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search bill ID..."
                className="h-9 w-full rounded-md border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20"
              />
            </div>
          </section>

          {invoiceError && (
            <ErrorMessage className="mx-4 mb-4 sm:mx-6">
              {invoiceError}
            </ErrorMessage>
          )}

          {filteredBills.length === 0 ? (
            <EmptyState message="No bills match your search." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-205 table-fixed">
                  <colgroup>
                    <col className="w-6/40" />
                    <col className="w-7/40" />
                    <col className="w-6/40" />
                    <col className="w-6/40" />
                    <col className="w-6/40" />
                    <col className="w-4/40" />
                    <col className="w-5/40" />
                  </colgroup>

                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 py-2 text-sm">Bill ID</th>
                      <th className="px-2 py-2 text-sm">Date</th>
                      <th className="px-2 py-2 text-sm">Payment Method</th>
                      <th className="px-2 py-2 text-sm">Reference No.</th>
                      <th className="px-2 py-2 text-sm">Total</th>
                      <th className="px-2 py-2 text-sm">Status</th>
                      <th className="px-2 py-2 text-sm">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pageBills.map((bill) => {
                      const paid = bill.status === "Paid";
                      const discount = Number(bill.discount_amount) || 0;
                      const busy = invoiceLoadingId === bill.bill_id;

                      return (
                        <tr
                          key={bill.bill_id}
                          className="border-b border-gray-200 text-center text-sm"
                        >
                          <td className="px-2 py-3">{bill.bill_id}</td>

                          <td className="px-2 py-3">
                            {formatDateTime(bill.paid_at ?? bill.created_at)}
                          </td>

                          <td className="px-2 py-3">{bill.payment_method}</td>

                          <td className="px-2 py-3">
                            {bill.reference_num || "—"}
                          </td>

                          <td className="px-2 py-3">
                            <div className="font-medium">
                              {peso.format(Number(bill.total_amount) || 0)}
                            </div>
                            {discount > 0 && (
                              <div className="text-xs text-gray-400">
                                {bill.discount_type ?? "Discount"} -{" "}
                                {peso.format(discount)}
                              </div>
                            )}
                          </td>

                          <td className="px-2 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                paid
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {bill.status}
                            </span>
                          </td>

                          <td className="px-2 py-3">
                            <button
                              type="button"
                              disabled={!paid || invoiceLoadingId !== null}
                              title={paid ? undefined : "Bill is not paid yet"}
                              onClick={() => handleInvoice(bill.bill_id)}
                              className="cursor-pointer rounded-sm border-2 border-blue-500 px-3 py-2 text-xs text-blue-500 transition-all duration-300 hover:scale-105 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-transparent"
                            >
                              {busy ? "Loading..." : "Invoice"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-gray-500">
                <span>
                  Showing {from} - {to} of {total} bills
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
            </>
          )}
        </>
      )}

      {/* INVOICE MODAL */}
      {invoiceBill && (
        <InvoicePreview
          key={invoiceBill.bill_id}
          bill={invoiceBill}
          items={invoiceItems}
          onClose={closeInvoice}
        />
      )}
    </div>
  );
}

export default PaymentHistory;

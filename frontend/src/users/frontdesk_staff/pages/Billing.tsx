import { useMemo, useState } from "react";
import axios from "axios";
import { LoaderCircle, RefreshCw, Search } from "lucide-react";
import api from "../../../lib/axios";
import type {
  Bill,
  BillDetails,
  BillingNotice,
  BillingStatistics,
  PaymentOptions,
  PaymentOutcome,
  PaymentResult,
} from "../../../interface/Billing";
import { peso } from "../../../utils/formats";
import BillingStats from "../components/Billing/BillingStats";
import BillingTable from "../components/Billing/BillingTable";
import ProcessPayment from "../components/Billing/ProcessPayment";

type BillingProps = {
  bills: Bill[];
  loading: boolean;
  error: string;
  loadData: () => Promise<void>;
};

type Tab = "queue" | "history";

const errorMessage = (cause: unknown, fallback: string) =>
  (axios.isAxiosError<{ message?: string }>(cause) &&
    cause.response?.data?.message) ||
  fallback;

function Billing({ bills, loading, error, loadData }: BillingProps) {
  const [tab, setTab] = useState<Tab>("queue");
  const [search, setSearch] = useState("");
  const [details, setDetails] = useState<BillDetails | null>(null);
  const [opening, setOpening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState<BillingNotice | null>(null);

  const pending = useMemo(
    () => bills.filter((bill) => bill.status === "Pending"),
    [bills],
  );
  const paid = useMemo(
    () => bills.filter((bill) => bill.status === "Paid"),
    [bills],
  );

  const stats: BillingStatistics = {
    total: bills.length,
    pending: pending.length,
    paid: paid.length,
    awaitingLaboratory: paid.filter(
      (bill) => bill.laboratory_status === "Needs forwarding",
    ).length,
  };

  const visibleBills = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (tab === "queue" ? pending : paid).filter(
      (bill) =>
        !q ||
        bill.bill_id.toLowerCase().includes(q) ||
        bill.patient_id.toLowerCase().includes(q) ||
        bill.patient_name.toLowerCase().includes(q) ||
        bill.services.some((service) => service.toLowerCase().includes(q)),
    );
  }, [tab, pending, paid, search]);

  async function openBill(bill: Bill) {
    setActionError("");
    setNotice(null);
    setOpening(true);
    try {
      const { data } = await api.get<BillDetails>(
        `/api/fdstaff/billings/${bill.bill_id}/details`,
      );
      setDetails(data);
    } catch (cause) {
      setActionError(
        errorMessage(
          cause,
          "Bill details could not be loaded. Please try again.",
        ),
      );
    } finally {
      setOpening(false);
    }
  }

  function closeBill() {
    setDetails(null);
    setActionError("");
    setNotice(null);
  }

  // Paying and retrying forwarding use the same endpoint. A paid bill is never charged twice.
  async function submitPayment(
    billId: string,
    body: Partial<PaymentOptions>,
  ): Promise<PaymentOutcome> {
    setSubmitting(true);
    setActionError("");
    setNotice(null);
    let result: PaymentResult;
    try {
      const { data } = await api.patch<PaymentResult>(
        `/api/fdstaff/billings/${billId}/pay`,
        body,
      );
      result = data;
    } catch (cause) {
      setActionError(
        errorMessage(
          cause,
          "The server did not confirm this request. Refresh the bill before trying again.",
        ),
      );
      setSubmitting(false);
      return { status: "failed" };
    }

    if (result?.bill?.bill_id !== billId || result.bill.status !== "Paid") {
      setActionError(
        "The server did not confirm a paid bill. Refresh the bill before trying again.",
      );
      setSubmitting(false);
      return { status: "failed" };
    }

    const lab = result.has_laboratory_items
      ? " Laboratory tests are in the queue."
      : "";
    if (!result.queued) setNotice({ tone: "warning", text: result.message });
    else if (result.already_paid)
      setNotice({ tone: "success", text: `No new charge was recorded.${lab}` });
    else
      setNotice({
        tone: "success",
        text: `Payment recorded.${result.change > 0 ? ` Change: ${peso(result.change)}.` : ""}${lab}`,
      });

    // The payment is saved by now, so a failed refresh must not look like a failed payment.
    const [detailResponse, listResponse] = await Promise.allSettled([
      api.get<BillDetails>(`/api/fdstaff/billings/${billId}/details`),
      loadData(),
    ]);
    let invoiceReady = false;
    if (detailResponse.status === "fulfilled") {
      const data = detailResponse.value.data;
      if (
        data?.bill?.bill_id === billId &&
        data.bill.status === "Paid" &&
        Array.isArray(data.items)
      ) {
        setDetails(data);
        invoiceReady = Boolean(
          data.bill.payment_method &&
            data.bill.payment_method !== "Not recorded",
        );
      }
    }
    if (!invoiceReady || listResponse.status === "rejected") {
      setActionError(
        "The payment is saved, but this page could not refresh. Use Back and Refresh to see the latest status.",
      );
    }
    setSubmitting(false);
    return {
      status: "recorded",
      alreadyPaid: Boolean(result.already_paid),
      invoiceReady,
      forwarded: Boolean(result.queued && result.has_laboratory_items),
    };
  }

  if (details) {
    return (
      <main className="min-w-0 flex-1 px-6">
        <ProcessPayment
          key={details.bill.bill_id}
          bill={details.bill}
          items={details.items}
          submitting={submitting}
          error={actionError}
          notice={notice}
          onBack={closeBill}
          onPay={(options) => submitPayment(details.bill.bill_id, options)}
          onRetryForwarding={() => submitPayment(details.bill.bill_id, {})}
        />
      </main>
    );
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "queue", label: "Pending Billing Queue", count: pending.length },
    { id: "history", label: "Paid Payment History", count: paid.length },
  ];

  return (
    <main className="min-w-0 flex-1 px-6" aria-label="Front desk billing">
      <h1 className="text-2xl font-bold">Billing &amp; Payments</h1>
      <p className="text-sm font-light text-gray-600">
        Review patient bills, record payments, and forward paid laboratory
        tests.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          <span>{error}</span>
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadData()}
            className="cursor-pointer rounded border border-red-300 bg-white px-3 py-1 font-medium disabled:opacity-50"
          >
            Try Again
          </button>
        </div>
      )}
      {actionError && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {actionError}
        </p>
      )}
      {stats.awaitingLaboratory > 0 && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {stats.awaitingLaboratory} paid{" "}
          {stats.awaitingLaboratory === 1
            ? "bill still needs"
            : "bills still need"}{" "}
          laboratory forwarding.{" "}
          <button
            type="button"
            className="cursor-pointer underline"
            onClick={() => setTab("history")}
          >
            Open payment history
          </button>{" "}
          and retry.
        </p>
      )}

      <BillingStats stats={stats} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Billing views" className="flex gap-2">
          {tabs.map(({ id, label, count }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium ${tab === id ? "border-sky-500 bg-sky-50 text-sky-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
        <label className="relative min-w-60 flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            aria-label="Search bills"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search bill ID, patient, or service"
            className="h-9 w-full rounded-sm border border-gray-300 pl-9 pr-3 text-sm outline-none focus:border-sky-400"
          />
        </label>
        <button
          type="button"
          disabled={loading}
          onClick={() => void loadData()}
          className="flex h-9 cursor-pointer items-center gap-2 rounded-sm border border-gray-300 px-3 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <LoaderCircle
              size={16}
              className="animate-spin motion-reduce:animate-none"
            />
          ) : (
            <RefreshCw size={16} />
          )}
          Refresh
        </button>
      </div>

      {opening && (
        <p role="status" className="mb-3 text-sm text-gray-500">
          Loading the selected bill...
        </p>
      )}

      <BillingTable
        key={`${tab}-${search}`}
        bills={visibleBills}
        variant={tab}
        loading={loading && bills.length === 0}
        emptyMessage={
          error
            ? "The latest bills could not be loaded."
            : search.trim()
              ? "No bills match this search."
              : tab === "queue"
                ? "No pending bills."
                : "No paid bills yet."
        }
        onOpen={(bill) => void openBill(bill)}
      />
    </main>
  );
}

export default Billing;

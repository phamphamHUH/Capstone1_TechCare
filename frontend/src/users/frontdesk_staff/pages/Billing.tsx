import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, ListFilter, RefreshCw, Search, Wallet, XCircle } from "lucide-react";
import api from "../../../lib/axios";
import type { BillingEntry, BillingRecord, UnpaidRequests } from "../../../interface/Billing";
import type { Patient } from "../../../interface/Patient";
import type { Service } from "../../../interface/Service";
import type { QueueRequests } from "../../../interface/Queue";
import BillingQueue from "../components/Billing/BillingQueue";
import ProcessPayment from "../components/Billing/ProcessPayment";
import { BillingButton, BillingNotice } from "../components/Billing/BillingUi";
import { paidRequestsAwaitingLab, recordEntry, requestEntry } from "../components/Billing/billingModel";
import "../frontdesk.css";

type BillingProps = {
  unpaidRequests: UnpaidRequests[];
  queueRequests?: QueueRequests[];
  patients?: Patient[];
  services?: Service[];
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadData(): Promise<void>;
  loading: boolean;
};
const PAGE_SIZE = 5;
const message = (error: unknown, fallback: string) => (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (error as Error)?.message || fallback;

export default function Billing({ unpaidRequests, queueRequests = [], patients = [], services = [], loadData, loading }: BillingProps) {
  const [tab, setTab] = useState<"queue" | "history">("queue");
  const [history, setHistory] = useState<BillingRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [search, setSearch] = useState("");
  const [serviceType, setServiceType] = useState("all");
  const [method, setMethod] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState("");
  const [selected, setSelected] = useState<BillingEntry | null>(null);
  const [confirmed, setConfirmed] = useState<BillingEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const pending = useRef(false);
  const historyRequest = useRef<AbortController | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const loadHistory = useCallback(async () => {
    historyRequest.current?.abort();
    const controller = new AbortController();
    historyRequest.current = controller;
    try {
      const response = await api.get("/api/fdstaff/billing", { signal: controller.signal });
      if (!Array.isArray(response.data?.billing)) throw new Error("Payment history could not be read.");
      if (!controller.signal.aborted) setHistory(response.data.billing);
    } catch (cause) {
      if (!controller.signal.aborted) setHistoryError(message(cause, "Payment history is unavailable. Please try again."));
    } finally {
      if (!controller.signal.aborted) setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    // Start the read after mounting; cleanup also cancels a queued initial read.
    queueMicrotask(() => { if (active) void loadHistory(); });
    return () => { active = false; historyRequest.current?.abort(); };
  }, [loadHistory]);
  function refreshHistory() { setHistoryLoading(true); setHistoryError(""); void loadHistory(); }

  const requests = useMemo(() => {
    const confirmedIds = new Set(confirmed.map((entry) => entry.id));
    const waiting = paidRequestsAwaitingLab(queueRequests, patients, services);
    const paidIds = new Set(waiting.map((entry) => entry.id));
    return [...unpaidRequests.filter((request) => request.is_paid !== true && !confirmedIds.has(request.request_id) && !paidIds.has(request.request_id)).map((request) => requestEntry(request, patients, services)),
      ...waiting.filter((entry) => !confirmedIds.has(entry.id)), ...confirmed.filter((entry) => entry.needsLabQueue === true)];
  }, [unpaidRequests, queueRequests, patients, services, confirmed]);
  const records = useMemo(() => history.map((record) => recordEntry(record, patients, services)), [history, patients, services]);
  const entries = tab === "queue" ? requests : records;
  const methods = [...new Set(entries.map((entry) => entry.method))];
  const types = [...new Set(entries.map((entry) => entry.type))];
  const filtered = entries.filter((entry) => {
    const query = search.trim().toLowerCase();
    return (!query || [entry.patientName, entry.patientId, entry.id, ...entry.lines.map((line) => line.name)].some((value) => value.toLowerCase().includes(query)))
      && (serviceType === "all" || entry.type === serviceType)
      && (method === "all" || entry.method === method)
      && (status === "all" || entry.status === status);
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const busy = loading || historyLoading;

  function changeTab(next: "queue" | "history") {
    setTab(next); setPage(1); setExpandedId(""); setServiceType("all"); setMethod("all"); setStatus("all");
    if (next === "history") refreshHistory();
  }
  function openPayment(entry: BillingEntry) { setSelected(entry); setError(""); }
  function backToQueue() {
    if (pending.current) return;
    setSelected(null); setError("");
    requestAnimationFrame(() => headingRef.current?.focus());
  }
  async function confirmPayment() {
    if (pending.current || !selected?.request || (selected.status !== "Pending" && !selected.needsLabQueue)) return;
    pending.current = true; setSubmitting(true); setError("");
    try {
      const response = await api.patch(`/api/fdstaff/laboratory-requests/${encodeURIComponent(selected.id)}`);
      const saved = response.data?.request;
      const rows = Array.isArray(saved) ? saved : saved ? [saved] : [];
      if (!rows.some((row) => row?.request_id === selected.id && row.is_paid === true && row.status?.toLowerCase() === "paid")) {
        throw new Error("Payment confirmation could not be verified. Refresh the queue to check its status before trying again.");
      }
      const queues = response.data?.queues;
      const forwarded = response.data?.queued === true && Array.isArray(queues) && queues.length > 0
        && queues.every((queue) => typeof queue.queue_id === "string" && queue.queue_id.startsWith("LAB-")
          && queue.patient_id === selected.patientId && typeof queue.room === "string" && queue.room.trim());
      const paid: BillingEntry = { ...selected, status: "Paid", needsLabQueue: !forwarded, request: { ...selected.request!, is_paid: true } };
      setConfirmed((previous) => [...previous.filter((entry) => entry.id !== selected.id), paid]);
      if (!forwarded) {
        setSelected(paid);
        setError("Payment is confirmed, but sending to the laboratory could not be verified. Refresh its status or try Send to laboratory again.");
        return;
      }
      setSelected(null);
      const rooms = [...new Set(queues.map((queue) => queue.room))].join(", ");
      setSuccess(`Payment confirmed. ${selected.patientName} was sent to ${rooms}.`);
      requestAnimationFrame(() => headingRef.current?.focus());
      setHistoryLoading(true);
      setHistoryError("");
      const refreshes = await Promise.allSettled([loadData(), loadHistory()]);
      if (refreshes[0].status === "rejected") setSuccess("Payment was confirmed and the request was sent to the laboratory. Refresh to load the latest requests.");
    } catch (cause) {
      setError(message(cause, "Unable to confirm payment. Please try again."));
    } finally { pending.current = false; setSubmitting(false); }
  }

  return <main className="fd-billing" aria-label="Front desk billing">
    {selected ? <ProcessPayment key={selected.id} entry={selected} onBack={backToQueue} onConfirm={confirmPayment} submitting={submitting} error={error} /> : <>
      <div className="billing-page-heading"><div><h1 ref={headingRef} tabIndex={-1}>Billing queue</h1><p>Manage payment confirmations for laboratory requests.</p><p>Review patient details and services before confirming payment.</p></div></div>
      <div className="billing-stat-grid">
        {[
          { label: "Total requests", value: requests.length, detail: "Requests in this billing queue", icon: ListFilter, color: "blue" },
          { label: "Pending payment", value: requests.filter((entry) => entry.status === "Pending").length, detail: "Awaiting payment confirmation", icon: Clock3, color: "amber" },
          { label: "Paid records", value: historyError || historyLoading ? "—" : records.filter((entry) => entry.status === "Paid").length, detail: "Bills and confirmed laboratory requests", icon: CheckCircle2, color: "green" },
          { label: "Cancelled", value: historyError || historyLoading ? "—" : records.filter((entry) => entry.status === "Cancelled").length, detail: "Cancelled payment records", icon: XCircle, color: "rose" },
        ].map(({ label, value, detail, icon: Icon, color }) => <section className={`billing-stat billing-stat-${color}`} key={label}><div><span>{label}</span><Icon size={22} /></div><strong>{value}</strong><p>{detail}</p></section>)}
      </div>
      {success && <div className="billing-success" role="status"><CheckCircle2 size={21} /><span>{success}</span><button type="button" aria-label="Dismiss payment confirmation" onClick={() => setSuccess("")}>×</button></div>}
      {requests.some((entry) => entry.needsLabQueue) && <BillingNotice>Some paid requests are still awaiting laboratory forwarding. Open the paid request and select Send to laboratory; its payment will stay confirmed.</BillingNotice>}
      <div className="billing-tabs" role="tablist" aria-label="Billing views"><button id="billing-queue-tab" role="tab" aria-selected={tab === "queue"} aria-controls="billing-queue-panel" onClick={() => changeTab("queue")}><ListFilter size={19} />Billing queue<span>{requests.length}</span></button><button id="billing-history-tab" role="tab" aria-selected={tab === "history"} aria-controls="billing-history-panel" onClick={() => changeTab("history")}><Wallet size={19} />Payment history</button></div>
      <section className="billing-table-panel" role="tabpanel" id={tab === "queue" ? "billing-queue-panel" : "billing-history-panel"} aria-labelledby={tab === "queue" ? "billing-queue-tab" : "billing-history-tab"}>
        <div className="billing-toolbar">
          <label className="billing-search"><Search size={20} /><input type="search" aria-label="Search billing requests" placeholder="Search patient name, ID, or request…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
          <select aria-label="Filter by service type" value={serviceType} onChange={(event) => { setServiceType(event.target.value); setPage(1); }}><option value="all">All services</option>{types.map((type) => <option key={type}>{type}</option>)}</select>
          <select aria-label="Filter by payment method" value={method} onChange={(event) => { setMethod(event.target.value); setPage(1); }}><option value="all">All payment methods</option>{methods.map((value) => <option key={value}>{value}</option>)}</select>
          <select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="all">All statuses</option><option>Pending</option><option>Paid</option><option>Cancelled</option></select>
          <BillingButton secondary disabled={busy} busy={busy} onClick={() => { void loadData(); refreshHistory(); }}>{!busy && <RefreshCw size={18} />}Refresh</BillingButton>
        </div>
        {tab === "history" && historyError ? <div className="billing-history-error"><BillingNotice error>Payment history could not be loaded. Your pending requests are still available in Billing queue.</BillingNotice><BillingButton secondary onClick={refreshHistory}>Try again</BillingButton></div> : <BillingQueue entries={visible} expandedId={expandedId} onExpand={setExpandedId} onProcess={openPayment} history={tab === "history"} loading={tab === "history" ? historyLoading : loading} />}
      </section>
      <div className="billing-pagination"><p>Showing {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} {tab === "queue" ? "requests" : "records"}</p><div><BillingButton secondary disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} aria-label="Previous page"><ArrowLeft size={18} /></BillingButton><span>Page {currentPage} of {pages}</span><BillingButton secondary disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)} aria-label="Next page"><ArrowRight size={18} /></BillingButton></div></div>
    </>}
  </main>;
}

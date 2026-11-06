import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, ListFilter, ReceiptText, RefreshCw, Search, Wallet } from "lucide-react";
import api from "../../../lib/axios";
import type { Bill, BillDetails, BillItem, BillingEntry, PaymentOptions } from "../../../interface/Billing";
import type { Patient } from "../../../interface/Patient";
import type { Service } from "../../../interface/Service";
import type { QueueRequests } from "../../../interface/Queue";
import BillingQueue from "../components/Billing/BillingQueue";
import ProcessPayment from "../components/Billing/ProcessPayment";
import { BillingButton, BillingNotice } from "../components/Billing/BillingUi";
import { billEntry, invoiceForBill } from "../components/Billing/billingModel";
import InvoiceTransaction, { InvoicePreview, type Invoice } from "../components/Billing/InvoiceTransaction";
import BillingDialog from "../components/Billing/BillingDialog";
import "../components/Billing/billing.css";

type Props = {
  pendingBills: Bill[]; paidBills: Bill[]; patients: Patient[]; services: Service[];
  queueRequests?: QueueRequests[]; open: boolean; setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadData(): Promise<void>; loading: boolean;
};
type Result = { entry: BillingEntry; invoice: Invoice | null; hasLab: boolean; step: "payment" | "invoice" | "forwarded" };
const PAGE_SIZE = 5;
function errorMessage(cause: unknown) {
  const failure = cause as { response?: { data?: { message?: string } }; message?: string };
  return failure.response?.data?.message || failure.message || "The bill could not be updated. Please refresh its status.";
}

export default function Billing({ pendingBills, paidBills, patients, services, loadData, loading }: Props) {
  const [tab, setTab] = useState<"queue" | "history">("queue");
  const [selected, setSelected] = useState<BillingEntry | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newInvoice, setNewInvoice] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [viewInvoice, setViewInvoice] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState("");
  const [detailCache, setDetailCache] = useState<Record<string, BillItem[]>>({});
  const pending = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  const queue = useMemo(() => [...pendingBills, ...paidBills.filter((bill) => bill.needs_lab_queue)].map((bill) => billEntry(bill, patients, services, bill.status === "Paid" ? undefined : detailCache[bill.bill_id])), [pendingBills, paidBills, patients, services, detailCache]);
  const history = useMemo(() => paidBills.map((bill) => billEntry(bill, patients, services)), [paidBills, patients, services]);
  const entries = tab === "queue" ? queue : history;
  const filtered = entries.filter((entry) => {
    const query = search.trim().toLowerCase();
    return (!query || [entry.id, entry.patientId, entry.patientName, ...entry.lines.map((line) => line.name)].some((value) => value.toLowerCase().includes(query)))
      && (method === "all" || entry.method === method) && (status === "all" || entry.status === status);
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function back() {
    if (pending.current) return;
    requestRef.current?.abort(); setSelected(null); setSelectedInvoice(null); setError(""); setDetailsLoading(false);
    requestAnimationFrame(() => headingRef.current?.focus());
  }
  function done() { setResult(null); setViewInvoice(false); requestAnimationFrame(() => headingRef.current?.focus()); }
  async function expandBill(id: string) {
    if (expandedId === id) { setExpandedId(""); return; }
    setExpandedId(id);
    if (detailCache[id]) return;
    try {
      const response = await api.get<BillDetails>(`/api/fdstaff/billings/${encodeURIComponent(id)}/details`);
      if (response.data.bill?.bill_id !== id || !Array.isArray(response.data.items)) throw new Error("Bill services could not be verified.");
      setDetailCache((cache) => ({ ...cache, [id]: response.data.items }));
    } catch (cause) { setError(errorMessage(cause)); }
  }
  async function openBill(entry: BillingEntry) {
    requestRef.current?.abort();
    const controller = new AbortController(); requestRef.current = controller;
    setSelected(entry); setSelectedInvoice(null); setError(""); setDetailsLoading(true);
    try {
      const response = await api.get<BillDetails>(`/api/fdstaff/billings/${encodeURIComponent(entry.id)}/details`, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (response.data.bill?.bill_id !== entry.id || !Array.isArray(response.data.items)) throw new Error("Bill details could not be verified.");
      const full = billEntry({ ...entry.bill!, ...response.data.bill }, patients, services, response.data.items);
      setSelected(full); setSelectedInvoice(invoiceForBill(full));
    } catch (cause) {
      if (!controller.signal.aborted) { setSelected(null); setError(errorMessage(cause)); }
    } finally { if (!controller.signal.aborted) setDetailsLoading(false); }
  }
  async function confirmPayment(options: PaymentOptions) {
    if (!selected?.bill || pending.current || (selected.status !== "Pending" && !selected.needsLabQueue)) return;
    pending.current = true; setSubmitting(true); setError("");
    try {
      const response = await api.patch(`/api/fdstaff/billings/${encodeURIComponent(selected.id)}/pay`, options);
      const saved = response.data?.bill;
      if (saved?.bill_id !== selected.id || saved.patient_id !== selected.patientId || saved.status !== "Paid") throw new Error("Payment status could not be verified. Refresh this bill before trying again.");
      const forwarded = response.data.queued === true;
      const hasLab = response.data.has_laboratory_items === true;
      const paid = billEntry({ ...selected.bill, ...saved, needs_lab_queue: !forwarded }, patients, services);
      const invoice = invoiceForBill(paid);
      setSelected(paid); setSelectedInvoice(invoice);
      if (!forwarded) setError(response.data.message || "Payment was recorded, but forwarding still needs attention.");
      else {
        setSelected(null);
        setResult({ entry: paid, invoice, hasLab, step: selected.status === "Paid" ? "forwarded" : "payment" });
      }
      // Refresh errors cannot change a successfully recorded payment into a failure.
      setDetailCache({});
      await Promise.allSettled([loadData()]);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { pending.current = false; setSubmitting(false); }
  }

  return <main className="fd-billing" aria-label="Front desk billing">
    {newInvoice ? <InvoiceTransaction patients={patients} services={services} onBack={() => setNewInvoice(false)} onSaved={() => { void loadData(); }} />
      : result && viewInvoice && result.invoice ? <InvoicePreview invoice={result.invoice} patientName={result.entry.patientName} age={result.entry.age} sex={result.entry.sex} date={new Date(result.invoice.billed_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })} onClose={() => { setViewInvoice(false); if (result.hasLab) setResult({ ...result, step: "forwarded" }); else done(); }} />
      : selected ? detailsLoading ? <section className="billing-card"><BillingNotice>Loading selected bill and its services…</BillingNotice><BillingButton secondary onClick={back}>Cancel</BillingButton></section>
        : <ProcessPayment key={selected.id} entry={selected} invoice={selectedInvoice ?? undefined} onBack={back} onConfirm={confirmPayment} submitting={submitting} error={error} />
      : <>
        <div className="billing-page-heading"><div><h1 ref={headingRef} tabIndex={-1}>Billing &amp; payments</h1><p>Review patient bills, record payments, and print or download invoices.</p></div><BillingButton onClick={() => setNewInvoice(true)}><ReceiptText size={18} />New invoice</BillingButton></div>
        <div className="billing-stat-grid">{[
          { label: "Total bills", value: pendingBills.length + paidBills.length, detail: "Patient billing records", icon: ListFilter, color: "blue" },
          { label: "Pending payment", value: pendingBills.length, detail: "Bills awaiting payment", icon: Clock3, color: "amber" },
          { label: "Paid records", value: paidBills.length, detail: "Successfully recorded payments", icon: CheckCircle2, color: "green" },
          { label: "Awaiting laboratory", value: paidBills.filter((bill) => bill.needs_lab_queue).length, detail: "Paid bills needing forwarding", icon: Wallet, color: "amber" },
        ].map(({ label, value, detail, icon: Icon, color }) => <section className={`billing-stat billing-stat-${color}`} key={label}><div><span>{label}</span><Icon size={22} /></div><strong>{value}</strong><p>{detail}</p></section>)}</div>
        {error && <BillingNotice error>{error}</BillingNotice>}
        {queue.some((entry) => entry.needsLabQueue) && <BillingNotice>Some payments are already recorded but their tests still need forwarding. Open the paid bill and choose Send to Laboratory.</BillingNotice>}
        <div className="billing-tabs" role="tablist" aria-label="Billing views">{(["queue", "history"] as const).map((value) => <button key={value} role="tab" aria-selected={tab === value} onClick={() => { setTab(value); setPage(1); setExpandedId(""); setMethod("all"); setStatus("all"); }}>{value === "queue" ? <ListFilter size={19} /> : <Wallet size={19} />}{value === "queue" ? "Billing queue" : "Payment history"}</button>)}</div>
        <section className="billing-table-panel"><div className="billing-toolbar">
          <label className="billing-search"><Search size={20} /><input type="search" aria-label="Search billing requests" placeholder="Search patient name, ID, or bill…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
          <select aria-label="Filter by payment method" value={method} onChange={(event) => { setMethod(event.target.value); setPage(1); }}><option value="all">All payment methods</option>{[...new Set(entries.map((entry) => entry.method))].map((value) => <option key={value}>{value}</option>)}</select>
          <select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="all">All statuses</option><option>Pending</option><option>Paid</option></select>
          <BillingButton secondary disabled={loading} busy={loading} onClick={() => { setDetailCache({}); void loadData(); }}>{!loading && <RefreshCw size={18} />}Refresh</BillingButton>
        </div><BillingQueue entries={visible} expandedId={expandedId} onExpand={(id) => { void expandBill(id); }} onProcess={(entry) => { void openBill(entry); }} history={tab === "history"} loading={loading} /></section>
        <div className="billing-pagination"><p>Showing {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} bills</p><div><BillingButton secondary disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} aria-label="Previous page"><ArrowLeft size={18} /></BillingButton><span>Page {currentPage} of {pages}</span><BillingButton secondary disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)} aria-label="Next page"><ArrowRight size={18} /></BillingButton></div></div>
      </>}
    {result && !viewInvoice && result.step === "payment" && <BillingDialog kind="payment-received" onConfirm={() => setResult({ ...result, step: "invoice" })} />}
    {result && !viewInvoice && result.step === "invoice" && <BillingDialog kind="invoice-generated" title={result.invoice ? undefined : "Payment Recorded"} description={result.invoice ? undefined : "This historical bill has no saved itemized invoice. Its payment remains recorded."} onSecondary={result.invoice ? () => setViewInvoice(true) : undefined} onConfirm={() => result.hasLab ? setResult({ ...result, step: "forwarded" }) : done()} />}
    {result && !viewInvoice && result.step === "forwarded" && <BillingDialog kind={result.hasLab ? "request-forwarded" : "payment-received"} onConfirm={done} />}
  </main>;
}

import { useRef, useState } from "react";
import { ArrowLeft, Check, Download, Plus, Printer, Trash2, UserRound, X } from "lucide-react";
import type { Patient } from "../../../../interface/Patient";
import type { Service } from "../../../../interface/Service";
import api from "../../../../lib/axios";
import { billingDate, patientAge, numericAmount } from "./billingModel";
import { outputInvoice } from "./invoiceOutput";
import BillingDialog from "./BillingDialog";
import { useUnsavedChanges } from "./useUnsavedChanges";

type Props = {
  patients: Patient[];
  services: Service[];
  onBack: () => void;
  onSaved: () => void;
};

type InvoiceItem = {
  request_id?: string;
  service_id?: string;
  service_name: string;
  service_category?: string;
  price: number;
  quantity: number;
};

export type Invoice = {
  bill_id: string;
  receipt_id: string | null;
  patient_id: string;
  items: InvoiceItem[];
  discount_pct: number;
  total_amount: number;
  payment_method: string;
  status: string;
  billed_at: string;
};

const peso = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

function useInvoiceOutput(filename: string) {
  const paperRef = useRef<HTMLElement>(null);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [action, setAction] = useState<"print" | "download" | null>(null);
  async function run(download: boolean) {
    if (!paperRef.current || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try { await outputInvoice(paperRef.current, filename, download); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The invoice could not be exported. Please try again."); }
    finally { pending.current = false; setBusy(false); }
  }
  const outputDialog = action ? <BillingDialog kind={action} busy={busy} onCancel={() => setAction(null)} onConfirm={async () => { await run(action === "download"); setAction(null); }} /> : null;
  const requestOutput = (download: boolean) => setAction(download ? "download" : "print");
  return { paperRef, busy, error, requestOutput, outputDialog };
}

export default function InvoiceTransaction({ patients, services, onBack, onSaved }: Props) {
  const [patientId, setPatientId] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [seniorDiscount, setSeniorDiscount] = useState(false);
  const [customDiscountAmount, setCustomDiscountAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [reference, setReference] = useState("");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [generatedInvoice, setGeneratedInvoice] = useState<Invoice | null>(null);
  const [resultStep, setResultStep] = useState<"payment" | "invoice">("payment");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errorOpen, setErrorOpen] = useState(false);
  const pending = useRef(false);
  const [draftDate] = useState(() => new Date().toISOString());
  const selected = services.filter((service) => serviceIds.includes(service.service_id));
  const subtotal = selected.reduce((sum, service) => sum + Number(service.price), 0);
  const patient = patients.find((row) => row.patient_id === (invoice?.patient_id || patientId));
  const patientName = patient ? [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ") : "";
  const age = patientAge(patient?.birthdate);
  const seniorDiscountAmount = seniorDiscount && age !== null && age >= 60 ? subtotal * 0.2 : 0;
  const customAmount = Math.max(0, Number(customDiscountAmount) || 0);
  const requestedDiscount = Math.min(subtotal, seniorDiscountAmount || customAmount);
  const discountLabel = seniorDiscountAmount > 0 ? "Senior Citizen (20%)" : customAmount > 0 ? "Custom discount" : "No discount";
  const total = Math.max(0, Math.round((subtotal - requestedDiscount) * 100) / 100);
  const discountAmount = Math.round((subtotal - total) * 100) / 100;
  const valid = Boolean(patientId && selected.length && selected.every((service) => numericAmount(service.price) !== null) && customAmount <= subtotal && (method === "Cash" || reference.trim().length > 0));
  const date = new Date(invoice?.billed_at || draftDate).toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  const dirty = !invoice && !generatedInvoice && Boolean(patientId || serviceIds.length || customDiscountAmount || method !== "Cash");
  const { requestLeave, discardDialog } = useUnsavedChanges(dirty, busy);
  async function submit() {
    if (pending.current || !valid) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setErrorOpen(false);

    try {
      const response = await api.post("/api/fdstaff/billing", {
        patient_id: patientId,
        services_ids: serviceIds,
        discount_pct: seniorDiscountAmount > 0 ? 20 : 0,
        discount_type: seniorDiscountAmount > 0 ? "Senior Citizen" : customAmount > 0 ? "Custom" : "Not Eligible",
        discount_amount: customAmount > 0 ? customAmount : undefined,
        payment_method: method,
        reference_num: reference.trim(),
        status: "Paid",
      });
      const savedInvoice = response.data?.bill;

      if (!savedInvoice?.bill_id || savedInvoice.status !== "Paid") {
        throw new Error("Invoice could not be verified.");
      }

      setGeneratedInvoice(savedInvoice);
      setResultStep("payment");
      setConfirm(false);
      onSaved();
    } catch (cause) {
      const errorResponse = cause as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        errorResponse.response?.data?.message ||
          errorResponse.message ||
          "Payment could not be recorded.",
      );
      setConfirm(false);
      setErrorOpen(true);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function closePreview() {
    setInvoice(null);
    onBack();
  }
  return (
    <section className="billing-transaction">
      <header className="billing-transaction-heading">
        <button
          className="billing-secondary"
          onClick={() => invoice ? closePreview() : requestLeave(onBack)} disabled={busy}
        >
          <ArrowLeft size={18} /> Back to Billing Queue
        </button>
        <div>
          <h1>{invoice ? "Invoice preview" : "Invoice"}</h1>
          <p>
            {invoice
              ? "Payment recorded successfully. Review, print, or download the invoice."
              : "Generate an invoice for a patient's selected services and view the total amount due before payment."}
          </p>
        </div>
      </header>
      {error && !invoice && <p className="billing-inline-error" role="alert">{error}</p>}

      {invoice ? (
        <InvoicePreview
          invoice={invoice}
          patientName={patientName}
          age={patientAge(patient?.birthdate)}
          sex={patient?.sex}
          date={date}
          onClose={closePreview}
        />
      ) : (
        <div className="billing-transaction-grid">
          <fieldset className="billing-transaction-form" disabled={busy}>
            <PatientSelection
              patients={patients}
              patientId={patientId}
              patientName={patientName}
              age={age}
              onChange={(nextId) => {
                setPatientId(nextId);
                const nextPatient = patients.find((row) => row.patient_id === nextId);
                const nextAge = patientAge(nextPatient?.birthdate);
                setSeniorDiscount(nextAge !== null && nextAge >= 60);
                setCustomDiscountAmount("");
              }}
            />
            <ServiceSelection
              services={services}
              selectedIds={serviceIds}
              onChange={setServiceIds}
            />
            <DiscountAdjustments
              seniorEligible={age !== null && age >= 60}
              seniorDiscount={seniorDiscount}
              customAmount={customDiscountAmount}
              onSeniorChange={(value) => { setSeniorDiscount(value); if (value) setCustomDiscountAmount(""); }}
              onCustomAmountChange={(value) => { setCustomDiscountAmount(value); if (Number(value) > 0) setSeniorDiscount(false); }}
            />
            <InvoiceTotals
              subtotal={subtotal}
              discountLabel={discountLabel}
              discountAmount={discountAmount}
              itemCount={selected.length}
              total={total}
            />
            <section className="billing-card"><label className="billing-field"><span>Payment Method</span><select value={method} onChange={(event) => setMethod(event.target.value)}><option>Cash</option><option>Instapay/QRpH</option></select></label></section>
            {method !== "Cash" && <section className="billing-card"><label className="billing-field"><span>Transfer Reference</span><input aria-label="Transfer reference" value={reference} maxLength={50} onChange={(event) => setReference(event.target.value)} placeholder="Enter the received transfer reference" /></label></section>}
            {customAmount > subtotal && <p className="billing-inline-error" role="alert">The discount cannot exceed the subtotal.</p>}
          </fieldset>
          <DraftInvoicePreview patientName={patientName} patientId={patientId} age={age} sex={patient?.sex} items={selected} discountLabel={discountLabel} discountAmount={discountAmount} total={total} />
        </div>
      )}

      {!invoice && <footer className="billing-transaction-actions"><button className="billing-secondary" disabled={busy} onClick={() => requestLeave(onBack)}>Cancel</button><button className="billing-primary" disabled={!valid || busy || Boolean(generatedInvoice)} onClick={() => setConfirm(true)}><Check size={18} />{busy ? "Recording…" : "Payment Received"}</button></footer>}

      {confirm && (
        <ConfirmationDialog
          patientName={patientName}
          total={total}
          busy={busy}
          onCancel={() => setConfirm(false)}
          onConfirm={() => void submit()}
        />
      )}
      {generatedInvoice && !invoice && resultStep === "payment" && <BillingDialog kind="payment-received" onConfirm={() => setResultStep("invoice")} />}
      {generatedInvoice && !invoice && resultStep === "invoice" && (
        <InvoiceGeneratedDialog
          onViewInvoice={() => {
            setInvoice(generatedInvoice);
            setGeneratedInvoice(null);
          }}
          onDone={onBack}
        />
      )}
      {errorOpen && <BillingDialog kind="payment-failed" description={error} onConfirm={() => setErrorOpen(false)} />}
      {discardDialog}
    </section>
  );
}

function DraftInvoicePreview({ patientName, patientId, age, sex, items, discountLabel, discountAmount, total }: { patientName: string; patientId: string; age: number | null; sex?: string; items: Service[]; discountLabel: string; discountAmount: number; total: number }) {
  const { paperRef, busy: outputBusy, error: outputError, requestOutput, outputDialog } = useInvoiceOutput("Invoice-Draft");
  const subtotal = items.reduce((sum, item) => sum + Number(item.price), 0);
  const [createdAt] = useState(() => new Date().toISOString());
  const date = new Date(createdAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  return <aside className="invoice-preview-panel" aria-label="Live invoice preview">
    <div className="invoice-preview-controls"><button className="billing-secondary" disabled={outputBusy || !patientId || !items.length} onClick={() => requestOutput(false)}><Printer size={18} />Print Invoice</button><button className="billing-primary" disabled={outputBusy || !patientId || !items.length} onClick={() => requestOutput(true)}><Download size={18} />{outputBusy ? "Preparing…" : "Download PDF"}</button></div>
    {outputError && <p role="alert" className="billing-inline-error">{outputError}</p>}
    {outputDialog}
    <div className="invoice-preview-container"><p className="invoice-preview-help">Use the form below to generate and download for the patient.</p>
      <article ref={paperRef} className="invoice-paper" aria-label="Invoice document preview">
        <div className="invoice-document-header"><div className="invoice-clinic-brand"><img src="/assets/reyna-g-logo.png" alt="Reyna G clinic logo" /><div><h2>Reyna G Medical Clinic</h2><p>Diagnostic &amp; Medical Services</p></div></div><div className="invoice-document-id"><h2>INVOICE</h2><p>DRAFT · Not yet paid</p><p>Invoice No: Generated after payment</p><p>Date &amp; Time: {date}</p></div></div>
        <section className="invoice-patient-details"><h3>Patient Information</h3><div><span>Patient:</span><strong>{patientName || "Select a patient"}</strong><span>Request ID:</span><strong>—</strong></div><div><span>Patient ID:</span><strong>{patientId || "—"}</strong><span>Date:</span><strong>{billingDate(createdAt)}</strong></div><div><span>Age / Gender:</span><strong>{age == null ? "Not recorded" : `${age} years old`}{sex ? ` / ${sex}` : ""}</strong><span /><strong /></div></section>
        <div className="invoice-table-scroll"><table><thead><tr><th>#</th><th>Service Name</th><th>Category</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead><tbody>{items.length ? items.map((item, index) => <tr key={item.service_id}><td>{index + 1}</td><td>{item.service_name}</td><td>{item.service_category || item.service_type}</td><td>1</td><td>{peso(Number(item.price))}</td><td>{peso(Number(item.price))}</td></tr>) : <tr><td colSpan={6} className="invoice-draft-empty">Selected services will appear here.</td></tr>}</tbody></table></div>
        <div className="invoice-totals"><div><span>Subtotal ({items.length} items)</span><strong>{peso(subtotal)}</strong></div><div><span>Discount — {discountLabel}</span><strong className="invoice-green">− {peso(discountAmount)}</strong></div><div className="invoice-grand-total"><span>Total Amount Due</span><strong>{peso(total)}</strong></div></div>
        <section className="invoice-document-notes"><strong>Notes</strong><p>• This invoice is a statement of charges for the requested services.</p><p>• The final amount due must be settled at the billing counter.</p><p>• This is not a proof of payment or official receipt.</p></section>
      </article>
    </div>
  </aside>;
}

function PatientSelection({
  patients,
  patientId,
  patientName,
  age,
  onChange,
}: {
  patients: Patient[];
  patientId: string;
  patientName: string;
  age: number | null;
  onChange: (patientId: string) => void;
}) {
  const patient = patients.find((row) => row.patient_id === patientId);

  return (
    <section className="billing-card invoice-patient-card">
      <div className="invoice-card-heading"><h2>Patient Information</h2><label className="invoice-patient-select">
        <span>Select patient</span>
        <select value={patientId} onChange={(event) => onChange(event.target.value)}>
          <option value="">Choose a patient</option>
          {patients.map((row) => (
            <option key={row.patient_id} value={row.patient_id}>
              {[row.first_name, row.last_name].filter(Boolean).join(" ")} · {row.patient_id}
            </option>
          ))}
        </select>
      </label></div>
      <div className="invoice-patient-summary"><span className="invoice-patient-avatar"><UserRound size={22} /></span><div className="invoice-patient-selected"><strong>{patientName || "Choose a patient"}</strong><small>{patient?.patient_id || "Patient ID unavailable"}</small>{age !== null && age >= 60 && <span className="invoice-senior-badge">Senior Citizen</span>}</div><div><span>Age / Gender</span><strong>{age == null ? "Not recorded" : `${age} years old`}</strong><strong>{patient?.sex || "Not recorded"}</strong></div><div><span>Request ID</span><strong>—</strong></div></div>
      {patient && (
        <div className="invoice-patient">
          <span>Selected patient</span>
          <strong>{patientName}</strong>
          <small>
            {patient.patient_id} · {patient.sex || "Sex not recorded"}
          </small>
        </div>
      )}
    </section>
  );
}

function ServiceSelection({
  services,
  selectedIds,
  onChange,
}: {
  services: Service[];
  selectedIds: string[];
  onChange: (serviceIds: string[]) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSelection, setPickerSelection] = useState<string[]>([]);
  const [removing, setRemoving] = useState<Service | null>(null);
  const selected = services.filter((service) => selectedIds.includes(service.service_id));
  const available = services.filter((service) => service.active && !selectedIds.includes(service.service_id));
  return (
    <section className="billing-card invoice-selected-services">
      <div className="invoice-card-heading"><h2>Selected Services <span className="invoice-item-count">{selected.length} {selected.length === 1 ? "item" : "items"}</span></h2><button className="billing-primary invoice-add-service" onClick={() => { setPickerSelection([]); setPickerOpen(true); }}><Plus size={17} />Add Service</button></div>
      <div className="invoice-selected-table-wrap"><table className="invoice-selected-table"><thead><tr><th>#</th><th>Service Name</th><th>Category</th><th>Unit Price</th><th>Qty</th><th>Amount</th><th /></tr></thead><tbody>{selected.length ? selected.map((service, index) => <tr key={service.service_id}><td>{index + 1}</td><td>{service.service_name}</td><td>{service.service_category || service.service_type}</td><td>{peso(Number(service.price))}</td><td>1</td><td>{peso(Number(service.price))}</td><td><button type="button" className="invoice-remove-service" aria-label={`Remove ${service.service_name}`} onClick={() => setRemoving(service)}><Trash2 size={15} /></button></td></tr>) : <tr><td colSpan={7} className="invoice-draft-empty">Add services to build the invoice.</td></tr>}</tbody><tfoot><tr><td colSpan={5}>Subtotal ({selected.length} {selected.length === 1 ? "item" : "items"})</td><td>{peso(selected.reduce((sum, service) => sum + Number(service.price), 0))}</td><td /></tr></tfoot></table></div>
      {removing && <BillingDialog kind="remove-service" description={`Are you sure you want to remove "${removing.service_name}" from the selected services?`} onCancel={() => setRemoving(null)} onConfirm={() => { onChange(selectedIds.filter((id) => id !== removing.service_id)); setRemoving(null); }} />}
      {pickerOpen && <div className="billing-modal-backdrop" role="presentation"><section className="billing-modal invoice-service-picker" role="dialog" aria-modal="true" aria-labelledby="invoice-service-picker-title"><button className="billing-modal-close" aria-label="Close" onClick={() => setPickerOpen(false)}><X /></button><div><h2 id="invoice-service-picker-title">Add services</h2><p>Select the services to include in this invoice.</p></div><div className="invoice-picker-list">{available.length ? available.map((service) => <label key={service.service_id} className="invoice-picker-row"><input type="checkbox" checked={pickerSelection.includes(service.service_id)} onChange={(event) => setPickerSelection(event.target.checked ? [...pickerSelection, service.service_id] : pickerSelection.filter((id) => id !== service.service_id))} /><span><strong>{service.service_name}</strong><small>{service.service_category || service.service_type}</small></span><b>{peso(Number(service.price))}</b></label>) : <p>All active services are already selected.</p>}</div><div className="billing-modal-actions"><button className="billing-secondary" onClick={() => setPickerOpen(false)}>Cancel</button><button className="billing-primary" onClick={() => { onChange([...selectedIds, ...pickerSelection]); setPickerOpen(false); }}>Add selected</button></div></section></div>}
    </section>
  );
}

function DiscountAdjustments({ seniorEligible, seniorDiscount, customAmount, onSeniorChange, onCustomAmountChange }: { seniorEligible: boolean; seniorDiscount: boolean; customAmount: string; onSeniorChange: (value: boolean) => void; onCustomAmountChange: (value: string) => void }) {
  return <section className="billing-card invoice-discounts"><h2>Discounts &amp; Adjustments</h2><div className="invoice-discount-grid"><label className="billing-field"><span>Discount Eligibility</span><select value={seniorDiscount && seniorEligible ? "senior" : "none"} onChange={(event) => onSeniorChange(event.target.value === "senior")}><option value="none">No discount</option>{seniorEligible && <option value="senior">Senior Citizen (20% Discount)</option>}</select></label><label className="billing-field"><span>Custom Discount (Optional)</span><div className="invoice-money-input"><span>₱</span><input type="number" min="0" step="0.01" value={customAmount} onChange={(event) => onCustomAmountChange(event.target.value)} placeholder="Enter discount amount..." /></div></label></div></section>;
}

function InvoiceTotals({ subtotal, discountLabel, discountAmount, itemCount, total }: { subtotal: number; discountLabel: string; discountAmount: number; itemCount: number; total: number }) {
  return <section className="billing-card invoice-totals-card"><div><span>Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</span><strong>{peso(subtotal)}</strong></div><div><span>Discount — {discountLabel}</span><strong className="invoice-green">− {peso(discountAmount)}</strong></div><div className="invoice-due"><span>Total Amount Due</span><strong>{peso(total)}</strong></div></section>;
}

export function InvoicePreview({
  invoice,
  patientName,
  age,
  sex,
  date,
  onClose,
  showDone = true,
}: {
  invoice: Invoice;
  patientName: string;
  age?: number | null;
  sex?: string;
  date: string;
  onClose: () => void;
  showDone?: boolean;
}) {
  const { paperRef, busy: outputBusy, error: outputError, requestOutput, outputDialog } = useInvoiceOutput(`Invoice-${invoice.bill_id}`);
  const subtotal = invoice.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const requestId = invoice.items.find((item) => item.request_id)?.request_id;

  return (
    <section className="invoice-preview-shell" aria-label="Invoice preview">
      <div className="invoice-preview-controls">
        <button className="billing-secondary" disabled={outputBusy} onClick={() => requestOutput(false)}><Printer size={18} />Print Invoice</button>
        <button className="billing-primary" disabled={outputBusy} onClick={() => requestOutput(true)}><Download size={18} />{outputBusy ? "Preparing…" : "Download PDF"}</button>
        {showDone && <button className="billing-secondary" onClick={onClose}>Done</button>}
      </div>
      {outputError && <p role="alert" className="billing-inline-error">{outputError}</p>}
      {outputDialog}
      <div className="invoice-preview-container">
        <p className="invoice-preview-help">Use the form below to generate and download for the patient.</p>
        <article ref={paperRef} className="invoice-paper" aria-label="Invoice document">
          <div className="invoice-document-header">
            <div className="invoice-clinic-brand">
              <img src="/assets/reyna-g-logo.png" alt="Reyna G clinic logo" />
              <div><h2>Reyna G Medical Clinic</h2><p>Diagnostic &amp; Medical Services</p></div>
            </div>
            <div className="invoice-document-id"><h2>INVOICE</h2><p>Invoice No: {invoice.bill_id}</p><p>Date &amp; Time: {date}</p></div>
          </div>
          <section className="invoice-patient-details">
            <h3>Patient Information</h3>
            <div><span>Patient:</span><strong>{patientName || invoice.patient_id}</strong><span>Request ID:</span><strong>{requestId || "—"}</strong></div>
            <div><span>Patient ID:</span><strong>{invoice.patient_id}</strong><span>Date:</span><strong>{billingDate(invoice.billed_at)}</strong></div>
            <div><span>Age / Gender:</span><strong>{age == null ? "Not recorded" : `${age} years old`}{sex ? ` / ${sex}` : ""}</strong><span /> <span /></div>
          </section>
          <div className="invoice-table-scroll"><table>
            <thead><tr><th>#</th><th>Service Name</th><th>Category</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead>
            <tbody>{invoice.items.map((item, index) => <tr key={`${item.service_id || item.service_name}-${index}`}><td>{index + 1}</td><td>{item.service_name}</td><td>{item.service_category || "—"}</td><td>{item.quantity}</td><td>{peso(item.price)}</td><td>{peso(item.price * item.quantity)}</td></tr>)}</tbody>
          </table></div>
          <div className="invoice-totals">
            <div><span>Subtotal ({invoice.items.length} items)</span><strong>{peso(subtotal)}</strong></div>
            <div><span>Discount ({invoice.discount_pct}%)</span><strong className="invoice-green">− {peso(Math.max(0, Math.round((subtotal - Number(invoice.total_amount)) * 100) / 100))}</strong></div>
            <div className="invoice-grand-total"><span>Total Amount Due</span><strong>{peso(Number(invoice.total_amount))}</strong></div>
          </div>
          <section className="invoice-document-notes"><strong>Payment Information</strong><p>Status: {invoice.status} · Payment method: {invoice.payment_method}</p>{invoice.receipt_id && <p>Receipt reference: {invoice.receipt_id}</p>}<p>This invoice itemizes the selected services. Keep your official receipt as proof of payment.</p></section>
        </article>
      </div>
    </section>
  );
}

function ConfirmationDialog({ patientName, total, busy, onCancel, onConfirm }: {
  patientName: string; total: number; busy: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  return <BillingDialog kind="confirm-payment" description={`This will record ${peso(total)} as received for ${patientName}, mark the transaction as Paid, and generate an invoice.`} busy={busy} onCancel={onCancel} onConfirm={onConfirm} />;
}

function InvoiceGeneratedDialog({ onViewInvoice, onDone }: { onViewInvoice: () => void; onDone: () => void }) {
  return <BillingDialog kind="invoice-generated" onSecondary={onViewInvoice} onConfirm={onDone} />;
}

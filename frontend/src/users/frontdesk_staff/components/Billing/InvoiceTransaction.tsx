import { useMemo, useState } from "react";
import { ArrowLeft, Check, Download, Printer, ReceiptText, X } from "lucide-react";
import type { Patient } from "../../../../interface/Patient";
import type { Service } from "../../../../interface/Service";
import api from "../../../../lib/axios";

type Props = {
  patients: Patient[];
  services: Service[];
  onBack: () => void;
  onSaved: () => void;
};

type InvoiceItem = {
  service_name: string;
  service_category?: string;
  price: number;
  quantity: number;
};

type Invoice = {
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

export default function InvoiceTransaction({ patients, services, onBack, onSaved }: Props) {
  const [patientId, setPatientId] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState("Cash");
  const [received, setReceived] = useState("");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [generatedInvoice, setGeneratedInvoice] = useState<Invoice | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = services.filter((service) => serviceIds.includes(service.service_id));
  const subtotal = selected.reduce((sum, service) => sum + Number(service.price), 0);
  const total = Math.round(subtotal * (1 - discount / 100) * 100) / 100;
  const patient = patients.find((row) => row.patient_id === (invoice?.patient_id || patientId));
  const patientName = patient ? [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ") : "";
  const change = Number(received) - total;
  const date = useMemo(() => new Date(invoice?.billed_at || Date.now()).toLocaleString("en-PH", { timeZone: "Asia/Manila" }), [invoice]);
  async function submit() {
    setBusy(true);
    setError("");

    try {
      const response = await api.post("/api/fdstaff/billing", {
        patient_id: patientId,
        services_ids: serviceIds,
        discount_pct: discount,
        payment_method: method,
        status: "Paid",
      });
      const savedInvoice = response.data?.bill;

      if (!savedInvoice?.bill_id || savedInvoice.status !== "Paid") {
        throw new Error("Invoice could not be verified.");
      }

      setGeneratedInvoice(savedInvoice);
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
    } finally {
      setBusy(false);
    }
  }
  function print() {
    window.print();
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
          onClick={invoice ? closePreview : onBack}
        >
          <ArrowLeft size={18} /> Back to billing
        </button>
        <div>
          <span className="billing-kicker">Front desk · Billing</span>
          <h1>{invoice ? "Invoice preview" : "Process payment"}</h1>
          <p>
            {invoice
              ? "Payment recorded successfully. Review, print, or download the invoice."
              : "Capture the transaction details and issue an invoice."}
          </p>
        </div>
      </header>

      {invoice ? (
        <InvoicePreview
          invoice={invoice}
          patientName={patientName}
          date={date}
          onPrint={print}
          onClose={closePreview}
        />
      ) : (
        <div className="billing-transaction-grid">
          <div className="billing-transaction-form">
            <PatientSelection
              patients={patients}
              patientId={patientId}
              patientName={patientName}
              onChange={setPatientId}
            />
            <ServiceSelection
              services={services}
              selectedIds={serviceIds}
              onChange={setServiceIds}
            />
            <PaymentDetails
              discount={discount}
              method={method}
              received={received}
              total={total}
              error={error}
              onDiscountChange={setDiscount}
              onMethodChange={setMethod}
              onReceivedChange={setReceived}
            />
          </div>
          <PaymentSummary
            subtotal={subtotal}
            discount={discount}
            method={method}
            itemCount={selected.length}
            total={total}
            canSubmit={Boolean(patientId && selected.length) && !busy}
            received={received}
            onSubmit={() => setConfirm(true)}
          />
        </div>
      )}

      {confirm && (
        <ConfirmationDialog
          patientName={patientName}
          total={total}
          busy={busy}
          onCancel={() => setConfirm(false)}
          onConfirm={() => void submit()}
        />
      )}
      {generatedInvoice && !invoice && (
        <InvoiceGeneratedDialog
          onViewInvoice={() => {
            setInvoice(generatedInvoice);
            setGeneratedInvoice(null);
          }}
          onDone={onBack}
        />
      )}
    </section>
  );
}

function PatientSelection({
  patients,
  patientId,
  patientName,
  onChange,
}: {
  patients: Patient[];
  patientId: string;
  patientName: string;
  onChange: (patientId: string) => void;
}) {
  const patient = patients.find((row) => row.patient_id === patientId);

  return (
    <section className="billing-card">
      <h2>Patient information</h2>
      <label className="billing-field">
        Select patient
        <select value={patientId} onChange={(event) => onChange(event.target.value)}>
          <option value="">Choose a patient</option>
          {patients.map((row) => (
            <option key={row.patient_id} value={row.patient_id}>
              {[row.first_name, row.last_name].filter(Boolean).join(" ")} · {row.patient_id}
            </option>
          ))}
        </select>
      </label>
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
  return (
    <section className="billing-card">
      <h2>Services</h2>
      <div className="invoice-service-list">
        {services.filter((service) => service.active).map((service) => {
          const selected = selectedIds.includes(service.service_id);

          return (
            <label key={service.service_id} className="invoice-service">
              <input
                type="checkbox"
                checked={selected}
                onChange={(event) => {
                  const nextIds = event.target.checked
                    ? [...selectedIds, service.service_id]
                    : selectedIds.filter((id) => id !== service.service_id);
                  onChange(nextIds);
                }}
              />
              <span>
                <strong>{service.service_name}</strong>
                <small>{service.service_category || service.service_type}</small>
              </span>
              <b>{peso(Number(service.price))}</b>
            </label>
          );
        })}
      </div>
    </section>
  );
}

function PaymentDetails({
  discount,
  method,
  received,
  total,
  error,
  onDiscountChange,
  onMethodChange,
  onReceivedChange,
}: {
  discount: number;
  method: string;
  received: string;
  total: number;
  error: string;
  onDiscountChange: (discount: number) => void;
  onMethodChange: (method: string) => void;
  onReceivedChange: (amount: string) => void;
}) {
  const change = Number(received) - total;
  const hasAmount = received !== "" && Number.isFinite(change);
  const amountLabel = !hasAmount
    ? "Amount due"
    : change < 0
      ? "Amount remaining"
      : "Change";
  const displayedAmount = hasAmount && change >= 0 ? change : total;

  return (
    <section className="billing-card">
      <h2>Discount &amp; payment</h2>
      <div className="billing-form-columns">
        <label className="billing-field">
          Discount %
          <input
            type="number"
            min="0"
            max="100"
            value={discount}
            onChange={(event) =>
              onDiscountChange(Math.max(0, Math.min(100, Number(event.target.value))))
            }
          />
        </label>
        <label className="billing-field">
          Payment method
          <select value={method} onChange={(event) => onMethodChange(event.target.value)}>
            <option>Cash</option>
            <option>Instapay/QRph</option>
          </select>
        </label>
        <label className="billing-field">
          Cash received
          <input
            type="number"
            min="0"
            step="0.01"
            value={received}
            onChange={(event) => onReceivedChange(event.target.value)}
            placeholder="Enter amount received"
          />
        </label>
        <div className="billing-change">
          <span>{amountLabel}</span>
          <strong>{peso(displayedAmount)}</strong>
        </div>
      </div>
      {error && <p className="billing-inline-error" role="alert">{error}</p>}
    </section>
  );
}

function PaymentSummary({
  subtotal,
  discount,
  method,
  itemCount,
  total,
  canSubmit,
  received,
  onSubmit,
}: {
  subtotal: number;
  discount: number;
  method: string;
  itemCount: number;
  total: number;
  canSubmit: boolean;
  received: string;
  onSubmit: () => void;
}) {
  const receivedLessThanTotal = received !== "" && Number(received) < total;

  return (
    <aside className="billing-card invoice-summary">
      <h2>Payment summary</h2>
      <div><span>Selected services</span><b>{itemCount} items</b></div>
      <div><span>Subtotal</span><b>{peso(subtotal)}</b></div>
      <div>
        <span>Discount</span>
        <b className="invoice-green">− {peso(subtotal * discount / 100)}</b>
      </div>
      <div className="invoice-due">
        <span>Total amount due</span>
        <strong>{peso(total)}</strong>
      </div>
      <div><span>Payment method</span><b>{method}</b></div>
      <div className="billing-note">
        <ReceiptText size={17} />
        Confirming records payment and issues a receipt for this invoice.
      </div>
      <button
        className="billing-primary invoice-submit"
        disabled={!canSubmit || receivedLessThanTotal}
        onClick={onSubmit}
      >
        <Check size={18} /> Confirm &amp; record payment
      </button>
    </aside>
  );
}

function InvoicePreview({
  invoice,
  patientName,
  date,
  onPrint,
  onClose,
}: {
  invoice: Invoice;
  patientName: string;
  date: string;
  onPrint: () => void;
  onClose: () => void;
}) {
  const subtotal = invoice.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return (
    <article className="invoice-paper" aria-label="Invoice preview">
      <div className="invoice-brand">
        <div className="invoice-mark">RG</div>
        <div>
          <h2>Reyna G Diagnostic Medical Clinic</h2>
          <p>Payment invoice</p>
        </div>
        <span className="invoice-paid">PAID</span>
      </div>
      <div className="invoice-meta">
        <div><span>Invoice</span><strong>{invoice.bill_id}</strong></div>
        <div><span>Receipt</span><strong>{invoice.receipt_id || "—"}</strong></div>
        <div><span>Date</span><strong>{date}</strong></div>
      </div>
      <div className="invoice-patient">
        <span>Patient</span>
        <strong>{patientName || invoice.patient_id}</strong>
        <small>{invoice.patient_id}</small>
      </div>
      <table>
        <thead>
          <tr>
            <th>Service</th><th>Category</th><th>Qty</th>
            <th>Unit price</th><th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, index) => (
            <tr key={`${item.service_name}-${index}`}>
              <td>{item.service_name}</td>
              <td>{item.service_category || "—"}</td>
              <td>{item.quantity}</td>
              <td>{peso(item.price)}</td>
              <td>{peso(item.price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="invoice-totals">
        <div><span>Subtotal</span><strong>{peso(subtotal)}</strong></div>
        <div>
          <span>Discount ({invoice.discount_pct}%)</span>
          <strong>− {peso(subtotal * invoice.discount_pct / 100)}</strong>
        </div>
        <div className="invoice-grand-total">
          <span>Total paid · {invoice.payment_method}</span>
          <strong>{peso(Number(invoice.total_amount))}</strong>
        </div>
      </div>
      <div className="invoice-actions">
        <button className="billing-secondary" onClick={onPrint}>
          <Printer size={18} /> Print invoice
        </button>
        <button className="billing-secondary" onClick={onPrint}>
          <Download size={18} /> Download / Save PDF
        </button>
        <button className="billing-primary" onClick={onClose}>Done</button>
      </div>
    </article>
  );
}

function ConfirmationDialog({
  patientName,
  total,
  busy,
  onCancel,
  onConfirm,
}: {
  patientName: string;
  total: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="billing-modal-backdrop" role="presentation">
      <section
        className="billing-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="billing-confirm-title"
      >
        <button
          className="billing-modal-close"
          aria-label="Close"
          onClick={onCancel}
        >
          <X />
        </button>
        <span className="billing-modal-icon"><Check size={30} /></span>
        <div>
          <h2 id="billing-confirm-title">Mark as payment received?</h2>
          <p>
            This records {peso(total)} as paid for {patientName} and generates an invoice.
          </p>
        </div>
        <div className="billing-modal-actions">
          <button className="billing-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="billing-primary" onClick={onConfirm} disabled={busy}>
            {busy ? "Recording…" : "Payment received"}
          </button>
        </div>
      </section>
    </div>
  );
}

function InvoiceGeneratedDialog({
  onViewInvoice,
  onDone,
}: {
  onViewInvoice: () => void;
  onDone: () => void;
}) {
  return (
    <div className="billing-modal-backdrop" role="presentation">
      <section
        className="billing-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-generated-title"
      >
        <button
          className="billing-modal-close"
          aria-label="Close"
          onClick={onDone}
        >
          <X />
        </button>
        <span className="billing-modal-icon billing-modal-icon-success">
          <ReceiptText size={30} />
        </span>
        <div>
          <h2 id="invoice-generated-title">Invoice generated</h2>
          <p>The payment was recorded successfully. The invoice is ready to view or print.</p>
        </div>
        <div className="billing-modal-actions">
          <button className="billing-secondary" onClick={onViewInvoice}>
            View invoice
          </button>
          <button className="billing-primary" onClick={onDone}>
            OK
          </button>
        </div>
      </section>
    </div>
  );
}

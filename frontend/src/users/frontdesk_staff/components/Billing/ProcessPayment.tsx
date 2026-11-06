import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Flag, QrCode, UserRound, Wallet } from "lucide-react";
import type { BillingEntry, PaymentOptions } from "../../../../interface/Billing";
import { BillingButton, BillingNotice, BillingStatus, PaymentSummary, ServicesTable } from "./BillingUi";
import { billingDate, money, numericAmount, serviceSubtotal } from "./billingModel";
import { InvoicePreview, type Invoice } from "./InvoiceTransaction";
import BillingDialog from "./BillingDialog";
import { useUnsavedChanges } from "./useUnsavedChanges";

type Props = {
  entry: BillingEntry;
  invoice?: Invoice;
  onBack: () => void;
  onConfirm: (options: PaymentOptions) => Promise<void>;
  submitting: boolean;
  error: string;
};

export default function ProcessPayment({ entry, invoice, onBack, onConfirm, submitting, error }: Props) {
  const initialDiscountType: PaymentOptions["discount_type"] = entry.bill?.is_senior || (entry.age !== null && entry.age >= 60) ? "Senior Citizen" : entry.isPwd ? "PWD" : "Not Eligible";
  const [discountType, setDiscountType] = useState<PaymentOptions["discount_type"]>(initialDiscountType);
  const [reference, setReference] = useState("");
  const [cash, setCash] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentOptions["payment_method"]>(entry.method === "Instapay/QRpH" ? entry.method : "Cash");
  const discount = discountType === "Not Eligible" ? 0 : 20;
  const [priority, setPriority] = useState(entry.isPriority === true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dismissedError, setDismissedError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const recovering = entry.status === "Paid" && entry.needsLabQueue === true;
  const readOnly = !entry.bill || (entry.status !== "Pending" && !recovering);
  const locked = readOnly || recovering;
  const subtotal = serviceSubtotal(entry.lines);
  const total = locked ? entry.total : subtotal === null ? null : Math.round(subtotal * (1 - discount / 100) * 100) / 100;
  const cashReceived = numericAmount(cash);
  const change = total !== null && cashReceived !== null ? Math.round((cashReceived - total) * 100) / 100 : null;
  const valid = recovering || (total !== null && (paymentMethod === "Cash" ? change !== null && change >= 0 : Boolean(reference.trim()) && reference.trim().length <= 50));
  const reviewed: BillingEntry = { ...entry, total, discountPercent: locked ? entry.discountPercent : discount, method: locked ? entry.method : paymentMethod, isPriority: priority, bill: entry.bill ? { ...entry.bill, discount_type: locked ? entry.bill.discount_type : discountType } : undefined };
  const initialMethod = entry.method === "Instapay/QRpH" ? entry.method : "Cash";
  const dirty = !locked && Boolean(cash || reference || discountType !== initialDiscountType || paymentMethod !== initialMethod || priority !== (entry.isPriority === true));
  const { requestLeave, discardDialog } = useUnsavedChanges(dirty, submitting);

  useEffect(() => { headingRef.current?.focus(); }, []);

  const options: PaymentOptions = { payment_method: paymentMethod, discount_type: discountType, amount_received: cashReceived, reference_num: reference.trim(), priority };
  return <div className={`billing-process ${readOnly && invoice ? "billing-process-history" : ""}`}>
    <BillingButton secondary className="billing-back-link" onClick={() => requestLeave(onBack)} disabled={submitting}><ArrowLeft size={18} />Back to Billing Queue</BillingButton>
    <div className="billing-page-heading"><div><h1 ref={headingRef} tabIndex={-1}>{readOnly ? "Payment Details" : recovering ? "Send to Laboratory" : "Process Payment"}</h1><p>Review selected services, apply eligible discounts, and record patient payment.</p></div>{locked && <BillingStatus status={entry.status} />}</div>
    <div className="billing-process-grid">
      <div className="billing-process-main">
        <section className="billing-card">
          <h2>Patient Information</h2>
          <div className="billing-patient-details">
            <div className="billing-patient-name"><span className="billing-avatar"><UserRound size={25} /></span><div><strong>{entry.patientName}</strong><span className="billing-muted">{entry.patientId}</span>{entry.age !== null && entry.age >= 60 && <span className="invoice-senior-badge">Senior Citizen</span>}</div></div>
            <div><span className="billing-label">Age / Gender</span><p>{entry.age === null ? "Not recorded" : `${entry.age} years old`}</p><p>{entry.sex}</p></div>
            <div><span className="billing-label">{entry.referenceLabel || (entry.request ? "Request ID" : "Bill ID")}</span><p className="billing-break">{entry.reference || entry.id}</p></div>
            <div><span className="billing-label">{entry.dateLabel || "Date & Time"}</span><p>{billingDate(entry.createdAt)}</p><p>{billingDate(entry.createdAt, true)}</p></div>
          </div>
        </section>
        <section className="billing-card"><h2>Selected Services</h2><ServicesTable entry={entry} /></section>
        <section className="billing-card">
          <h2>Discount &amp; Priority</h2>
          <div className="billing-two-columns">
            <div><label className="billing-field"><span><CheckCircle2 size={15} />Discount Eligibility</span><select value={locked ? "recorded" : discountType} onChange={(event) => setDiscountType(event.target.value as PaymentOptions["discount_type"])} disabled={locked || submitting}>
              {locked ? <option value="recorded">{entry.discountPercent === null ? "Not recorded" : `${entry.bill?.discount_type || "Recorded discount"} (${entry.discountPercent}%)`}</option> : <><option value="Not Eligible">No discount</option>{(entry.bill?.is_senior || (entry.age !== null && entry.age >= 60)) && <option value="Senior Citizen">Senior Citizen (20% Discount)</option>}{entry.isPwd && <option value="PWD">PWD (20% Discount)</option>}</>}
            </select></label><p className="billing-help">{locked ? "The discount saved with this payment is shown above." : discount ? `A ${discount}% discount will be applied to the total amount.` : "No discount is applied to this payment."}</p><BillingNotice>Only one discount type can be applied. Eligibility is checked against the patient's birthdate and PWD profile.</BillingNotice></div>
            <div><label className="billing-field"><span><Flag size={15} />Queue Priority</span><select value={priority ? "priority" : "regular"} onChange={(event) => setPriority(event.target.value === "priority")} disabled={locked || submitting}><option value="regular">Regular</option><option value="priority">Priority</option></select></label><p className="billing-help">Priority affects queue handling, not the service price.</p></div>
          </div>
        </section>
        <section className="billing-card">
          <h2>Payment Method</h2>
          {locked ? <div className="billing-readonly">{entry.method}</div> : <fieldset className="billing-methods" disabled={submitting}><legend className="sr-only">Payment Method</legend>{(["Cash", "Instapay/QRpH"] as const).map((method) => <label className={`billing-method ${paymentMethod === method ? "billing-method-selected" : ""}`} key={method}><input type="radio" name="payment-method" value={method} checked={paymentMethod === method} onChange={() => setPaymentMethod(method)} />{method === "Cash" ? <Wallet size={19} /> : <QrCode size={19} />}<span>{method}</span></label>)}</fieldset>}
          {!locked && <div className="billing-cash-calculator">
            <div><span className="billing-label">Total Amount Due</span><strong className="billing-blue">{money(total)}</strong></div>
            {paymentMethod === "Cash" ? <><label className="billing-field"><span>Cash Received</span><input aria-label="Cash received" type="number" min={total ?? 0} step="0.01" inputMode="decimal" value={cash} onChange={(event) => setCash(event.target.value)} placeholder="Enter cash amount" disabled={submitting} /></label><div><span className="billing-label">{change !== null && change < 0 ? "Amount Remaining" : "Change"}</span><strong className={change !== null && change < 0 ? "billing-amber" : "billing-green"}>{money(change === null ? 0 : Math.abs(change))}</strong></div></> : <BillingNotice>Verify that the transfer was received before recording payment.</BillingNotice>}
          </div>}
          {!locked && paymentMethod !== "Cash" && <label className="billing-field"><span>Transfer Reference</span><input aria-label="Transfer reference" value={reference} maxLength={50} onChange={(event) => setReference(event.target.value)} disabled={submitting} placeholder="Enter the received transfer reference" /></label>}
          {locked && entry.receiptId && <p className="billing-help">Receipt: {entry.receiptId}</p>}
        </section>
      </div>
      {readOnly && invoice ? <InvoicePreview invoice={invoice} patientName={entry.patientName} age={entry.age} sex={entry.sex} date={new Date(invoice.billed_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })} onClose={onBack} showDone={false} /> : <PaymentSummary entry={reviewed} />}
    </div>
    {error && <section className={`billing-payment-error ${entry.status === "Paid" ? "billing-payment-recorded" : ""}`} role="alert"><div><strong>{entry.status === "Paid" ? "Payment Recorded" : "Payment Could Not Be Recorded"}</strong><p>{error}</p></div><BillingButton secondary disabled={submitting} onClick={() => requestLeave(onBack)}>Back to Queue</BillingButton></section>}
    <footer className="billing-process-actions"><BillingButton secondary disabled={submitting} onClick={() => requestLeave(onBack)}>{readOnly ? "Back to Queue" : "Cancel"}</BillingButton>{!readOnly && <BillingButton busy={submitting} disabled={!valid || submitting} onClick={() => setConfirmOpen(true)}>{submitting ? "Saving…" : recovering ? "Send to Laboratory" : "Confirm & Record Payment"}</BillingButton>}</footer>
    {confirmOpen && <BillingDialog kind="confirm-payment" title={recovering ? "Forward Request?" : undefined} description={recovering ? "This will send the already paid tests to their assigned laboratory rooms. The recorded payment will stay unchanged." : `This will record ${money(total)} as received for ${entry.patientName}, mark the transaction as Paid, and forward the request.`} confirmLabel={recovering ? "Send to Laboratory" : "Payment Received"} busy={submitting} onCancel={() => setConfirmOpen(false)} onConfirm={async () => { setConfirmOpen(false); setDismissedError(""); if (valid && !submitting) await onConfirm(options); }} />}
    {error && error !== dismissedError && <BillingDialog kind={entry.status === "Paid" ? "forwarding-pending" : "payment-failed"} description={error} onConfirm={() => setDismissedError(error)} />}
    {discardDialog}
  </div>;
}


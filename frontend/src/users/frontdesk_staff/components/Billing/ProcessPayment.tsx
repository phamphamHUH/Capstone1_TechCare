import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, CircleDollarSign, Flag, UserRound, Wallet } from "lucide-react";
import type { BillingEntry } from "../../../../interface/Billing";
import { BillingButton, BillingNotice, BillingStatus, PaymentSummary, ServicesTable } from "./BillingUi";
import { billingDate, money, numericAmount } from "./billingModel";

type Props = {
  entry: BillingEntry;
  onBack: () => void;
  onConfirm: () => Promise<void>;
  submitting: boolean;
  error: string;
};

export default function ProcessPayment({ entry, onBack, onConfirm, submitting, error }: Props) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [cash, setCash] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const recovering = entry.status === "Paid" && entry.needsLabQueue === true;
  const readOnly = !entry.request || (entry.status !== "Pending" && !recovering);
  const cashReceived = numericAmount(cash);
  const change = entry.total !== null && cashReceived !== null
    ? Math.round((cashReceived - entry.total) * 100) / 100 : null;

  useEffect(() => { headingRef.current?.focus(); }, []);

  return <div className="billing-process">
    <BillingButton secondary onClick={onBack} disabled={submitting}><ArrowLeft size={18} />Back to billing queue</BillingButton>
    <div className="billing-page-heading"><div><h1 ref={headingRef} tabIndex={-1}>{readOnly ? "Payment details" : recovering ? "Send to laboratory" : "Process payment"}</h1><p>Review the patient, selected services, and payment status.</p></div><BillingStatus status={entry.status} /></div>
    <div className="billing-process-grid">
      <div className="billing-process-main">
        <section className="billing-card">
          <h2>Patient information</h2>
          <div className="billing-patient-details">
            <div className="billing-patient-name"><span className="billing-avatar"><UserRound size={28} /></span><div><strong>{entry.patientName}</strong><span className="billing-muted">{entry.patientId}</span>{entry.age !== null && entry.age >= 60 && <span className="billing-status billing-status-pending">Senior citizen</span>}</div></div>
            <div><span className="billing-label">Age / sex</span><p>{entry.age === null ? "Age not recorded" : `${entry.age} years old`}</p><p>{entry.sex}</p></div>
            <div><span className="billing-label">{entry.referenceLabel || (entry.request ? "Request ID" : "Bill ID")}</span><p className="billing-break">{entry.reference || entry.id}</p></div>
            <div><span className="billing-label">{entry.dateLabel || "Date & time"}</span><p>{billingDate(entry.createdAt)}</p><p>{billingDate(entry.createdAt, true)}</p></div>
          </div>
        </section>
        <section className="billing-card"><h2>Selected services</h2><ServicesTable entry={entry} /></section>
        <section className="billing-card">
          <h2>Discount & priority</h2>
          <div className="billing-two-columns">
            <div><span className="billing-label"><CircleDollarSign size={18} />Recorded discount</span><div className="billing-readonly">{entry.discountPercent === null ? "Not recorded" : `${entry.discountPercent}% discount`}</div><p className="billing-help">Only discounts saved with this payment are shown.</p></div>
            <div><span className="billing-label"><Flag size={18} />Queue priority</span><div className="billing-readonly">Assigned when joining the queue</div><p className="billing-help">Priority changes the queue order, not the service price.</p></div>
          </div>
        </section>
        <section className="billing-card">
          <h2><Wallet size={20} />Payment review</h2>
          <div className="billing-two-columns"><div><span className="billing-label">Payment method</span><div className="billing-readonly">{entry.method}</div></div><div><span className="billing-label">Receipt number</span><div className="billing-readonly">{entry.receiptId || "Not issued"}</div></div></div>
          {entry.total !== null && !readOnly && !recovering && <div className="billing-cash-calculator">
            <div><span className="billing-label">Amount due</span><strong className="billing-blue">{money(entry.total)}</strong></div>
            <label><span className="billing-label">Cash calculator (optional)</span><input type="number" min="0" step="0.01" inputMode="decimal" value={cash} onChange={(event) => setCash(event.target.value)} placeholder="Cash received" disabled={submitting} /><span className="billing-help">For calculating change only.</span></label>
            <div><span className="billing-label">{change !== null && change < 0 ? "Amount remaining" : "Change"}</span><strong className={change !== null && change < 0 ? "billing-amber" : "billing-green"}>{money(change === null ? null : Math.abs(change))}</strong></div>
          </div>}
          {!readOnly && <BillingNotice>{recovering ? "Payment is already confirmed. Sending will place the pending tests in their assigned laboratory room queues." : "Confirming payment also sends the pending tests to their assigned laboratory rooms. Payment method, discounts, and receipt details stay unchanged."}</BillingNotice>}
        </section>
        {!readOnly && <section className="billing-card billing-confirmation">
          <label><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} disabled={submitting} /><span>{recovering ? "I have reviewed this paid request and confirm it should be sent to the laboratory." : "I have verified that payment for this request has been received."}</span></label>
          {error && <BillingNotice error>{error}</BillingNotice>}
        </section>}
      </div>
      <PaymentSummary entry={entry} />
    </div>
    <footer className="billing-process-actions"><BillingButton secondary disabled={submitting} onClick={onBack}>{readOnly ? "Back to queue" : "Cancel"}</BillingButton>{!readOnly && <BillingButton busy={submitting} disabled={!acknowledged || submitting} onClick={() => { if (acknowledged && !submitting) void onConfirm(); }}><CheckCircle2 size={19} />{submitting ? "Sending to laboratory…" : recovering ? "Send to laboratory" : "Confirm & send to laboratory"}</BillingButton>}</footer>
  </div>;
}

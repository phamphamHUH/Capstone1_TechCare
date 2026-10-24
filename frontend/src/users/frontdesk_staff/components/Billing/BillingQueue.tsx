import { Fragment } from "react";
import { ChevronDown, ChevronRight, FlaskConical, ReceiptText } from "lucide-react";
import type { BillingEntry } from "../../../../interface/Billing";
import { BillingButton, BillingStatus, PaymentSummary, ServicesTable } from "./BillingUi";
import { billingDate, money } from "./billingModel";

type Props = {
  entries: BillingEntry[];
  expandedId: string;
  onExpand: (id: string) => void;
  onProcess: (entry: BillingEntry) => void;
  history: boolean;
  loading: boolean;
};

export default function BillingQueue({ entries, expandedId, onExpand, onProcess, history, loading }: Props) {
  return <div className="billing-scroll billing-queue-scroll" role="region" tabIndex={0} aria-label="Billing requests, scroll to see all columns" aria-busy={loading}>
    <table className="billing-queue-table">
      <thead><tr><th aria-label="Expand services" /><th>Date & time</th><th>Patient</th><th>{history ? "Bill / Request ID" : "Request ID"}</th><th>Service(s)</th><th className="billing-number">Amount</th><th>Payment method</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>{loading ? <tr><td colSpan={9} className="billing-empty">Loading billing requests…</td></tr> : !entries.length ? <tr><td colSpan={9} className="billing-empty"><ReceiptText size={32} /><strong>No {history ? "payment records" : "requests"} found</strong><p>Try another search or refresh the list.</p></td></tr> : entries.map((entry) => <Fragment key={entry.id}>
        <tr className={expandedId === entry.id ? "billing-expanded-row" : ""}>
          <td><button className="billing-expand" type="button" onClick={() => onExpand(expandedId === entry.id ? "" : entry.id)} aria-expanded={expandedId === entry.id} aria-label={`${expandedId === entry.id ? "Hide" : "Show"} services for ${entry.patientName}`}>{expandedId === entry.id ? <ChevronDown size={19} /> : <ChevronRight size={19} />}</button></td>
          <td><span className="billing-nowrap">{billingDate(entry.createdAt)}</span><span className="billing-cell-meta">{billingDate(entry.createdAt, true)}</span>{history && <span className="billing-cell-meta">{entry.dateLabel}</span>}</td>
          <td><strong>{entry.patientName}</strong><span className="billing-cell-meta">{entry.patientId}</span>{entry.age !== null && entry.age >= 60 && <span className="billing-status billing-status-pending">Senior citizen</span>}</td>
          <td className="billing-id">{entry.reference || entry.id}{history && <span className="billing-cell-meta">{entry.referenceLabel}</span>}</td>
          <td><span className="billing-service-name"><FlaskConical size={18} />{entry.lines.length === 1 ? entry.lines[0].name : entry.lines.length ? `${entry.type} (${entry.lines.length})` : `${entry.type} request`}</span><span className="billing-cell-meta">{entry.lines.length === 1 ? entry.lines[0].category : entry.requester}</span></td>
          <td className="billing-number billing-strong">{money(entry.total)}</td><td>{entry.method}</td><td><BillingStatus status={entry.status} /></td>
          <td><div className="billing-row-actions">{entry.request && (entry.status === "Pending" || entry.needsLabQueue) && <BillingButton onClick={() => onProcess(entry)}>{entry.needsLabQueue ? "Send to laboratory" : "Process payment"}</BillingButton>}<BillingButton secondary onClick={() => onProcess(entry)}>View</BillingButton></div></td>
        </tr>
        {expandedId === entry.id && <tr><td colSpan={9} className="billing-expanded-cell"><div className="billing-expanded-content"><section className="billing-card"><h2><FlaskConical size={20} />{entry.type} services{entry.lines.length > 0 && <span className="billing-count">{entry.lines.length} tests</span>}</h2><ServicesTable entry={entry} /></section><PaymentSummary entry={entry} /></div></td></tr>}
      </Fragment>)}</tbody>
    </table>
  </div>;
}

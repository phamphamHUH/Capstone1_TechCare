import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Info, LoaderCircle } from "lucide-react";
import type { BillingEntry } from "../../../../interface/Billing";
import { money, serviceSubtotal } from "./billingModel";

export function BillingButton({ secondary = false, busy = false, children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean; busy?: boolean }) {
  return <button type="button" {...props} className={`billing-button ${secondary ? "billing-button-secondary" : ""} ${className}`}>
    {busy && <LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" />}{children}
  </button>;
}

export function BillingNotice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <div role={error ? "alert" : "status"} className={`billing-notice ${error ? "billing-notice-error" : ""}`}><Info size={19} aria-hidden="true" /><div>{children}</div></div>;
}

export function BillingStatus({ status }: { status: BillingEntry["status"] }) {
  return <span className={`billing-status billing-status-${status.toLowerCase()}`}>{status}</span>;
}

export function ServicesTable({ entry }: { entry: BillingEntry }) {
  if (!entry.lines.length) return <BillingNotice>Service details and itemized prices are not available for this request.</BillingNotice>;
  return <div className="billing-scroll" tabIndex={0} role="region" aria-label="Selected services, scroll horizontally">
    <table className="billing-services-table">
      <thead><tr><th>#</th><th>Service name</th><th>Category</th><th>Quantity</th><th className="billing-number">Unit price</th><th className="billing-number">Subtotal</th></tr></thead>
      <tbody>{entry.lines.map((line, index) => <tr key={line.id}><td>{index + 1}</td><td className="billing-strong">{line.name}</td><td className="billing-muted">{line.category}</td><td>{line.quantity}</td><td className="billing-number">{money(line.price)}</td><td className="billing-number billing-strong">{money(line.price === null ? null : line.price * line.quantity)}</td></tr>)}</tbody>
      <tfoot><tr><td colSpan={5}>Subtotal ({entry.lines.length} {entry.lines.length === 1 ? "service" : "services"})</td><td className="billing-number billing-strong">{money(serviceSubtotal(entry.lines))}</td></tr></tfoot>
    </table>
  </div>;
}

export function PaymentSummary({ entry }: { entry: BillingEntry }) {
  const subtotal = serviceSubtotal(entry.lines);
  const discountAmount = subtotal !== null && entry.total !== null ? Math.max(0, Math.round((subtotal - entry.total) * 100) / 100) : null;
  return <aside className="billing-card billing-summary" aria-label="Payment summary">
    <h2>Payment Summary</h2>
    <dl className="billing-summary-list">
      <div><dt>Selected Services</dt><dd>{entry.lines.length || entry.bill?.services_count || 0} items</dd></div>
      <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
      <div><dt>Discount Type</dt><dd>{entry.discountPercent === null ? "Not recorded" : entry.discountPercent === 20 ? (entry.bill?.discount_type === "PWD" ? "PWD (20%)" : entry.bill?.discount_type === "Custom" ? "Custom discount" : "Senior Citizen (20%)") : entry.discountPercent ? `${entry.discountPercent}% discount` : "No discount"}</dd></div>
      <div><dt>Discount Amount</dt><dd className="billing-green">− {money(discountAmount)}</dd></div>
    </dl>
    <div className="billing-total"><span>Total amount due</span><strong>{money(entry.total)}</strong></div>
    <dl className="billing-summary-list"><div><dt>Payment Method</dt><dd>{entry.method}</dd></div><div><dt>Queue Priority</dt><dd>{entry.isPriority ? "⚑ Priority" : "Regular"}</dd></div></dl>
    <BillingNotice>{entry.needsLabQueue ? "Payment is confirmed. This bill still has tests to send to the laboratory." : entry.status === "Paid" ? "Payment is confirmed." : "Review this bill and confirm the payment received. Any laboratory tests will then be forwarded to their assigned rooms."}</BillingNotice>
  </aside>;
}

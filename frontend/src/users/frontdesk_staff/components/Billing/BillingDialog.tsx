import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, CircleAlert, CircleX, Download, Eye, FileText, Info, LoaderCircle, Printer, SquareCheck, Trash2, TriangleAlert, X } from "lucide-react";
import "./billingDialog.css";

const dialogs = {
  print: { title: "Print Invoice?", description: "Do you want to print the invoice for this transaction?", label: "Print Invoice", icon: Printer, tone: "blue" },
  download: { title: "Download Invoice?", description: "Do you want to download this invoice as a PDF file?", label: "Download PDF", icon: Download, tone: "blue" },
  "confirm-payment": { title: "Mark as Payment Received?", description: "This will record the payment and update the transaction status to Paid.", label: "Payment Received", icon: SquareCheck, tone: "blue" },
  "payment-received": { title: "Payment Received", description: "The payment has been successfully recorded. The transaction is now marked as Paid.", label: "OK", icon: CheckCircle2, tone: "green" },
  "invoice-generated": { title: "Invoice Generated", description: "The invoice has been successfully generated and is ready to print or download.", label: "OK", icon: FileText, tone: "green" },
  "request-forwarded": { title: "Request Forwarded", description: "The payment has been recorded and forwarded to the respective department(s).", label: "OK", icon: Info, tone: "blue" },
  "remove-service": { title: "Remove Service?", description: "Are you sure you want to remove this service from the selected services?", label: "Remove", icon: TriangleAlert, tone: "amber" },
  "discard-changes": { title: "Discard Changes?", description: "You have unsaved changes. Discarding them will remove the updates you've made.", label: "Discard Changes", icon: CircleAlert, tone: "amber" },
  "payment-failed": { title: "Payment Failed", description: "The transaction could not be recorded. Please try again or check your connection.", label: "OK", icon: CircleX, tone: "red" },
  "forwarding-pending": { title: "Payment Recorded", description: "Payment is confirmed, but the request still needs laboratory forwarding. You can retry sending it without recording another payment.", label: "OK", icon: Info, tone: "amber" },
} as const;

type Props = {
  kind: keyof typeof dialogs;
  title?: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  onSecondary?: () => void;
  busy?: boolean;
};

export default function BillingDialog({ kind, title, description, confirmLabel, cancelLabel, onConfirm, onCancel, onSecondary, busy = false }: Props) {
  const config = dialogs[kind];
  const Icon = config.icon;
  const id = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const pending = useRef(false);
  const [working, setWorking] = useState(false);
  const locked = busy || working;
  const dismiss = onCancel ?? (() => { void confirm(); });

  async function confirm() {
    if (busy || pending.current) return;
    pending.current = true;
    setWorking(true);
    try { await onConfirm(); }
    finally { pending.current = false; setWorking(false); }
  }

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    const root = document.getElementById("root");
    const wasInert = root?.inert ?? false;
    dialogRef.current?.querySelector<HTMLElement>("[data-dialog-initial-focus]")?.focus();
    document.body.style.overflow = "hidden";
    if (root) root.inert = true;
    return () => {
      document.body.style.overflow = overflow;
      if (root) root.inert = wasInert;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  // The portal keeps dialogs out of disabled form fieldsets and scroll panels.
  const dialog = <div className="fd-dialog-backdrop">
    <section ref={dialogRef} className={`fd-dialog fd-dialog-${config.tone}`} role={config.tone === "red" || config.tone === "amber" ? "alertdialog" : "dialog"} aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} aria-busy={locked} tabIndex={-1} onKeyDown={(event) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (!locked) dismiss(); }
      if (event.key !== "Tab") return;
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      const first = buttons[0];
      const last = buttons.at(-1);
      if (!first) { event.preventDefault(); event.currentTarget.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}>
      <button type="button" className="fd-dialog-close" aria-label="Close dialog" disabled={locked} onClick={dismiss}><X size={20} /></button>
      <div className="fd-dialog-content"><span className="fd-dialog-icon"><Icon size={32} strokeWidth={1.8} /></span><div><h2 id={`${id}-title`}>{title ?? config.title}</h2><p id={`${id}-description`}>{description ?? config.description}</p></div></div>
      <div className={`fd-dialog-actions ${!onCancel && !onSecondary ? "fd-dialog-actions-single" : ""}`}>
        {onCancel && <button type="button" className="fd-dialog-secondary" data-dialog-initial-focus disabled={locked} onClick={onCancel}>{cancelLabel ?? (kind === "discard-changes" ? "Keep Editing" : "Cancel")}</button>}
        {onSecondary && <button type="button" className="fd-dialog-secondary" data-dialog-initial-focus disabled={locked} onClick={onSecondary}><Eye size={18} />View Invoice</button>}
        <button type="button" className={`fd-dialog-primary ${config.tone === "amber" && onCancel ? "fd-dialog-destructive" : ""}`} data-dialog-initial-focus={!onCancel && !onSecondary ? true : undefined} disabled={locked} onClick={() => void confirm()}>
          {locked ? <LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" /> : kind === "print" ? <Printer size={18} /> : kind === "download" ? <Download size={18} /> : kind === "confirm-payment" ? <CheckCircle2 size={18} /> : kind === "remove-service" ? <Trash2 size={18} /> : null}{confirmLabel ?? config.label}
        </button>
      </div>
    </section>
  </div>;
  return typeof document === "undefined" ? dialog : createPortal(dialog, document.body);
}

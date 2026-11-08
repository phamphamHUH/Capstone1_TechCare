import { useEffect, useRef, useState, type RefObject } from "react";
import { Dialog } from "@base-ui/react/dialog";
import {
  Check,
  CircleCheck,
  Download,
  Eye,
  FileText,
  Info,
  LoaderCircle,
  Printer,
  SquareCheck,
  CircleX,
  X,
} from "lucide-react";

export type BillingModalKind =
  | "print"
  | "download"
  | "payment"
  | "received"
  | "generated"
  | "forwarded"
  | "failed";

const CONTENT = {
  print: {
    title: "Print Invoice?",
    description: "Do you want to print the invoice for this transaction?",
    action: "Print Invoice",
    icon: Printer,
  },
  download: {
    title: "Download Invoice?",
    description: "Do you want to download this invoice as a PDF file?",
    action: "Download PDF",
    icon: Download,
  },
  payment: {
    title: "Mark as Payment Received?",
    description:
      "This will record the payment and update the transaction status to Paid.",
    action: "Payment Received",
    icon: SquareCheck,
  },
  received: {
    title: "Payment Received",
    description:
      "The payment has been successfully recorded. The transaction is now marked as Paid.",
    action: "OK",
    icon: CircleCheck,
  },
  generated: {
    title: "Invoice Generated",
    description:
      "The invoice has been successfully generated and is ready to print or download.",
    action: "OK",
    icon: FileText,
  },
  forwarded: {
    title: "Request Forwarded",
    description:
      "The payment has been recorded and the request forwarded to the laboratory.",
    action: "OK",
    icon: Info,
  },
  failed: {
    title: "Payment Failed",
    description:
      "The transaction could not be confirmed. Please try again or check your connection.",
    action: "OK",
    icon: CircleX,
  },
} as const;

type BillingModalProps = {
  kind: BillingModalKind | null;
  busy?: boolean;
  error?: string;
  alreadyPaid?: boolean;
  returnFocusRef: RefObject<HTMLElement | null>;
  finalFocus?: () => HTMLElement | null;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  onViewInvoice: () => void;
};

export default function BillingModal({
  kind,
  busy = false,
  error,
  alreadyPaid,
  returnFocusRef,
  finalFocus,
  onClose,
  onConfirm,
  onViewInvoice,
}: BillingModalProps) {
  const [working, setWorking] = useState(false);
  const actionLock = useRef(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const success = kind === "received" || kind === "generated";
  const result = success || kind === "forwarded" || kind === "failed";
  const singleAction = result && kind !== "generated";
  const blocked = busy || working;
  const content = CONTENT[kind ?? "print"];
  const Icon = content.icon;

  useEffect(() => {
    if (!kind) return;
    const frame = requestAnimationFrame(() =>
      (result ? primaryRef : cancelRef).current?.focus(),
    );
    return () => cancelAnimationFrame(frame);
  }, [kind, result]);

  async function confirm() {
    if (blocked || actionLock.current) return;
    actionLock.current = true;
    setWorking(true);
    try {
      await onConfirm();
    } finally {
      actionLock.current = false;
      setWorking(false);
    }
  }

  const primaryClass =
    "inline-flex min-h-9 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-[#008bff] bg-[#008bff] px-3 py-2 text-xs font-medium text-white hover:bg-sky-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-60";
  const secondaryClass =
    "inline-flex min-h-9 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-[#dce8f6] bg-white px-3 py-2 text-xs font-medium text-[#0b4278] hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <Dialog.Root
      open={kind !== null}
      onOpenChange={(open) => {
        if (!open && !blocked) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Viewport className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-4">
          <Dialog.Popup
            initialFocus={result ? primaryRef : cancelRef}
            finalFocus={finalFocus || returnFocusRef}
            aria-busy={blocked}
            className="relative max-h-[calc(100dvh-2rem)] w-full max-w-[440px] overflow-y-auto rounded-xl border border-[#d7e2ef] bg-white px-5 py-6 font-sans shadow-xl outline-none sm:px-6"
          >
            <button
              type="button"
              aria-label="Close dialog"
              disabled={blocked}
              onClick={onClose}
              className="absolute right-3 top-3 flex size-6 cursor-pointer items-center justify-center rounded text-[#8a9bb2] hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={16} />
            </button>
            <div className="flex min-h-24 items-center gap-4 sm:gap-5">
              <span
                aria-hidden="true"
                className={`flex size-16 shrink-0 items-center justify-center rounded-full sm:size-18 ${kind === "failed" ? "bg-[#ffe9ef] text-[#ff2f5d]" : success ? "bg-[#e7f7ec] text-[#29c85b]" : "bg-[#e7f3ff] text-[#008bff]"}`}
              >
                {kind === "received" ? (
                  <span className="flex size-7 items-center justify-center rounded-full bg-[#29c85b] text-white">
                    <Check size={19} strokeWidth={2.5} />
                  </span>
                ) : (
                  <Icon size={32} strokeWidth={1.7} />
                )}
              </span>
              <div className="min-w-0 pr-2">
                <Dialog.Title className="text-base font-bold leading-snug text-[#0b4278] sm:text-lg">
                  {kind === "received" && alreadyPaid
                    ? "Payment Already Recorded"
                    : content.title}
                </Dialog.Title>
                <Dialog.Description className="mt-1.5 text-xs leading-relaxed text-[#5c7b9f]">
                  {kind === "received" && alreadyPaid
                    ? "The transaction is already marked as Paid. No new charge was recorded."
                    : content.description}
                </Dialog.Description>
              </div>
            </div>
            {error && (
              <p
                role="alert"
                className="mt-3 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-800"
              >
                {error}
              </p>
            )}
            <footer
              className={`mt-6 ${singleAction ? "flex justify-center" : "grid grid-cols-2 gap-3"}`}
            >
              {!result && (
                <button
                  ref={cancelRef}
                  type="button"
                  disabled={blocked}
                  onClick={onClose}
                  className={secondaryClass}
                >
                  Cancel
                </button>
              )}
              {kind === "generated" && (
                <button
                  type="button"
                  disabled={blocked}
                  onClick={onViewInvoice}
                  className={secondaryClass}
                >
                  <Eye size={15} className="shrink-0" />
                  View Invoice
                </button>
              )}
              <button
                ref={primaryRef}
                type="button"
                disabled={blocked}
                onClick={() => void confirm()}
                className={`${primaryClass} ${singleAction ? "w-40" : ""}`}
              >
                {blocked ? (
                  <LoaderCircle
                    size={15}
                    className="shrink-0 animate-spin motion-reduce:animate-none"
                  />
                ) : (
                  !result && <Icon size={15} className="shrink-0" />
                )}
                {blocked ? "Please wait..." : content.action}
              </button>
            </footer>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

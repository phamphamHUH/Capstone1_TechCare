import type { RefObject } from "react";
import {
  Check,
  CircleCheck,
  CircleX,
  Download,
  Eye,
  FileText,
  Info,
  Printer,
  SquareCheck,
} from "lucide-react";
import UniversalModal, {
  type ModalAction,
} from "../../../../../components/UniversalModal";

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
      "The payment has been recorded and the request forwarded to the laboratory or imaging queue.",
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
  queues?: {
    queue_id: string;
    queue_number: number;
  }[];
};

/** Billing labels and actions; presentation lives in UniversalModal. */
export default function BillingModal({
  kind,
  busy,
  error,
  alreadyPaid,
  returnFocusRef,
  finalFocus,
  onClose,
  onConfirm,
  onViewInvoice,
  queues = [],
}: BillingModalProps) {
  const content = CONTENT[kind ?? "print"];
  const Icon = content.icon;

  const success = kind === "received" || kind === "generated";
  const result = success || kind === "forwarded" || kind === "failed";

  const actions: ModalAction[] = [];

  if (!result) {
    actions.push({
      id: "cancel",
      label: "Cancel",
      variant: "secondary",
      onClick: onClose,
    });
  }

  if (kind === "generated") {
    actions.push({
      id: "view",
      label: "View Invoice",
      icon: <Eye size={15} className="shrink-0" />,
      variant: "secondary",
      onClick: onViewInvoice,
    });
  }

  actions.push({
    id: "confirm",
    label: content.action,
    icon: !result && <Icon size={15} className="shrink-0" />,
    onClick: onConfirm,
  });

  const queueDetails =
    (kind === "received" || kind === "forwarded") && queues.length > 0
      ? "\n" + queues.map((queue) => `Queue ID: ${queue.queue_id}`).join("\n")
      : "";

  const description =
    (kind === "received" && alreadyPaid
      ? "The transaction is already marked as Paid. No new charge was recorded."
      : content.description) + queueDetails;

  return (
    <UniversalModal
      isOpen={kind !== null}
      focusKey={kind}
      title={
        kind === "received" && alreadyPaid
          ? "Payment Already Recorded"
          : content.title
      }
      description={description}
      type={kind === "failed" ? "danger" : success ? "success" : "info"}
      closeOnOverlayClick
      icon={
        kind === "received" ? (
          <span className="flex size-7 items-center justify-center rounded-full bg-[#29c85b] text-white">
            <Check size={19} strokeWidth={2.5} />
          </span>
        ) : (
          <Icon size={32} strokeWidth={1.7} />
        )
      }
      busy={busy}
      error={error}
      showError={kind !== "failed" && kind !== "payment"}
      initialFocusAction={result ? "confirm" : "cancel"}
      finalFocus={finalFocus ?? returnFocusRef}
      onClose={onClose}
      actions={actions}
    />
  );
}

import { useState, type ReactNode, type RefObject } from "react";
import { CircleAlert, CircleHelp, type LucideIcon } from "lucide-react";
import UniversalModal from "./UniversalModal";

type ConfirmDialogProps = {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "info" | "warning";
  icon?: LucideIcon;
  confirmIcon?: LucideIcon;
  returnFocusRef?: RefObject<HTMLElement | null>;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

/** Confirmation configuration for the shared modal. */
export default function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "info",
  icon,
  confirmIcon: ActionIcon,
  returnFocusRef,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [previousFocus] = useState(() =>
    typeof document === "undefined" ? null : document.activeElement,
  );
  const Icon = icon ?? (tone === "warning" ? CircleAlert : CircleHelp);

  return (
    <UniversalModal
      isOpen
      title={title}
      description={description}
      type={tone}
      icon={<Icon size={32} strokeWidth={1.7} />}
      onClose={onCancel}
      initialFocusAction="cancel"
      finalFocus={() =>
        previousFocus instanceof HTMLElement && previousFocus.isConnected
          ? previousFocus
          : (returnFocusRef?.current ?? null)
      }
      actions={[
        {
          id: "cancel",
          label: cancelLabel,
          variant: "secondary",
          onClick: onCancel,
        },
        {
          id: "confirm",
          label: confirmLabel,
          pendingLabel: confirmLabel,
          icon: ActionIcon && <ActionIcon size={15} className="shrink-0" />,
          onClick: onConfirm,
        },
      ]}
    />
  );
}

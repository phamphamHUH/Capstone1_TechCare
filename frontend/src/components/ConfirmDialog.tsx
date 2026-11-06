import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CircleAlert, CircleHelp, LoaderCircle, X } from "lucide-react";

type ConfirmDialogProps = {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "info" | "warning";
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

const TONES = {
  info: { icon: CircleHelp, badge: "bg-sky-100 text-sky-700", button: "border-sky-600 bg-sky-600" },
  warning: { icon: CircleAlert, badge: "bg-amber-100 text-amber-700", button: "border-red-600 bg-red-600" },
};

/** Modal confirmation. Focus stays inside it and Escape cancels. */
function ConfirmDialog({ title, description, confirmLabel, cancelLabel = "Cancel", tone = "info", onConfirm, onCancel }: ConfirmDialogProps) {
  const { icon: Icon, badge, button } = TONES[tone];
  const id = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const [working, setWorking] = useState(false);

  async function confirm() {
    if (working) return;
    setWorking(true);
    try {
      await onConfirm();
    } finally {
      setWorking(false);
    }
  }

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    const root = document.getElementById("root");
    const wasInert = root?.inert ?? false;
    dialogRef.current?.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
    document.body.style.overflow = "hidden";
    if (root) root.inert = true;
    return () => {
      document.body.style.overflow = overflow;
      if (root) root.inert = wasInert;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  // The portal keeps the dialog out of disabled fieldsets and scroll panels.
  const dialog = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        aria-busy={working}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            if (!working) onCancel();
          }
          if (event.key !== "Tab") return;
          const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
          const first = buttons[0];
          const last = buttons.at(-1);
          if (!first) {
            event.preventDefault();
            event.currentTarget.focus();
          } else if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <button type="button" aria-label="Close dialog" disabled={working} onClick={onCancel} className="absolute right-3 top-3 cursor-pointer rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-50">
          <X size={18} />
        </button>
        <div className="flex gap-4 pr-6">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${badge}`}>
            <Icon size={26} strokeWidth={1.8} />
          </span>
          <div>
            <h2 id={`${id}-title`} className="text-lg font-semibold text-gray-900">{title}</h2>
            <p id={`${id}-description`} className="mt-1 text-sm text-gray-600">{description}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3 text-sm">
          <button type="button" data-initial-focus disabled={working} onClick={onCancel} className="cursor-pointer rounded-sm border border-gray-300 px-4 py-2 disabled:opacity-50">
            {cancelLabel}
          </button>
          <button type="button" disabled={working} onClick={() => void confirm()} className={`flex cursor-pointer items-center gap-2 rounded-sm border px-4 py-2 text-white disabled:opacity-60 ${button}`}>
            {working && <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" />}
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
  return typeof document === "undefined" ? dialog : createPortal(dialog, document.body);
}

export default ConfirmDialog;

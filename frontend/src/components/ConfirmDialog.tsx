import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  CircleAlert,
  CircleHelp,
  LoaderCircle,
  X,
  type LucideIcon,
} from "lucide-react";

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

const TONES = {
  info: {
    icon: CircleHelp,
    badge: "bg-[#e7f3ff] text-[#008bff]",
    button: "border-[#008bff] bg-[#008bff] hover:bg-sky-600",
  },
  warning: {
    icon: CircleAlert,
    badge: "bg-[#fff3e2] text-[#ff9800]",
    button: "border-[#ff9800] bg-[#ff9800] hover:bg-orange-600",
  },
};

/** Modal confirmation. Focus stays inside it and Escape cancels. */
function ConfirmDialog({
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
  const { icon: DefaultIcon, badge, button } = TONES[tone];
  const Icon = icon || DefaultIcon;
  const id = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const [working, setWorking] = useState(false);
  const actionLock = useRef(false);

  async function confirm() {
    if (working || actionLock.current) return;
    actionLock.current = true;
    setWorking(true);
    try {
      await onConfirm();
    } finally {
      actionLock.current = false;
      setWorking(false);
    }
  }

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    const root = document.getElementById("root");
    const wasInert = root?.inert ?? false;
    dialogRef.current
      ?.querySelector<HTMLElement>("[data-initial-focus]")
      ?.focus();
    document.body.style.overflow = "hidden";
    if (root) root.inert = true;
    return () => {
      document.body.style.overflow = overflow;
      if (root) root.inert = wasInert;
      requestAnimationFrame(() => {
        const target =
          previous instanceof HTMLElement && previous.isConnected
            ? previous
            : returnFocusRef?.current;
        target?.focus({ preventScroll: true });
      });
    };
  }, []);

  // The portal keeps the dialog out of disabled fieldsets and scroll panels.
  const dialog = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        aria-busy={working}
        tabIndex={-1}
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-[440px] overflow-y-auto rounded-xl border border-[#d7e2ef] bg-white px-5 py-6 font-sans shadow-xl outline-none sm:px-6"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            if (!working) onCancel();
          }
          if (event.key !== "Tab") return;
          const buttons = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ),
          );
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
        <button
          type="button"
          aria-label="Close dialog"
          disabled={working}
          onClick={onCancel}
          className="absolute right-3 top-3 flex size-6 cursor-pointer items-center justify-center rounded text-[#8a9bb2] hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X size={16} />
        </button>
        <div className="flex min-h-24 items-center gap-4 sm:gap-5">
          <span
            aria-hidden="true"
            className={`flex size-16 shrink-0 items-center justify-center rounded-full sm:size-18 ${badge}`}
          >
            <Icon size={32} strokeWidth={1.7} />
          </span>
          <div className="min-w-0 pr-2">
            <h2
              id={`${id}-title`}
              className="text-base font-bold leading-snug text-[#0b4278] sm:text-lg"
            >
              {title}
            </h2>
            <p
              id={`${id}-description`}
              className="mt-1.5 text-xs leading-relaxed text-[#5c7b9f]"
            >
              {description}
            </p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            data-initial-focus
            disabled={working}
            onClick={onCancel}
            className="inline-flex min-h-9 min-w-0 cursor-pointer items-center justify-center rounded-md border border-[#dce8f6] bg-white px-3 py-2 text-xs font-medium text-[#0b4278] hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={working}
            onClick={() => void confirm()}
            className={`inline-flex min-h-9 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:cursor-not-allowed disabled:opacity-60 ${button}`}
          >
            {working ? (
              <LoaderCircle
                size={15}
                className="shrink-0 animate-spin motion-reduce:animate-none"
              />
            ) : (
              ActionIcon && <ActionIcon size={15} className="shrink-0" />
            )}
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
  return typeof document === "undefined"
    ? dialog
    : createPortal(dialog, document.body);
}

export default ConfirmDialog;

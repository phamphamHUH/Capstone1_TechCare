import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Dialog } from "@base-ui/react/dialog";
import {
  CircleCheck,
  CircleX,
  Info,
  LoaderCircle,
  TriangleAlert,
  X,
} from "lucide-react";
import { cn } from "../lib/utils";

export type ModalType = "info" | "success" | "warning" | "danger";
export type ModalFocusTarget = ComponentProps<
  typeof Dialog.Popup
>["finalFocus"];

export type ModalAction = {
  id?: string;
  label: ReactNode;
  onClick: () => void | Promise<void>;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "warning" | "danger";
  disabled?: boolean;
  loading?: boolean;
  pendingLabel?: ReactNode;
};

export type UniversalModalProps = {
  isOpen: boolean;
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  actions?: ModalAction[];
  type?: ModalType;
  icon?: ReactNode;
  children?: ReactNode;
  busy?: boolean;
  error?: ReactNode;
  showError?: boolean;
  onActionError?: (cause: unknown) => void;
  initialFocus?: ModalFocusTarget;
  initialFocusAction?: string;
  finalFocus?: ModalFocusTarget;
  /** Identifies a new step when the contents change while the dialog stays open. */
  focusKey?: string | number | null;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
};

const TONES = {
  info: { icon: Info, badge: "bg-[#e7f3ff] text-[#008bff]" },
  success: { icon: CircleCheck, badge: "bg-[#e7f7ec] text-[#29c85b]" },
  warning: { icon: TriangleAlert, badge: "bg-[#fff3e2] text-[#ff9800]" },
  danger: { icon: CircleX, badge: "bg-[#ffe9ef] text-[#ff2f5d]" },
} as const;

/** Shared dialog for any page: configure content and actions; callers control when it closes. */
export default function UniversalModal({
  isOpen,
  title,
  description,
  onClose,
  actions = [],
  type = "info",
  icon,
  children,
  busy = false,
  error,
  showError = true,
  onActionError,
  initialFocus,
  initialFocusAction,
  finalFocus,
  focusKey,
  showCloseButton = true,
  closeOnOverlayClick = false,
  className,
}: UniversalModalProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [errorScope, setErrorScope] = useState({ isOpen, focusKey });
  const actionLock = useRef(false);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const resolvedActions = actions.map((action, index) => ({
    ...action,
    id: action.id ?? `action-${index}`,
    variant:
      action.variant ??
      (index === actions.length - 1 ? "primary" : "secondary"),
  }));
  const blocked =
    busy || activeAction !== null || actions.some((action) => action.loading);
  const firstAction =
    initialFocusAction ??
    resolvedActions.find(
      (action) => action.variant === "secondary" && !action.disabled,
    )?.id ??
    resolvedActions.find((action) => !action.disabled)?.id;
  const DefaultIcon = TONES[type].icon;

  // Clear a previous step's error before rendering a newly opened dialog.
  if (errorScope.isOpen !== isOpen || errorScope.focusKey !== focusKey) {
    setErrorScope({ isOpen, focusKey });
    setActionError(null);
  }

  useEffect(() => {
    if (!isOpen || initialFocus !== undefined || !firstAction) return;
    const frame = requestAnimationFrame(() =>
      buttons.current.get(firstAction)?.focus(),
    );
    return () => cancelAnimationFrame(frame);
  }, [isOpen, focusKey, firstAction, initialFocus]);

  async function runAction(action: ModalAction & { id: string }) {
    if (blocked || action.disabled || actionLock.current) return;
    actionLock.current = true;
    setActiveAction(action.id);
    setActionError(null);
    try {
      await action.onClick();
    } catch (cause) {
      if (onActionError) onActionError(cause);
      else setActionError("Unable to complete this action. Please try again.");
    } finally {
      actionLock.current = false;
      setActiveAction(null);
    }
  }

  return (
    <Dialog.Root
      open={isOpen}
      disablePointerDismissal={!closeOnOverlayClick}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !blocked && !actionLock.current) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-100 bg-black/50" />
        <Dialog.Viewport className="fixed inset-0 z-110 flex items-center justify-center overflow-y-auto p-4">
          <Dialog.Popup
            aria-modal="true"
            initialFocus={
              initialFocus ??
              (() =>
                (firstAction ? buttons.current.get(firstAction) : null) ?? true)
            }
            finalFocus={finalFocus}
            aria-busy={blocked}
            className={cn(
              "relative max-h-[calc(100dvh-2rem)] w-full max-w-[440px] overflow-y-auto rounded-xl border border-[#d7e2ef] bg-white px-5 py-6 font-sans shadow-xl outline-none sm:px-6",
              className,
            )}
          >
            {showCloseButton && (
              <Dialog.Close
                type="button"
                aria-label="Close dialog"
                disabled={blocked}
                className="absolute right-3 top-3 flex size-6 cursor-pointer items-center justify-center rounded text-[#8a9bb2] hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={16} />
              </Dialog.Close>
            )}
            <div className="flex min-h-24 items-center gap-4 sm:gap-5">
              <span
                aria-hidden="true"
                className={`flex size-16 shrink-0 items-center justify-center rounded-full sm:size-18 ${TONES[type].badge}`}
              >
                {icon ?? <DefaultIcon size={32} strokeWidth={1.7} />}
              </span>
              <div className="min-w-0 pr-2">
                <Dialog.Title className="text-base font-bold leading-snug text-[#0b4278] sm:text-lg">
                  {title}
                </Dialog.Title>
                {description && (
                  <Dialog.Description
                    render={<div />}
                    className="mt-1.5 text-xs leading-relaxed text-[#5c7b9f]"
                  >
                    {description}
                  </Dialog.Description>
                )}
              </div>
            </div>
            {children && <div className="mt-4">{children}</div>}
            {showError && (error || actionError) && (
              <p
                role="alert"
                className="mt-3 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-800"
              >
                {error || actionError}
              </p>
            )}
            {actions.length > 0 && (
              <footer
                className={
                  actions.length === 1
                    ? "mt-6 flex justify-center"
                    : "mt-6 grid grid-cols-2 gap-3"
                }
              >
                {resolvedActions.map((action) => {
                  const secondary = action.variant === "secondary";
                  const loading =
                    action.loading ||
                    activeAction === action.id ||
                    (busy && !secondary);
                  return (
                    <button
                      key={action.id}
                      ref={(node) => {
                        if (node) buttons.current.set(action.id, node);
                        else buttons.current.delete(action.id);
                      }}
                      type="button"
                      disabled={blocked || action.disabled}
                      onClick={() => void runAction(action)}
                      className={cn(
                        "inline-flex min-h-9 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
                        actions.length === 1 && "w-40",
                        secondary
                          ? "border-[#dce8f6] bg-white text-[#0b4278] hover:bg-sky-50 focus-visible:outline-sky-500"
                          : action.variant === "danger"
                            ? "border-red-500 bg-red-500 text-white hover:bg-red-600 focus-visible:outline-red-500"
                            : action.variant === "warning" || type === "warning"
                              ? "border-[#ff9800] bg-[#ff9800] text-white hover:bg-orange-600 focus-visible:outline-orange-500"
                              : "border-[#008bff] bg-[#008bff] text-white hover:bg-sky-600 focus-visible:outline-sky-500",
                      )}
                    >
                      {loading ? (
                        <LoaderCircle
                          size={15}
                          className="shrink-0 animate-spin motion-reduce:animate-none"
                        />
                      ) : (
                        action.icon
                      )}
                      {loading
                        ? (action.pendingLabel ?? "Please wait...")
                        : action.label}
                    </button>
                  );
                })}
              </footer>
            )}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

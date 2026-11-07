import type { ReactNode } from "react";
import { X } from "lucide-react";

type ModalType = "info" | "success" | "warning" | "danger";

type ModalAction = {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "warning" | "danger";
  disabled?: boolean;
  loading?: boolean;
};

type UniversalModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  type?: ModalType;
  icon?: ReactNode;
  actions?: ModalAction[];
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
};

const modalStyles: Record<ModalType, { icon: string; defaultIcon: string }> = {
  info: {
    icon: "bg-sky-100 text-sky-500",
    defaultIcon: "text-sky-500",
  },
  success: {
    icon: "bg-green-100 text-green-500",
    defaultIcon: "text-green-500",
  },
  warning: {
    icon: "bg-orange-100 text-orange-500",
    defaultIcon: "text-orange-500",
  },
  danger: {
    icon: "bg-red-100 text-red-500",
    defaultIcon: "text-red-500",
  },
};

const buttonStyles = {
  primary: "bg-sky-500 text-white hover:bg-sky-600",
  secondary: "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
  warning: "bg-orange-500 text-white hover:bg-orange-600",
  danger: "bg-red-500 text-white hover:bg-red-600",
};

function UniversalModal({
  isOpen,
  onClose,
  title,
  description,
  type = "info",
  icon,
  actions = [],
  showCloseButton = true,
  closeOnOverlayClick = false,
}: UniversalModalProps) {
  if (!isOpen) return null;

  const styles = modalStyles[type];

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (closeOnOverlayClick && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="universal-modal-title"
        className="relative w-full max-w-md rounded-xl bg-white px-6 py-7 shadow-xl"
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute right-4 top-4 text-gray-400 transition hover:text-gray-700"
          >
            <X size={18} />
          </button>
        )}

        {/* Modal Header */}
        <div className="mb-7 flex items-center gap-5 pr-5">
          <div
            className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full ${styles.icon}`}
          >
            {icon}
          </div>

          <div>
            <h2
              id="universal-modal-title"
              className="text-base font-bold text-slate-900"
            >
              {title}
            </h2>

            {description && (
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        {actions.length > 0 && (
          <div
            className={`grid gap-2 ${
              actions.length === 1 ? "grid-cols-1" : "grid-cols-2"
            }`}
          >
            {actions.map((action, index) => (
              <button
                key={`${action.label}-${index}`}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
                className={`flex h-10 items-center justify-center gap-2 rounded-md px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  buttonStyles[
                    action.variant ??
                      (index === actions.length - 1 ? "primary" : "secondary")
                  ]
                }`}
              >
                {action.icon}
                {action.loading ? "Please wait..." : action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default UniversalModal;

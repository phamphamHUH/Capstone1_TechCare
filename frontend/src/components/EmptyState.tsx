import type { ReactNode } from "react";
import { cn } from "../lib/utils";

type EmptyStateProps = {
  message?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
};

/** Neutral feedback for successful empty results and selection prompts. */
export default function EmptyState({
  message = "No records found.",
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex w-full min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-4 text-center font-sans text-sm leading-relaxed text-gray-500 [overflow-wrap:anywhere]",
        compact ? "py-4" : "py-8",
        className,
      )}
    >
      <p className="font-medium text-gray-600">{message}</p>
      {description && <p className="max-w-lg">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

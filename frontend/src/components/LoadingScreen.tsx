import { LoaderCircle } from "lucide-react";
import { cn } from "../lib/utils";

type LoadingSpinnerProps = {
  size?: number;
  className?: string;
};

/** Decorative spinner for buttons that already have a visible action label. */
export function LoadingSpinner({ size = 24, className }: LoadingSpinnerProps) {
  return (
    <LoaderCircle
      aria-hidden="true"
      focusable="false"
      size={size}
      strokeWidth={1.8}
      className={cn(
        "shrink-0 animate-spin motion-reduce:animate-none",
        className,
      )}
    />
  );
}

export type LoadingScreenProps = {
  message?: string;
  description?: string;
  /** Page fills the content area; section fits a card; inline fits beside controls. */
  variant?: "page" | "section" | "inline";
  className?: string;
};

/** Mount only while the real request is pending; the caller owns data and errors. */
export default function LoadingScreen({
  message = "Loading...",
  description,
  variant = "section",
  className,
}: LoadingScreenProps) {
  const inline = variant === "inline";
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "font-sans text-[#5c7b9f]",
        inline
          ? "inline-flex items-center gap-2 text-sm"
          : "flex w-full flex-col items-center justify-center gap-4 px-4 text-center",
        variant === "section" && "min-h-40 py-8",
        variant === "page" && "min-h-[60vh] py-12",
        className,
      )}
    >
      {variant === "page" ? (
        <img
          src="/assets/images/reyna-g-logo.png"
          alt=""
          className="h-20 w-20 object-contain"
        />
      ) : null}
      {inline ? (
        <LoadingSpinner size={16} className="text-[#008bff]" />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-full bg-[#e7f3ff] text-[#008bff]"
        >
          <LoadingSpinner size={28} />
        </span>
      )}
      <div className="min-w-0">
        <p className={cn(!inline && "text-sm font-semibold text-[#0b4278]")}>
          {message}
        </p>
        {description && (
          <p className="mt-1 text-xs leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  );
}

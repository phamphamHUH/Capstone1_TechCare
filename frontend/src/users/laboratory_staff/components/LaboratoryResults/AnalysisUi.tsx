import type { ButtonHTMLAttributes, ReactNode } from "react";
import { FlaskConical } from "lucide-react";

type AnalysisButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "link";
  compact?: boolean;
};

export function AnalysisButton({
  variant = "primary",
  compact = false,
  className = "",
  ...props
}: AnalysisButtonProps) {
  const color =
    variant === "secondary"
      ? "border-gray-300 bg-white text-sky-700 hover:border-sky-400 hover:bg-sky-50"
      : variant === "link"
        ? "border-transparent bg-transparent text-sky-700 hover:text-sky-800 hover:underline"
        : "border-sky-500 bg-sky-500 text-white hover:border-sky-600 hover:bg-sky-600";

  return (
    <button
      type="button"
      {...props}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${compact ? "min-h-8 px-3 py-1.5 text-xs" : "min-h-9 px-4 py-2 text-sm"} ${color} ${className}`}
    />
  );
}

type AnalysisNoticeProps = {
  children: ReactNode;
  error?: boolean;
};

export function AnalysisNotice({
  children,
  error = false,
}: AnalysisNoticeProps) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={`mb-3 rounded-lg border px-3 py-2.5 text-sm leading-relaxed ${error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-sky-200 bg-sky-50 text-sky-800"}`}
    >
      {children}
    </div>
  );
}

type FlaskBadgeProps = { small?: boolean };

export function FlaskBadge({ small = false }: FlaskBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600 ${small ? "size-11" : "size-[51px]"}`}
    >
      <FlaskConical size={25} strokeWidth={1.25} />
    </span>
  );
}

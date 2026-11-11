import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/utils";

type ErrorMessageProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  children: ReactNode;
};

/** Shared, non-blocking error banner; recovery stays with the page controls. */
export default function ErrorMessage({
  children,
  className,
  ...props
}: ErrorMessageProps) {
  if (!children) return null;
  return (
    <div
      {...props}
      role="alert"
      className={cn(
        "min-w-0 rounded-md border border-red-200 bg-red-50 p-4 font-sans text-sm font-normal leading-relaxed text-red-700 [overflow-wrap:anywhere]",
        className,
      )}
    >
      {children}
    </div>
  );
}

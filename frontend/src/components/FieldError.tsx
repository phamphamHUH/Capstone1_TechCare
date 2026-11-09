import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/** Preserve field IDs used by aria-describedby while sharing validation styles. */
export default function FieldError({
  children,
  className,
  ...props
}: ComponentProps<"span">) {
  if (!children) return null;
  return (
    <span
      {...props}
      className={cn(
        "mt-1 block text-xs leading-relaxed text-red-700 [overflow-wrap:anywhere]",
        className,
      )}
    >
      {children}
    </span>
  );
}

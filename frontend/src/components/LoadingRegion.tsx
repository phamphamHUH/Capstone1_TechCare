import type { ReactNode } from "react";
import LoadingScreen from "./LoadingScreen";
import { cn } from "../lib/utils";

type LoadingRegionProps = {
  loading: boolean;
  children: ReactNode;
  message?: string;
  className?: string;
};

/** Keeps loaded content mounted and centers the shared loader over it during refreshes. */
export default function LoadingRegion({
  loading,
  children,
  message = "Refreshing data...",
  className,
}: LoadingRegionProps) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <div aria-busy={loading} inert={loading || undefined}>
        {children}
      </div>
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-white/80">
          <LoadingScreen variant="overlay" message={message} />
        </div>
      )}
    </div>
  );
}

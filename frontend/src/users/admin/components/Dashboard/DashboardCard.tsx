import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

type DashboardCardProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
};

// White card with a title row and an optional "View all" link.
function DashboardCard({
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
}: DashboardCardProps) {
  return (
    <section className="min-w-0 rounded-md border border-gray-300 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-300 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="flex shrink-0 cursor-pointer items-center gap-1 text-sm text-sky-600 hover:text-sky-700"
          >
            {actionLabel} <ChevronRight size={16} />
          </button>
        )}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}

export default DashboardCard;

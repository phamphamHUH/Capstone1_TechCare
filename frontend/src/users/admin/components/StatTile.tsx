import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";

type StatTileProps = {
  icon: ReactNode;
  label: string;
  value: string;
  caption: string;
  // Percent change vs the previous period; null hides the badge.
  change?: number | null;
  changeLabel?: string;
  // When set, the tile is a button (opens its detail modal).
  onClick?: () => void;
};

// One KPI cell. Used inside a bordered grid like the other dashboards.
function StatTile({ icon, label, value, caption, change, changeLabel, onClick }: StatTileProps) {
  const showChange = change !== undefined && change !== null;
  const isUp = showChange && change >= 0;

  const content = (
    <>
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        {icon}
        <p className="text-sm text-gray-500">{label}</p>
        {onClick && (
          <ChevronRight
            size={16}
            strokeWidth={1.5}
            className="ml-auto shrink-0 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          />
        )}
      </div>

      <p className="text-2xl sm:text-3xl font-semibold tabular-nums truncate">{value}</p>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {showChange && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium ${
              isUp ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}
            title={changeLabel}
          >
            {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
        <span className="text-gray-400">{caption}</span>
      </div>
    </>
  );

  if (!onClick) return <div className="bg-white p-4 sm:p-6 min-w-0">{content}</div>;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className="group bg-white p-4 sm:p-6 min-w-0 text-left cursor-pointer transition-colors hover:bg-sky-50 active:bg-sky-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky-500"
    >
      {content}
    </button>
  );
}

export default StatTile;

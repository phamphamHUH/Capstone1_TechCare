import {
  FlaskConical,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type {
  HistoryRecord,
  Pagination,
} from "../../../../../../interface/HistoryRecord";

type HistoryTimelineProps = {
  records: HistoryRecord[];
  pagination: Pagination | null;
  loading: boolean;
  onPageChange: (page: number) => void;
  setSelectedRecord: (selectedRecord: HistoryRecord) => void;
};

// "In Progress" -> "in-progress"
const normalizeStatus = (s: string) =>
  s.trim().toLowerCase().replace(/\s+/g, "-");

const statusStyles: Record<string, string> = {
  requested: "bg-amber-500 text-white",
  waiting: "bg-gray-400 text-white",
  collected: "bg-violet-500 text-white",
  "in-progress": "bg-indigo-500 text-white",
  completed: "bg-sky-500 text-white",
  released: "bg-green-500 text-white",
  cancelled: "bg-red-500 text-white",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  });

const getPageNumbers = (page: number, totalPages: number) => {
  const pages: (number | "…")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }
  return pages;
};

function HistoryTimeline({
  records,
  pagination,
  loading,
  onPageChange,
  setSelectedRecord,
}: HistoryTimelineProps) {
  // First load: nothing to show yet
  if (loading && records.length === 0) {
    return (
      <ul className="mt-2 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <li
            key={i}
            className="ml-8 flex items-center gap-4 border-b border-gray-100 py-3"
          >
            <div className="h-8 w-24 rounded bg-gray-100" />
            <div className="size-10 rounded-xl bg-gray-100" />
            <div className="h-8 flex-1 rounded bg-gray-100" />
          </li>
        ))}
      </ul>
    );
  }

  if (records.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-gray-400">
        No records found.
      </p>
    );
  }

  return (
    <div>
      <ul className={`transition ${loading ? "opacity-60" : ""}`}>
        {records.map((item, i) => {
          const isLab = item.record_type === "laboratory";
          const Icon = isLab ? FlaskConical : Stethoscope;
          const status = normalizeStatus(item.status);

          return (
            <li
              key={item.record_id}
              className="relative flex items-stretch cursor-pointer hover:bg-gray-50"
              onClick={() => setSelectedRecord(item)}
            >
              {/* Vertical line, trimmed on first and last rows */}
              <span
                className={`absolute left-1 w-px bg-sky-300 ${
                  i === 0 ? "top-1/2" : "top-0"
                } ${i === records.length - 1 ? "bottom-1/2" : "bottom-0"}`}
              />

              <span className="absolute left-0 top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-sky-500" />

              <div className="ml-8 flex flex-1 items-center gap-4 border-b border-gray-100 py-3">
                <div className="w-24 shrink-0">
                  <p className="text-xs font-semibold text-gray-700">
                    {formatDate(item.occurred_at)}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {formatTime(item.occurred_at)}
                  </p>
                </div>

                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                    isLab
                      ? "bg-gray-100 text-gray-600"
                      : "bg-indigo-50 text-indigo-500"
                  }`}
                >
                  <Icon size={20} strokeWidth={1.75} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {item.service_name}
                  </p>
                  <p className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{item.service_category}</span>
                    <span className="size-1 rounded-full bg-gray-300" />
                    <span>{item.room}</span>
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${
                    statusStyles[status] ?? "bg-gray-300 text-gray-700"
                  }`}
                >
                  {item.status}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {pagination &&
        (() => {
          const { page, limit, total, total_pages } = pagination;
          const from = (page - 1) * limit + 1;
          const to = Math.min(page * limit, total);

          return (
            <div className="mt-8 flex items-center justify-between text-xs text-gray-500">
              <span>
                Showing {from} - {to} of {total} records
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => onPageChange(page - 1)}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center  rounded-md border border-gray-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                </button>

                {getPageNumbers(page, total_pages).map((p, i) =>
                  p === "…" ? (
                    <span key={`gap-${i}`} className="px-1 text-gray-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      disabled={loading}
                      onClick={() => onPageChange(p)}
                      className={`flex h-7 w-7 cursor-pointer items-center justify-center  rounded-md ${
                        p === page
                          ? "bg-sky-500 font-bold text-white shadow-xs"
                          : "border border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}

                <button
                  type="button"
                  disabled={page >= total_pages || loading}
                  onClick={() => onPageChange(page + 1)}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-gray-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          );
        })()}
    </div>
  );
}

export default HistoryTimeline;

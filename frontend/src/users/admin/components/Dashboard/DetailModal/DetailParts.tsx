import type { ReactNode } from "react";

// Small building blocks shared by the tile detail modals.

export type Figure = { label: string; value: string; note?: string };

// A row of headline numbers at the top of a modal.
export function FigureRow({ figures }: { figures: Figure[] }) {
  return (
    <div className="grid grid-cols-2 divide-gray-200 border-b border-gray-200 sm:grid-cols-4 sm:divide-x">
      {figures.map((figure) => (
        <div key={figure.label} className="px-6 py-4 min-w-0">
          <p className="text-xs text-gray-500">{figure.label}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums truncate">{figure.value}</p>
          {figure.note && <p className="mt-0.5 text-xs text-gray-400">{figure.note}</p>}
        </div>
      ))}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-6 pt-5 pb-2">
      <h3 className="text-sm font-medium text-gray-700">{children}</h3>
      {aside && <span className="text-xs text-gray-400">{aside}</span>}
    </div>
  );
}

// Labeled amounts with a bar each, e.g. totals per payment method.
export function BarList({
  rows,
}: {
  rows: { key: string; label: ReactNode; value: number; display: string; color?: string }[];
}) {
  const max = Math.max(0, ...rows.map((row) => row.value));

  return (
    <ul className="space-y-3 px-6 pb-2">
      {rows.map((row) => (
        <li key={row.key} className="text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-gray-700">{row.label}</span>
            <span className="font-medium tabular-nums text-gray-900">{row.display}</span>
          </div>
          <div className="mt-1.5 h-2 rounded bg-gray-100">
            <div
              className="h-full rounded"
              style={{
                width: `${max > 0 ? (row.value / max) * 100 : 0}%`,
                backgroundColor: row.color ?? "#6b7280",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export type Column<T> = {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
};

const headCell =
  "sticky top-0 z-10 bg-white px-3 py-2.5 text-xs font-medium text-gray-500 shadow-[inset_0_-1px_0_var(--color-gray-200)] first:pl-6 last:pr-6";

// Plain table with a header that stays visible while the modal body scrolls.
// No overflow wrapper here: one would become the sticky header's scroll box
// and stop it from sticking to the modal body.
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  empty,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="px-6 py-10 text-center text-sm text-gray-400">{empty}</p>;
  }

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={`${headCell} ${column.align === "right" ? "text-right" : "text-left"}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-gray-100 last:border-0">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-3 py-2.5 first:pl-6 last:pr-6 ${
                    column.align === "right" ? "text-right tabular-nums" : ""
                  }`}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

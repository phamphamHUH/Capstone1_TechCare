import EmptyState from "../../../../components/EmptyState";
import { useState } from "react";
import type { SalesTimelinePoint } from "../../../../interface/Analytics";
import {
  REVENUE_COLOR,
  formatBucketLong,
  formatBucketShort,
  formatPeso,
  formatPesoCompact,
} from "./utils/formatters";

type RevenueChartProps = {
  timeline: SalesTimelinePoint[];
  bucket: "hour" | "day" | "month";
};

// Rounds the axis maximum up to 1, 2, 2.5 or 5 × 10^n so ticks are readable.
function niceMax(value: number) {
  if (value <= 0) return 1000;
  const power = 10 ** Math.floor(Math.log10(value / 4));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s * 4 >= value) ??
    power * 10;
  return step * 4;
}

// How many columns to skip between x-axis labels so they don't collide.
function labelEvery(count: number, bucket: "hour" | "day" | "month") {
  if (bucket === "hour") return 3;
  if (bucket === "month") return 1;
  return count > 10 ? 5 : 1;
}

// Revenue per hour/day/month as columns, with a hover tooltip per column.
function RevenueChart({ timeline, bucket }: RevenueChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const max = niceMax(Math.max(0, ...timeline.map((point) => point.revenue)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => fraction * max);
  const every = labelEvery(timeline.length, bucket);
  const isEmpty = timeline.every((point) => point.revenue === 0);
  const active = hovered === null ? null : timeline[hovered];

  if (isEmpty)
    return <EmptyState message="No paid bills found for this period." />;

  return (
    <div>
      <div className="flex gap-3">
        {/* Y axis labels */}
        <div className="relative h-56 w-12 shrink-0 text-right text-xs text-gray-400 tabular-nums">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 translate-y-1/2"
              style={{ bottom: `${(tick / max) * 100}%` }}
            >
              {formatPesoCompact(tick)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Gridlines */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-56">
            {ticks.map((tick) => (
              <div
                key={tick}
                className={`absolute inset-x-0 border-t ${tick === 0 ? "border-gray-300" : "border-gray-100"}`}
                style={{ bottom: `${(tick / max) * 100}%` }}
              />
            ))}
          </div>

          {/* Columns */}
          <div
            className="relative flex h-56 items-end gap-0.5"
            role="img"
            aria-label="Revenue over the selected period. Values are listed in the table below the chart."
            onMouseLeave={() => setHovered(null)}
          >
            {timeline.map((point, index) => (
              <div
                key={point.bucket}
                className="flex h-full min-w-0 flex-1 cursor-default items-end"
                onMouseEnter={() => setHovered(index)}
              >
                <div
                  className="w-full rounded-t transition-opacity"
                  style={{
                    height:
                      point.revenue > 0
                        ? `max(${(point.revenue / max) * 100}%, 2px)`
                        : 0,
                    backgroundColor: REVENUE_COLOR,
                    opacity: hovered === null || hovered === index ? 1 : 0.45,
                  }}
                />
              </div>
            ))}

            {/* Tooltip */}
            {active && hovered !== null && (
              <div
                className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-md"
                style={{
                  left: `clamp(70px, ${((hovered + 0.5) / timeline.length) * 100}%, calc(100% - 70px))`,
                }}
              >
                <p className="font-medium text-gray-700">
                  {formatBucketLong(active.bucket, bucket)}
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900 tabular-nums">
                  {formatPeso(active.revenue)}
                </p>
                <p className="text-gray-500">
                  {active.bills} paid {active.bills === 1 ? "bill" : "bills"}
                </p>
              </div>
            )}
          </div>

          {/* X axis labels */}
          <div className="mt-2 flex gap-0.5 text-xs text-gray-400">
            {timeline.map((point, index) => (
              <span
                key={point.bucket}
                className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center"
              >
                {index % every === 0
                  ? formatBucketShort(point.bucket, bucket)
                  : ""}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Table view for screen readers */}
      <table className="sr-only">
        <caption>Revenue by period</caption>
        <thead>
          <tr>
            <th>Period</th>
            <th>Revenue</th>
            <th>Paid bills</th>
          </tr>
        </thead>
        <tbody>
          {timeline.map((point) => (
            <tr key={point.bucket}>
              <td>{formatBucketLong(point.bucket, bucket)}</td>
              <td>{formatPeso(point.revenue)}</td>
              <td>{point.bills}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RevenueChart;

import type { AnalyticsRange } from "../../../../../interface/Analytics";

export const RANGE_OPTIONS: { value: AnalyticsRange; label: string; previous: string }[] = [
  { value: "today", label: "Today", previous: "yesterday" },
  { value: "7d", label: "7 days", previous: "previous 7 days" },
  { value: "30d", label: "30 days", previous: "previous 30 days" },
  { value: "12mo", label: "12 months", previous: "previous 12 months" },
];

// Fixed colors per service type (consultation / laboratory), used everywhere
// on the dashboard so a color always means the same thing.
export const SERVICE_TYPE_COLORS: Record<string, string> = {
  consultation: "#2a78d6",
  laboratory: "#1baf7a",
};
export const OTHER_COLOR = "#8a8984";
// Single-series revenue chart. Not a service-type color, so it can't be misread.
export const REVENUE_COLOR = "#6250d6";

export const serviceTypeColor = (type: string) =>
  SERVICE_TYPE_COLORS[type.toLowerCase()] ?? OTHER_COLOR;

export const serviceTypeLabel = (type: string) =>
  type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : "Other";

const pesoFormat = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pesoWholeFormat = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

const compactFormat = new Intl.NumberFormat("en-PH", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export const formatPeso = (value: number) => pesoFormat.format(value);

// Whole pesos for big numbers in tiles.
export const formatPesoWhole = (value: number) => pesoWholeFormat.format(value);

// Short axis labels: ₱0, ₱500, ₱1.5K.
export const formatPesoCompact = (value: number) => `₱${compactFormat.format(value)}`;

export const formatNumber = (value: number) => value.toLocaleString("en-PH");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The API sends Manila wall-clock times ("2026-11-08T13:00:00"). Read the parts
// directly so the browser's own time zone doesn't shift them.
function parseLocal(value: string) {
  const [date, time = "00:00:00"] = value.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return { year, month, day, hour, minute };
}

function hourLabel(hour: number) {
  const suffix = hour < 12 ? "AM" : "PM";
  return `${hour % 12 === 0 ? 12 : hour % 12} ${suffix}`;
}

// Axis label for one chart column.
export function formatBucketShort(bucket: string, unit: "hour" | "day" | "month") {
  const { year, month, day, hour } = parseLocal(bucket);
  if (unit === "hour") return hourLabel(hour);
  if (unit === "day") return `${MONTHS[month - 1]} ${day}`;
  return month === 1 ? `${MONTHS[0]} ${String(year).slice(2)}` : MONTHS[month - 1];
}

// Full label for tooltips.
export function formatBucketLong(bucket: string, unit: "hour" | "day" | "month") {
  const { year, month, day, hour } = parseLocal(bucket);
  if (unit === "hour") return `${MONTHS[month - 1]} ${day}, ${hourLabel(hour)} – ${hourLabel((hour + 1) % 24)}`;
  if (unit === "day") return `${MONTHS[month - 1]} ${day}, ${year}`;
  return `${MONTHS[month - 1]} ${year}`;
}

export function formatDateTime(value: string | null) {
  if (!value) return "Never";
  const { year, month, day } = parseLocal(value);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

// Percent change vs the previous period, or null when there is nothing to compare.
export function percentChange(current: number, previous: number) {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

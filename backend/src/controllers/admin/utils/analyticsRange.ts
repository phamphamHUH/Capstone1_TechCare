// Date ranges for the admin analytics endpoints.
//
// Bills and records are stored as TIMESTAMP columns holding UTC values, so
// SQL converts them with `AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila'` and
// compares them to the Manila wall-clock bounds built here.
// The Philippines has no daylight saving time, so Manila is always UTC+8.

export const ANALYTICS_RANGES = ["today", "7d", "30d", "12mo"] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

// How the sales chart groups its points for each range.
export type AnalyticsBucket = "hour" | "day" | "month";

export type ResolvedAnalyticsRange = {
  range: AnalyticsRange;
  bucket: AnalyticsBucket;
  // Manila wall-clock times as "YYYY-MM-DD HH:MM:SS" (start inclusive, end exclusive).
  start: string;
  end: string;
  // The period of the same length right before `start`, for comparisons.
  previous_start: string;
};

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

export function isAnalyticsRange(value: unknown): value is AnalyticsRange {
  return (
    typeof value === "string" &&
    (ANALYTICS_RANGES as readonly string[]).includes(value)
  );
}

// Formats a Date whose UTC fields hold a Manila wall-clock time.
function toSqlTimestamp(date: Date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

export function resolveAnalyticsRange(
  range: AnalyticsRange,
  now: Date = new Date(),
): ResolvedAnalyticsRange {
  // Shift "now" so its UTC fields read as the Manila date and time.
  const manilaNow = new Date(now.getTime() + MANILA_OFFSET_MS);
  const year = manilaNow.getUTCFullYear();
  const month = manilaNow.getUTCMonth();
  const day = manilaNow.getUTCDate();

  // Date.UTC rolls over correctly for negative days and months.
  const at = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));

  let bucket: AnalyticsBucket;
  let start: Date;
  let end: Date;
  let previousStart: Date;

  switch (range) {
    case "today":
      bucket = "hour";
      start = at(year, month, day);
      end = at(year, month, day + 1);
      previousStart = at(year, month, day - 1);
      break;
    case "7d":
      bucket = "day";
      start = at(year, month, day - 6);
      end = at(year, month, day + 1);
      previousStart = at(year, month, day - 13);
      break;
    case "30d":
      bucket = "day";
      start = at(year, month, day - 29);
      end = at(year, month, day + 1);
      previousStart = at(year, month, day - 59);
      break;
    case "12mo":
      bucket = "month";
      start = at(year, month - 11, 1);
      end = at(year, month + 1, 1);
      previousStart = at(year, month - 23, 1);
      break;
  }

  return {
    range,
    bucket,
    start: toSqlTimestamp(start),
    end: toSqlTimestamp(end),
    previous_start: toSqlTimestamp(previousStart),
  };
}

// Reads ?range=, defaulting to 30 days. Returns null when it is not allowed.
export function readAnalyticsRange(rawRange: unknown) {
  const range = rawRange === undefined || rawRange === "" ? "30d" : rawRange;
  return isAnalyticsRange(range) ? resolveAnalyticsRange(range) : null;
}

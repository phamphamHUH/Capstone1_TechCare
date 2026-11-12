// Date ranges for the admin analytics endpoints.
//
// Ranges follow the viewer's time zone: the browser sends its IANA name as
// ?tz= (e.g. "Asia/Manila"). Bills and records are TIMESTAMPTZ columns, so SQL
// converts them to that zone's wall-clock time with `AT TIME ZONE ${tz}` and
// compares them to the wall-clock bounds built here. Without ?tz= the clinic's
// zone is used.

export const ANALYTICS_RANGES = ["today", "7d", "30d", "12mo"] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

// How the sales chart groups its points for each range.
export type AnalyticsBucket = "hour" | "day" | "month";

export type ResolvedAnalyticsRange = {
  range: AnalyticsRange;
  bucket: AnalyticsBucket;
  // The viewer's IANA time zone the bounds below are in.
  time_zone: string;
  // Wall-clock times in time_zone as "YYYY-MM-DD HH:MM:SS" (start inclusive, end exclusive).
  start: string;
  end: string;
  // The period of the same length right before `start`, for comparisons.
  previous_start: string;
};

// Used when the browser doesn't send ?tz=.
export const CLINIC_TIME_ZONE = "Asia/Manila";

// Reads ?tz=. Returns null when it isn't a time zone Intl knows.
export function readTimeZone(rawTimeZone: unknown): string | null {
  if (rawTimeZone === undefined || rawTimeZone === "") return CLINIC_TIME_ZONE;
  if (typeof rawTimeZone !== "string" || rawTimeZone.length > 64) return null;
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: rawTimeZone })
      .resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

// The wall-clock year/month/day in a time zone at a given moment.
function wallClockDate(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const part = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  return { year: part("year"), month: part("month") - 1, day: part("day") };
}

export function isAnalyticsRange(value: unknown): value is AnalyticsRange {
  return (
    typeof value === "string" &&
    (ANALYTICS_RANGES as readonly string[]).includes(value)
  );
}

// Formats a Date whose UTC fields hold a wall-clock time.
function toSqlTimestamp(date: Date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

export function resolveAnalyticsRange(
  range: AnalyticsRange,
  timeZone: string = CLINIC_TIME_ZONE,
  now: Date = new Date(),
): ResolvedAnalyticsRange {
  // Today's date as the viewer sees it.
  const { year, month, day } = wallClockDate(now, timeZone);

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
    time_zone: timeZone,
    start: toSqlTimestamp(start),
    end: toSqlTimestamp(end),
    previous_start: toSqlTimestamp(previousStart),
  };
}

// Reads ?range= (default 30 days) and ?tz= (default clinic zone).
// Returns null when either is not allowed.
export function readAnalyticsRange(rawRange: unknown, rawTimeZone?: unknown) {
  const range = rawRange === undefined || rawRange === "" ? "30d" : rawRange;
  const timeZone = readTimeZone(rawTimeZone);
  return isAnalyticsRange(range) && timeZone
    ? resolveAnalyticsRange(range, timeZone)
    : null;
}

import { FlaskConical, RefreshCw, User } from "lucide-react";
import type { QueueEntry } from "../../../../interface/Queue";

type QueueColumnProps = {
  title: string; // "Consultation" or "Laboratory"
  entries: QueueEntry[]; // only the entries of THIS service type
};

// How many waiting patients we show before writing "+3 more".
const NEXT_IN_LINE_LIMIT = 8;

// Color theme per column (Consultation = blue, Laboratory = green).
const THEMES = {
  blue: {
    Icon: User,
    card: "border-sky-100 bg-sky-50/60",
    header: "bg-sky-50",
    iconBg: "bg-sky-400",
    title: "text-blue-950",
    label: "text-blue-950",
    banner: "bg-blue-800",
    bannerDivider: "border-blue-400/40",
    bannerSub: "text-blue-100/80",
    tableHead: "bg-sky-50/70 text-blue-950",
    index: "text-blue-600",
    chip: "bg-sky-100 text-blue-600",
    rowAlt: "bg-sky-50/40",
    footer: "bg-sky-50 text-blue-700/80",
    footerIcon: "text-blue-600",
  },
  green: {
    Icon: FlaskConical,
    card: "border-emerald-100 bg-emerald-50/60",
    header: "bg-emerald-50",
    iconBg: "bg-emerald-500",
    title: "text-green-900",
    label: "text-blue-950",
    banner: "bg-green-700",
    bannerDivider: "border-green-300/40",
    bannerSub: "text-green-100/80",
    tableHead: "bg-emerald-50/70 text-blue-950",
    index: "text-green-700",
    chip: "bg-emerald-100 text-green-800",
    rowAlt: "bg-emerald-50/40",
    footer: "bg-emerald-50 text-green-700/80",
    footerIcon: "text-green-600",
  },
} as const;

function QueueColumn({ title, entries }: QueueColumnProps) {
  const theme = title.toLowerCase() === "laboratory" ? THEMES.green : THEMES.blue;
  const { Icon } = theme;

  // Split the entries by status. The backend already sends them in queue order.
  // IMPORTANT: the database has both "Waiting" and "waiting", so we compare
  // the lowercase version of the status.
  const statusOf = (entry: QueueEntry) => entry.status.toLowerCase();

  const serving = entries.filter((entry) => statusOf(entry) === "serving");
  const waiting = entries.filter(
    (entry) => statusOf(entry) === "waiting" || statusOf(entry) === "skipped",
  );
  const completedCount = entries.filter(
    (entry) => statusOf(entry) === "completed",
  ).length;

  const servingRooms = serving
    .map((entry) => entry.room)
    .filter(Boolean)
    .join(", ");

  return (
    <section
      className={`flex flex-col overflow-hidden rounded-lg border ${theme.card}`}
    >
      {/* Title */}
      <div className={`flex items-center gap-3 px-4 py-3 ${theme.header}`}>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full text-white ${theme.iconBg}`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <h3 className={`text-xl font-bold ${theme.title}`}>{title} Queue</h3>
      </div>

      {/* NOW SERVING */}
      <div className="bg-white">
        <p className={`px-4 py-2 text-sm font-semibold ${theme.label}`}>
          Now Serving
        </p>

        {serving.length === 0 ? (
          <div className={`${theme.banner} px-6 py-6 text-center text-lg font-semibold text-white/80`}>
            No one is being served
          </div>
        ) : (
          serving.map((entry) => (
            <div
              key={entry.queue_id}
              className={`flex items-center text-white ${theme.banner}`}
            >
              <p className="flex-1 py-4 text-center text-5xl font-extrabold tracking-wide tabular-nums">
                {entry.queue_id}
              </p>
              <div
                className={`my-3 border-l px-6 py-2 text-center ${theme.bannerDivider}`}
              >
                <p className="text-lg font-bold">{entry.room || "—"}</p>
                <p className={`text-xs ${theme.bannerSub}`}>
                  {entry.service_name || title}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* NEXT IN LINE */}
      <div className="flex-1 bg-white">
        <table className="w-full text-left">
          <thead>
            <tr className={`text-xs font-semibold ${theme.tableHead}`}>
              <th className="w-10 px-4 py-2.5">#</th>
              <th className="px-2 py-2.5">Queue Number</th>
              <th className="px-2 py-2.5">Patient Name</th>
              <th className="px-4 py-2.5 text-right">Room Number</th>
            </tr>
          </thead>
          <tbody>
            {waiting.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  Queue is empty
                </td>
              </tr>
            ) : (
              waiting.slice(0, NEXT_IN_LINE_LIMIT).map((entry, index) => (
                <tr
                  key={entry.queue_id}
                  className={`border-t border-slate-100 ${index % 2 === 1 ? theme.rowAlt : ""}`}
                >
                  <td className={`px-4 py-4 text-base ${theme.index}`}>
                    {index + 1}
                  </td>
                  <td className="px-2 py-4">
                    <span
                      className={`inline-block rounded px-2.5 py-1 text-base font-bold tabular-nums ${theme.chip}`}
                    >
                      {entry.queue_id}
                    </span>
                  </td>
                  <td className="px-2 py-4 text-base text-slate-800">
                    <span className="flex flex-wrap items-center gap-2">
                      {entry.patient_name}
                      {entry.is_priority && (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                          PRIORITY
                        </span>
                      )}
                      {statusOf(entry) === "skipped" && (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          skipped
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="inline-block rounded border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-800">
                      {entry.room || "—"}
                    </span>
                  </td>
                </tr>
              ))
            )}

            {waiting.length > NEXT_IN_LINE_LIMIT && (
              <tr className="border-t border-slate-100">
                <td colSpan={4} className="px-4 py-2 text-sm text-slate-500">
                  +{waiting.length - NEXT_IN_LINE_LIMIT} more
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer counters */}
      <div className={`flex items-center gap-2 px-4 py-2.5 text-xs ${theme.footer}`}>
        <RefreshCw className={`h-3.5 w-3.5 ${theme.footerIcon}`} />
        <span>
          {waiting.length} {waiting.length === 1 ? "patient" : "patients"} waiting
          {servingRooms ? ` • ${servingRooms} in service` : ""}
          {` • ${completedCount} done today`}
        </span>
      </div>
    </section>
  );
}

export default QueueColumn;

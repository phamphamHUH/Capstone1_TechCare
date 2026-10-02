import { useEffect, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  CalendarDays, ChevronLeft, ChevronRight, FlaskConical, Search, Stethoscope, X,
} from "lucide-react";
import api from "../../../lib/axios";
import Header from "../../../components/Header";

const PAGE_SIZE = 10;
const API = "/api/doctor/medical-history";
const CATEGORIES = ["Consultation", "Laboratory"];
// Must match the status strings stored in the DB.
const STATUSES = ["Requested", "Processing", "Completed", "Released"];
const STATUS_COLORS: Record<string, string> = {
  released: "bg-green-100 text-green-700",
  completed: "bg-sky-100 text-sky-700",
  processing: "bg-indigo-100 text-indigo-700",
  requested: "bg-amber-100 text-amber-700",
  pending: "bg-slate-200 text-slate-700",
};

type Props = {
  loadData: () => Promise<void>;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  loading: boolean;
  patient_id?: string;
};
type RecordType = "consultation" | "laboratory";
type Rec = {
  record_type: RecordType; record_id: string; service_name: string;
  service_category: string; status: string; occurred_at: string; room?: string | null;
};
type Pagination = { page: number; limit: number; total: number; total_pages: number };
type ListResponse = { records: Rec[]; pagination?: Pagination };
type Rx = {
  prescription_id: string; prescription_items: unknown; notes: unknown;
  valid_until: string | null; prescribed_at: string; prescribed_by: string | null;
};
type LabRow = {
  result_id: string; result_value: unknown; unit: string | null; reference_range: string | null;
  flag: string | null; remarks: unknown; verified_by: string | null; verified_at: string | null;
};
type Details = {
  service_name: string; room: string | null; results?: LabRow[]; prescription?: Rx[];
} & Partial<Record<
  | "lab_item_id" | "status" | "updated_at" | "requested_by" | "requested_by_role"
  | "processed_by" | "processed_by_role" | "consultation_record_id" | "consultation_type"
  | "consulted_at" | "consulted_by", string | null
>> & Partial<Record<
  "diagnosis" | "notes" | "presenting_complaint" | "vital_signs" | "physical_examination", unknown
>>;
type Row = [label: string, value: unknown, sub?: unknown];

/* ---------- helpers ---------- */
const toDate = (v?: string | null) => {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};
const fmtDate = (v?: string | null) =>
  toDate(v)?.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) ?? "N/A";
const fmtTime = (v?: string | null) =>
  toDate(v)?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) ?? "";
const fmtDateTime = (v?: string | null) => (v ? `${fmtDate(v)} ${fmtTime(v)}`.trim() : "N/A");
const humanize = (k: string) => k.replace(/_/g, " ").trim().replace(/^./, (c) => c.toUpperCase());
const same = (a?: Rec | null, b?: Rec | null) =>
  !!a && !!b && a.record_id === b.record_id && a.record_type === b.record_type;
const isObj = (d: unknown) => !!d && typeof d === "object";
const isList = (d: unknown) => isObj(d) && Array.isArray((d as ListResponse).records);

/** Parses JSON-looking strings, with a lenient regex fallback for malformed ones. */
function parseLooseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!/^[{[]/.test(text)) return value;
  try {
    return JSON.parse(text);
  } catch {
    /* fall through to the lenient parser */
  }
  const result: Record<string, string> = {};
  const pattern = /"([^"]+)"\s*:\s*"([\s\S]*?)"+\s*(?=,\s*"[^"]+"\s*:|\}\s*$)/g;
  for (let m; (m = pattern.exec(text)); ) result[m[1]] = m[2];
  return Object.keys(result).length ? result : text.replace(/^[{[]\s*/, "").replace(/\s*[}\]]$/, "");
}

/** Flatten any value to text. `readable` keeps line breaks and labels (notes, complaints). */
function toText(value: unknown, readable = false): string {
  const v = parseLooseJson(value);
  if (v == null || v === "") return "";
  if (typeof v !== "object") return String(v);
  if (Array.isArray(v)) {
    return v.map((x) => toText(x, readable)).filter(Boolean).join(readable ? "\n" : ", ");
  }
  const entries = Object.entries(v)
    .map(([k, x]) => [k, toText(x, readable)] as const)
    .filter(([, x]) => x);
  if (!readable) return entries.map(([, x]) => x).join(" · ");
  return entries.length === 1 ? entries[0][1] : entries.map(([k, x]) => `${humanize(k)}: ${x}`).join("\n");
}
const display = (v: unknown) => toText(v);
const readable = (v: unknown) => toText(v, true);

const asList = (v: unknown): unknown[] => {
  const p = parseLooseJson(v);
  return p == null || p === "" ? [] : Array.isArray(p) ? p : [p];
};

/** Non-empty [key, value] pairs if the value is an object, else null. */
function entriesOf(value: unknown) {
  const p = parseLooseJson(value);
  if (!p || typeof p !== "object" || Array.isArray(p)) return null;
  return Object.entries(p).filter(([, v]) => display(v));
}

function describeError(err: any, fallback: string) {
  const status = err?.response?.status;
  const msg = err?.response?.data?.detail ?? err?.response?.data?.message ?? err?.message;
  return !status && !msg ? fallback : `${fallback} (${status ?? "no response"}${msg ? `: ${msg}` : ""})`;
}

/** GET `url` when it or `params` change (null = idle). Aborts stale requests. */
function useApiGet<T>(
  url: string | null,
  label: string,
  { params, validate = isObj, keep = false }: {
    params?: Record<string, unknown>; validate?: (d: unknown) => boolean; keep?: boolean;
  } = {},
) {
  const paramsJson = JSON.stringify(params ?? {});
  const key = url && `${url}?${paramsJson}`;
  const [state, setState] = useState<{ key: string | null; data: T | null; error: string | null }>({
    key: null, data: null, error: null,
  });

  useEffect(() => {
    if (!url || !key) return;
    const controller = new AbortController();
    api
      .get(url, { signal: controller.signal, params: JSON.parse(paramsJson) })
      .then(({ data }) => {
        if (!validate(data)) throw new Error("Unexpected response from the server. Check the API path.");
        setState({ key, data, error: null });
      })
      .catch((err) => {
        if (err?.code === "ERR_CANCELED") return;
        console.error(label, err);
        setState({ key, data: null, error: describeError(err, label) });
      });
    return () => controller.abort();
  }, [url, key, paramsJson, label, validate]);

  const current = state.key === key;
  return {
    data: key && (current || keep) ? state.data : null,
    error: key && current ? state.error : null,
    loading: !!key && !current,
  };
}

/* ---------- small pieces ---------- */

const NoData = ({ children = "No data" }: { children?: ReactNode }) => (
  <span className="text-slate-400">{children}</span>
);

const ErrorBox = ({ message }: { message: string }) => (
  <p className="break-words rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{message}</p>
);

const StatusPill = ({ status }: { status?: string | null }) =>
  status ? (
    <span
      className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
        STATUS_COLORS[status.toLowerCase()] ?? "bg-red-50 text-red-700"
      }`}
    >
      {status}
    </span>
  ) : null;

const RecordIcon = ({ type }: { type: RecordType }) =>
  type === "laboratory" ? (
    <FlaskConical size={18} className="text-slate-600" />
  ) : (
    <Stethoscope size={18} className="text-red-800" />
  );

const DetailRow = ({ label, value, sub }: { label: string; value?: unknown; sub?: unknown }) => (
  <div className="flex items-start justify-between gap-4 text-xs">
    <span className="text-slate-500">{label}</span>
    <span className="text-right">
      <span className="block break-words font-semibold text-slate-900">{display(value) || "N/A"}</span>
      {display(sub) && <span className="block text-[11px] capitalize text-slate-500">{display(sub)}</span>}
    </span>
  </div>
);

const TextBlock = ({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <h5 className="text-sm font-semibold text-slate-900">{title}</h5>
      {action}
    </div>
    <div className="whitespace-pre-line break-words rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800">
      {children}
    </div>
  </div>
);

const LinkButton = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => (
  <button type="button" onClick={onClick} className="text-xs text-sky-600 underline hover:text-sky-800">
    {children}
  </button>
);

function KeyValueOrText({ value }: { value: unknown }) {
  const entries = entriesOf(value);
  if (!entries) return <>{readable(value) || <NoData />}</>;
  if (!entries.length) return <NoData />;
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {entries.map(([k, v]) => (
        <div key={k} className="rounded-lg bg-white p-2">
          <dt className="text-[11px] uppercase tracking-wide text-slate-500">{k.replace(/_/g, " ")}</dt>
          <dd className="text-sm font-medium text-slate-900">{display(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function PrescriptionItems({ items }: { items: unknown[] }) {
  return (
    <div className="divide-y divide-slate-200">
      {items.map((item, i) => {
        const entries = entriesOf(item);
        const name = entries?.find(([k]) => /name|medic|drug/i.test(k));
        return (
          <div key={i} className="space-y-0.5 py-2 text-xs first:pt-0 last:pb-0">
            {!entries ? (
              <p className="text-slate-800">{display(item)}</p>
            ) : (
              <>
                {name && <p className="font-semibold text-slate-900">{display(name[1])}</p>}
                {entries.filter((e) => e !== name).map(([k, v]) => (
                  <p key={k} className="text-slate-700">
                    <span className="text-slate-500">{humanize(k)}:</span> {display(v)}
                  </p>
                ))}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LabResults({ results }: { results: LabRow[] }) {
  return (
    <div className="divide-y divide-slate-200">
      {results.map((r, i) => {
        const remarks = readable(r.remarks);
        const abnormal = !!r.flag && !/^(normal|n)$/i.test(r.flag);
        return (
          <div key={r.result_id ?? i} className="space-y-0.5 py-2 first:pt-0 last:pb-0">
            <p className="text-xs font-semibold text-slate-900">
              {display(r.result_value) || "N/A"}
              {r.unit ? ` ${r.unit}` : ""}
              {r.flag && (
                <span className={`ml-2 text-[11px] ${abnormal ? "text-red-600" : "text-green-600"}`}>{r.flag}</span>
              )}
            </p>
            {r.reference_range && <p className="text-xs text-slate-500">Reference: {r.reference_range}</p>}
            {remarks && <p className="text-xs text-slate-600">{remarks}</p>}
            {r.verified_by && (
              <p className="text-[11px] text-slate-400">
                Verified by {r.verified_by}
                {r.verified_at ? ` · ${fmtDateTime(r.verified_at)}` : ""}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- right panel ---------- */

function VisitDetails({ sel, d, loading, error, onViewFull }: {
  sel: Rec | null; d: Details | null; loading: boolean; error: string | null; onViewFull: () => void;
}) {
  const isLab = sel?.record_type === "laboratory";
  const labResults = d?.results ?? [];
  const rxItems = (d?.prescription ?? []).flatMap((p) => asList(p.prescription_items));

  let rows: Row[] = [];
  if (sel) {
    const extra: Row[] = !d ? [] : isLab
      ? [["Requested By", d.requested_by, d.requested_by_role], ["Processed By", d.processed_by, d.processed_by_role]]
      : [["Consulted By", d.consulted_by]];
    rows = [
      isLab ? ["Lab Item ID", d?.lab_item_id ?? sel.record_id] : ["Consultation ID", d?.consultation_record_id ?? sel.record_id],
      ["Date & Time", fmtDateTime(isLab ? sel.occurred_at : (d?.consulted_at ?? sel.occurred_at))],
      ...extra,
      ["Room", d?.room ?? sel.room],
      ["Status", sel.status],
    ];
  }

  return (
    <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Visit Details</h3>
        <StatusPill status={sel?.status} />
      </div>

      {!sel || loading ? (
        <p className="py-10 text-center text-xs text-slate-500">
          {!sel ? "Select a record to see its details." : "Loading details..."}
        </p>
      ) : (
        <div className="mt-4 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <RecordIcon type={sel.record_type} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{display(d?.service_name) || display(sel.service_name)}</p>
              <p className="text-xs capitalize text-slate-500">
                {isLab ? "Laboratory" : display(d?.consultation_type) || "Consultation"}
              </p>
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-4">
            {rows.map(([label, value, sub]) => <DetailRow key={label} label={label} value={value} sub={sub} />)}
          </div>

          {error && <ErrorBox message={error} />}

          {d && (
            <div className="space-y-4 border-t border-slate-100 pt-4">
              {isLab ? (
                <TextBlock
                  title="Result"
                  action={labResults.length > 0 && <LinkButton onClick={onViewFull}>View Full Result</LinkButton>}
                >
                  {labResults.length > 0 ? (
                    <LabResults results={labResults} />
                  ) : (
                    <NoData>
                      {sel.status === "Requested"
                        ? "Awaiting laboratory processing. No result has been recorded yet."
                        : "No result has been recorded yet."}
                    </NoData>
                  )}
                </TextBlock>
              ) : (
                <>
                  <TextBlock title="Diagnosis">{display(d.diagnosis) || <NoData />}</TextBlock>
                  <TextBlock
                    title="Prescription"
                    action={<LinkButton onClick={onViewFull}>View Full Prescription</LinkButton>}
                  >
                    {rxItems.length ? <PrescriptionItems items={rxItems} /> : <NoData>No prescription</NoData>}
                  </TextBlock>
                  <TextBlock title="Doctor's Notes">{readable(d.notes) || <NoData />}</TextBlock>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

/* ---------- full record modal ---------- */

function FullRecordModal({ type, full, loading, error, onClose }: {
  type: RecordType; full: Details | null; loading: boolean; error: string | null; onClose: () => void;
}) {
  const isLab = type === "laboratory";
  const rows: Row[] = !full ? [] : isLab
    ? [
        ["Lab Item ID", full.lab_item_id], ["Status", full.status], ["Room", full.room],
        ["Last updated", fmtDateTime(full.updated_at)],
        ["Requested By", full.requested_by, full.requested_by_role],
        ["Processed By", full.processed_by, full.processed_by_role],
      ]
    : [
        ["Consultation ID", full.consultation_record_id], ["Type", full.consultation_type],
        ["Room", full.room], ["Consulted By", full.consulted_by],
        ["Date & Time", fmtDateTime(full.consulted_at)],
      ];
  const results = full?.results ?? [];
  const prescriptions = full?.prescription ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {isLab ? "Full laboratory result" : "Full consultation record"}
            </h3>
            {full && <p className="text-xs text-slate-500">{display(full.service_name)}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {loading && <p className="py-10 text-center text-sm text-slate-500">Loading record...</p>}
        {error && <div className="mt-4"><ErrorBox message={error} /></div>}

        {full && (
          <div className="mt-5 space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {rows.map(([label, value, sub]) => <DetailRow key={label} label={label} value={value} sub={sub} />)}
            </div>

            {isLab ? (
              <TextBlock title="Results">
                {results.length ? <LabResults results={results} /> : <NoData>No result has been recorded yet.</NoData>}
              </TextBlock>
            ) : (
              <>
                <TextBlock title="Vital signs"><KeyValueOrText value={full.vital_signs} /></TextBlock>
                <TextBlock title="Chief complaint">{readable(full.presenting_complaint) || <NoData />}</TextBlock>
                <TextBlock title="Physical examination"><KeyValueOrText value={full.physical_examination} /></TextBlock>
                <TextBlock title="Diagnosis">{display(full.diagnosis) || <NoData />}</TextBlock>
                <TextBlock title="Doctor's notes">{readable(full.notes) || <NoData />}</TextBlock>

                <div className="space-y-2">
                  <h5 className="text-sm font-semibold text-slate-900">Prescriptions</h5>
                  {prescriptions.length === 0 && (
                    <p className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-500">
                      No prescriptions for this consultation.
                    </p>
                  )}
                  {prescriptions.map((p, i) => {
                    const items = asList(p.prescription_items);
                    const notes = readable(p.notes);
                    return (
                      <div key={p.prescription_id ?? i} className="rounded-lg border border-slate-200 p-3 text-xs">
                        <p className="font-semibold text-slate-900">
                          Prescribed {fmtDateTime(p.prescribed_at)}
                          {p.prescribed_by ? ` by ${display(p.prescribed_by)}` : ""}
                        </p>
                        {p.valid_until && <p className="text-slate-500">Valid until {fmtDate(p.valid_until)}</p>}
                        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
                          {items.length ? <PrescriptionItems items={items} /> : <NoData>No items</NoData>}
                        </div>
                        {notes && <p className="mt-2 whitespace-pre-line text-slate-600">{notes}</p>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- page ---------- */

const FIELD = "h-9 rounded-lg border border-slate-200 text-xs outline-none focus:border-red-500";
const EMPTY_FILTERS = { category: "", status: "", startDate: "", endDate: "" };
type Filters = typeof EMPTY_FILTERS;

function MedicalHistoryContent({ loadData, open, setOpen, loading, patient_id: patientIdProp }: Props) {
  const initialId = patientIdProp ?? new URLSearchParams(window.location.search).get("patient_id") ?? "";

  // `patientInput` is the text box; `patientId` is what's actually loaded.
  const [patientInput, setPatientInput] = useState(initialId);
  const [patientId, setPatientId] = useState(initialId);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Rec | null>(null);
  const [fullOpen, setFullOpen] = useState(false);

  function commitPatientId(value: string) {
    const next = value.trim();
    if (next === patientId) return;
    setPatientId(next);
    setPage(1);
    setSelected(null);
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("patient_id", next);
    else url.searchParams.delete("patient_id");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }

  const setFilter = (key: keyof Filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  useEffect(() => {
    const t = setTimeout(() => commitPatientId(patientInput), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientInput]);

  const list = useApiGet<ListResponse>(
    patientId ? `${API}/${encodeURIComponent(patientId)}` : null,
    "Unable to load medical history",
    {
      params: {
        service_category: filters.category || undefined,
        status: filters.status || undefined,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
        page,
        limit: PAGE_SIZE,
      },
      validate: isList,
      keep: true,
    },
  );
  const records = list.data?.records ?? [];
  const pagination = list.data?.pagination ?? null;

  // Keep the selection if it's still on the page, otherwise pick the first row.
  useEffect(() => {
    const recs = list.data?.records;
    setSelected((prev) => (recs ? (recs.find((r) => same(r, prev)) ?? recs[0] ?? null) : null));
  }, [list.data]);

  const recordUrl = selected ? `${API}/${selected.record_type}/${encodeURIComponent(selected.record_id)}` : null;
  const details = useApiGet<Details>(recordUrl, "Unable to load the full visit details");
  const full = useApiGet<Details>(fullOpen && recordUrl ? `${recordUrl}/full` : null, "Unable to load the full record");

  const totalPages = Math.max(pagination?.total_pages ?? 1, 1);
  const first = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pageNumbers = Array.from({ length: Math.min(totalPages, first + 4) - first + 1 }, (_, i) => first + i);
  const hasRecords = !!pagination && pagination.total > 0;
  const arrow = "flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40";
  const empty = "rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500";

  const selects: [keyof Filters, string, string[]][] = [
    ["category", "All Services", CATEGORIES],
    ["status", "All Status", STATUSES],
  ];
  const dates: [keyof Filters, string, { min?: string; max?: string }][] = [
    ["startDate", "Start date", { max: filters.endDate || undefined }],
    ["endDate", "End date", { min: filters.startDate || undefined }],
  ];

  return (
    <main className="min-w-0 flex-1 bg-slate-50">
      <Header open={open} loading={loading} setOpen={setOpen} loadData={loadData} page="Medical History" />

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <section className="flex min-h-[32rem] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Medical History</h2>
          <p className="text-xs text-slate-500">View the patient&apos;s past visits, services, and records.</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <form
              className="relative min-w-[11rem] flex-1 sm:max-w-[16rem]"
              onSubmit={(e) => { e.preventDefault(); commitPatientId(patientInput); }}
            >
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={patientInput}
                onChange={(e) => setPatientInput(e.target.value)}
                placeholder="Search by patient ID..."
                aria-label="Patient ID"
                className={`${FIELD} w-full pl-8 pr-8`}
              />
              {patientInput && (
                <button
                  type="button"
                  aria-label="Clear patient ID"
                  onClick={() => { setPatientInput(""); commitPatientId(""); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </form>

            {selects.map(([key, all, options]) => (
              <select key={key} value={filters[key]} onChange={(e) => setFilter(key, e.target.value)} className={`${FIELD} bg-white px-3`}>
                <option value="">{all}</option>
                {options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ))}

            {dates.map(([key, label, limits]) => (
              <label key={key} className={`${FIELD} flex items-center gap-2 px-3 text-slate-500`}>
                <CalendarDays size={14} />
                <input
                  type="date"
                  aria-label={label}
                  value={filters[key]}
                  {...limits}
                  onChange={(e) => setFilter(key, e.target.value)}
                  className="bg-transparent outline-none"
                />
              </label>
            ))}
          </div>

          <div className="mt-4 flex-1">
            {!patientId ? (
              <p className={empty}>Enter a patient ID to view their medical history.</p>
            ) : list.loading ? (
              <p className="p-10 text-center text-sm text-slate-500">Loading medical history...</p>
            ) : list.error ? (
              <ErrorBox message={list.error} />
            ) : records.length === 0 ? (
              <p className={empty}>No records found for this patient with the current filters.</p>
            ) : (
              <ol className="relative">
                {records.map((r, i) => (
                  <li key={`${r.record_type}-${r.record_id}`} className="relative flex gap-4">
                    <div className="relative flex w-3 flex-col items-center">
                      <span className="mt-8 h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500" />
                      {i < records.length - 1 && (
                        <span className="absolute bottom-[-2rem] top-[2.6rem] w-px bg-sky-300" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelected(r)}
                      className={`flex flex-1 items-center gap-4 border-b border-slate-100 px-2 py-3 text-left transition hover:bg-slate-50 ${
                        same(selected, r) ? "bg-slate-50" : ""
                      }`}
                    >
                      <div className="w-24 shrink-0">
                        <p className="text-xs font-semibold text-slate-900">{fmtDate(r.occurred_at)}</p>
                        <p className="text-[11px] text-slate-400">{fmtTime(r.occurred_at)}</p>
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                        <RecordIcon type={r.record_type} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{display(r.service_name)}</p>
                        <p className="text-xs text-slate-500">
                          {display(r.service_category)}
                          {r.room ? ` • ${display(r.room)}` : ""}
                        </p>
                      </div>
                      <StatusPill status={r.status} />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>
              {hasRecords
                ? `Showing ${(pagination.page - 1) * pagination.limit + 1}-${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} records`
                : "Showing 0 records"}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page" className={arrow}>
                <ChevronLeft size={14} />
              </button>
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`h-7 min-w-7 rounded-md px-2 font-semibold ${
                    n === page ? "bg-red-800 text-white" : "border border-slate-200 text-slate-600"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} aria-label="Next page" className={arrow}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>

        <VisitDetails
          sel={selected}
          d={details.data}
          loading={details.loading}
          error={details.error}
          onViewFull={() => setFullOpen(true)}
        />
      </div>

      {fullOpen && selected && (
        <FullRecordModal
          type={selected.record_type}
          full={full.data}
          loading={full.loading}
          error={full.error}
          onClose={() => setFullOpen(false)}
        />
      )}
    </main>
  );
}

export default MedicalHistoryContent;
import { useEffect, useState } from "react";
import axios from "axios";
import { FlaskConical, Stethoscope, MousePointerClick } from "lucide-react";
import api from "#lib/axios";
import type { HistoryRecord } from "../../../../../interface/HistoryRecord"; // adjust depth

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

type LabResultRow = {
  result_id: string | number;
  results: Json; // JSONB array
  remarks: string | null;
  image_url: string | null;
};

type LabDetails = {
  record_type: "laboratory";
  requested_by: string;
  processed_by: string;
  updated_at: string;
  results: LabResultRow[];
};

type Prescription = {
  prescription_id: string | number;
  prescription_items: Json;
  notes: string | null;
  valid_until: string | null;
  prescribed_at: string;
  prescribed_by: string;
};

type ConsultationDetails = {
  record_type: "consultation";
  consultation_type: string | null;
  diagnosis: Json;
  notes: Json;
  presenting_complaint: Json;
  vital_signs: Json;
  physical_examination: Json;
  consulted_by: string;
  prescription: Prescription[];
};

type Details = LabDetails | ConsultationDetails;
type Fetched = { id: string; data: Details | null; error: string | null };

const normalizeStatus = (s: string) =>
  s.trim().toLowerCase().replace(/\s+/g, "-");

const badgeStyles: Record<string, string> = {
  requested: "bg-amber-500",
  waiting: "bg-gray-400",
  collected: "bg-violet-500",
  "in-progress": "bg-indigo-500",
  completed: "bg-sky-500",
  released: "bg-green-500",
  cancelled: "bg-red-500",
};

const dotTextStyles: Record<string, string> = {
  requested: "text-amber-600 before:bg-amber-500",
  waiting: "text-gray-600 before:bg-gray-400",
  collected: "text-violet-600 before:bg-violet-500",
  "in-progress": "text-indigo-600 before:bg-indigo-500",
  completed: "text-sky-600 before:bg-sky-500",
  released: "text-green-600 before:bg-green-500",
  cancelled: "text-red-600 before:bg-red-500",
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });

const fmtDateTime = (iso: string) =>
  `${fmtDate(iso)} ${new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Manila",
  })}`;

const humanize = (k: string) =>
  k.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());

const isEmpty = (v: Json | undefined): boolean =>
  v == null ||
  v === "" ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0);

// Safely renders any JSON value: strings, arrays, nested objects
function JsonView({ value }: { value: Json | undefined }) {
  if (isEmpty(value)) return null;

  if (typeof value !== "object" || value === null) {
    return <span className="whitespace-pre-line">{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    return (
      <ul className="space-y-1.5">
        {value.map((v, i) => (
          <li
            key={i}
            className="rounded-md bg-white px-2 py-1.5 ring-1 ring-gray-200"
          >
            <JsonView value={v} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <dl className="space-y-1">
      {Object.entries(value)
        .filter(([, v]) => !isEmpty(v))
        .map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="shrink-0 text-gray-400">{humanize(k)}:</dt>
            <dd className="min-w-0 text-gray-700">
              <JsonView value={v} />
            </dd>
          </div>
        ))}
    </dl>
  );
}

// Lab results: guesses common key names until the real ones are confirmed
const pick = (o: Record<string, Json>, keys: string[]) => {
  for (const k of keys) if (o[k] != null && o[k] !== "") return o[k];
  return null;
};

const toRows = (results: Json) =>
  (Array.isArray(results) ? results : results ? [results] : [])
    .filter(
      (r): r is Record<string, Json> =>
        typeof r === "object" && r !== null && !Array.isArray(r),
    )
    .map((r) => ({
      test: pick(r, ["test", "name", "parameter", "test_name"]),
      value: pick(r, ["value", "result", "result_value"]),
      unit: pick(r, ["unit", "units"]),
      range: pick(r, ["reference_range", "ref_range", "range", "normal_range"]),
      flag: pick(r, ["flag", "interpretation", "remarks"]),
    }));

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-gray-400">{label}</span>
      <div className="text-right font-semibold text-gray-800">{children}</div>
    </div>
  );
}

function PersonCell({
  name,
  role,
}: {
  name?: string | null;
  role?: string | null;
}) {
  if (!name) return <span className="text-gray-400">—</span>;
  return (
    <>
      <p>{name}</p>
      {role && (
        <p className="text-xs font-normal capitalize text-gray-400">{role}</p>
      )}
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-gray-100 py-4">
      <h3 className="mb-2 text-sm font-bold text-gray-900">{title}</h3>
      {children}
    </div>
  );
}

function VisitDetails({
  selectedRecord,
}: {
  selectedRecord: HistoryRecord | null;
}) {
  const [fetched, setFetched] = useState<Fetched | null>(null);
  const recordId = selectedRecord?.record_id ?? null;
  const recordType = selectedRecord?.record_type ?? null;

  useEffect(() => {
    if (!recordId || !recordType) return;
    const controller = new AbortController();

    api
      .get(
        `/api/fdstaff/patients/medical-history/details/${recordType}/${recordId}`,
        { signal: controller.signal },
      )
      .then((res) => {
        const body = res.data;
        if (!body || typeof body !== "object" || !("record_type" in body)) {
          throw new Error("Unexpected response from server.");
        }
        setFetched({ id: recordId, data: body, error: null });
      })
      .catch((err) => {
        if (axios.isCancel(err)) return;
        setFetched({
          id: recordId,
          data: null,
          error: err.response?.data?.message ?? err.message,
        });
      });

    return () => controller.abort();
  }, [recordId, recordType]);

  if (!selectedRecord) {
    return (
      <div>
        <h1 className="font-bold">Visit Details</h1>
        <div className="flex flex-col items-center gap-2 py-16 text-center text-gray-400">
          <MousePointerClick size={28} strokeWidth={1.5} />
          <p className="text-sm">Select a record to view its details.</p>
        </div>
      </div>
    );
  }

  const loading = fetched?.id !== recordId;
  const details = !loading ? fetched?.data : null;
  const error = !loading ? fetched?.error : null;

  const isLab = selectedRecord.record_type === "laboratory";
  const Icon = isLab ? FlaskConical : Stethoscope;
  const status = normalizeStatus(selectedRecord.status);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-bold">Visit Details</h1>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-semibold text-white ${
            badgeStyles[status] ?? "bg-gray-400"
          }`}
        >
          {selectedRecord.status}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3 pb-4">
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${
            isLab ? "bg-gray-100 text-gray-600" : "bg-indigo-50 text-indigo-500"
          }`}
        >
          <Icon size={22} strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900">
            {selectedRecord.service_name}
          </p>
          <p className="text-xs text-gray-500">
            {selectedRecord.service_category} Service
          </p>
        </div>
      </div>

      {/* Base rows: from the list, plus fetched people */}
      <div className="space-y-3 border-t border-gray-100 py-4">
        <Row label={isLab ? "Request ID" : "Record ID"}>
          {selectedRecord.record_id}
        </Row>
        <Row label="Date & Time">{fmtDateTime(selectedRecord.occurred_at)}</Row>

        {details?.record_type === "laboratory" && (
          <>
            <Row label="Requested By">
              <PersonCell name={details.requested_by} role="doctor" />
            </Row>
            <Row label="Processed By">
              <PersonCell name={details.processed_by} role="laboratory staff" />
            </Row>
          </>
        )}
        {details?.record_type === "consultation" && (
          <>
            <Row label="Consulted By">
              <PersonCell name={details.consulted_by} />
            </Row>
            <Row label="Type">{details.consultation_type || "—"}</Row>
          </>
        )}

        <Row label="Room">{selectedRecord.room}</Row>
        <Row label="Status">
          <span
            className={`inline-flex items-center gap-2 before:size-2 before:rounded-full before:content-[''] ${
              dotTextStyles[status] ?? "text-gray-600 before:bg-gray-400"
            }`}
          >
            {selectedRecord.status}
          </span>
        </Row>
      </div>

      {loading && (
        <div className="animate-pulse space-y-3 border-t border-gray-100 py-4">
          <div className="h-4 w-1/3 rounded bg-gray-100" />
          <div className="h-20 rounded bg-gray-100" />
        </div>
      )}

      {error && (
        <p className="py-6 text-center text-sm text-red-500">{error}</p>
      )}

      {/* Laboratory results */}
      {details?.record_type === "laboratory" && (
        <Section title="Results Summary">
          {details.results.length === 0 ? (
            <p className="text-sm text-gray-400">No results yet.</p>
          ) : (
            details.results.map((res) => {
              const rows = toRows(res.results);
              return (
                <div key={res.result_id} className="mb-3 last:mb-0">
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
                          <th className="px-3 py-2 font-semibold">Test</th>
                          <th className="px-3 py-2 font-semibold">Result</th>
                          <th className="px-3 py-2 font-semibold">Ref Range</th>
                          <th className="px-3 py-2 font-semibold">Flag</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => {
                          const flag =
                            r.flag == null ? "Normal" : String(r.flag);
                          const normal = flag.toLowerCase() === "normal";
                          return (
                            <tr
                              key={i}
                              className="border-b border-gray-100 last:border-b-0"
                            >
                              <td className="px-3 py-2.5 text-gray-700">
                                {r.test != null ? String(r.test) : "—"}
                              </td>
                              <td className="px-3 py-2.5 text-gray-700">
                                {r.value != null ? String(r.value) : "—"}{" "}
                                {r.unit != null && String(r.unit)}
                              </td>
                              <td className="px-3 py-2.5 text-gray-400">
                                {r.range != null ? String(r.range) : "—"}
                              </td>
                              <td
                                className={`px-3 py-2.5 font-medium ${
                                  normal ? "text-green-700" : "text-red-600"
                                }`}
                              >
                                {flag}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {res.remarks && (
                    <p className="mt-2 text-xs text-gray-500">{res.remarks}</p>
                  )}
                  {res.image_url && (
                    <a
                      href={res.image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-xs text-indigo-600 underline"
                    >
                      View image
                    </a>
                  )}
                </div>
              );
            })
          )}
        </Section>
      )}

      {/* Consultation */}
      {details?.record_type === "consultation" && (
        <>
          {(
            [
              ["Presenting Complaint", details.presenting_complaint],
              ["Vital Signs", details.vital_signs],
              ["Physical Examination", details.physical_examination],
              ["Diagnosis", details.diagnosis],
              ["Notes", details.notes],
            ] as [string, Json][]
          ).map(([title, value]) =>
            isEmpty(value) ? null : (
              <Section key={title} title={title}>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm">
                  <JsonView value={value} />
                </div>
              </Section>
            ),
          )}

          <Section title="Prescriptions">
            {details.prescription.length === 0 ? (
              <p className="text-sm text-gray-400">No prescriptions issued.</p>
            ) : (
              <div className="space-y-3">
                {details.prescription.map((p) => (
                  <div
                    key={p.prescription_id}
                    className="rounded-lg border border-gray-200 p-3 text-sm"
                  >
                    <div className="text-gray-700">
                      <JsonView value={p.prescription_items} />
                    </div>
                    {p.notes && (
                      <p className="mt-2 text-xs text-gray-500">{p.notes}</p>
                    )}
                    <p className="mt-2 text-[11px] text-gray-400">
                      Prescribed by {p.prescribed_by} on{" "}
                      {fmtDate(p.prescribed_at)}
                      {p.valid_until &&
                        ` · Valid until ${fmtDate(p.valid_until)}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

export default VisitDetails;

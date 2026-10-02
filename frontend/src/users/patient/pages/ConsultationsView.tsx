import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Search,
  Stethoscope,
} from "lucide-react";
import PatientSummaryCard from "../components/PatientSummaryCard";
import { fetchPatientMedicalHistory } from "../patientApi";
import type {
  HistoryRecord,
  Pagination,
  PatientSessionUser,
} from "../types";

type Props = {
  patient: PatientSessionUser;
  patientId: string;
};

const EMPTY_PAGINATION: Pagination = {
  page: 1,
  limit: 6,
  total: 0,
  total_pages: 1,
};

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return { date: "—", time: "—" };
  }

  return {
    date: date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function ConsultationsView({ patient, patientId }: Props) {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError("");

        const result = await fetchPatientMedicalHistory(patientId, {
          search: search.trim() || undefined,
          service_category: "Consultation",
          status: status || undefined,
          page,
          limit: 6,
        });

        const consultationRecords = (result.records ?? []).filter(
          (record) => record.record_type === "consultation",
        );

        setRecords(consultationRecords);
        setPagination(result.pagination ?? EMPTY_PAGINATION);

        setSelectedId((current) => {
          if (current && consultationRecords.some((item) => item.record_id === current)) {
            return current;
          }
          return consultationRecords[0]?.record_id ?? null;
        });
      } catch (requestError) {
        console.error("Unable to load patient consultation history:", requestError);
        setRecords([]);
        setSelectedId(null);
        setError("Unable to load consultation history.");
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [patientId, search, status, page]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const selected = useMemo(
    () => records.find((record) => record.record_id === selectedId) ?? null,
    [records, selectedId],
  );

  const selectedDate = selected ? formatDateTime(selected.occurred_at) : null;

  return (
    <div className="space-y-4">
      <PatientSummaryCard patient={patient} />

      <div className="grid min-h-[520px] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <h2 className="text-sm font-bold text-slate-900">Medical History</h2>
            <p className="mt-0.5 text-[10px] text-slate-400">
              View your consultation visits and records.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-500">
                <Search size={14} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by service..."
                  className="w-full bg-transparent outline-none"
                />
              </label>

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none"
              >
                <option value="">All Status</option>
                <option value="Completed">Completed</option>
                <option value="Released">Released</option>
              </select>
            </div>
          </div>

          <div className="min-h-[380px] p-3">
            {loading ? (
              <div className="flex h-72 items-center justify-center text-sm text-slate-400">
                Loading consultation history...
              </div>
            ) : error ? (
              <div className="flex h-72 items-center justify-center text-sm text-rose-500">
                {error}
              </div>
            ) : records.length === 0 ? (
              <div className="flex h-72 items-center justify-center text-sm text-slate-400">
                No consultation records found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {records.map((record) => {
                  const dateTime = formatDateTime(record.occurred_at);
                  const active = selectedId === record.record_id;

                  return (
                    <button
                      type="button"
                      key={record.record_id}
                      onClick={() => setSelectedId(record.record_id)}
                      className={`grid w-full grid-cols-[92px_1fr_auto] items-center gap-3 rounded-lg px-3 py-3 text-left transition ${
                        active ? "bg-sky-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div>
                        <p className="text-[10px] font-semibold text-slate-600">{dateTime.date}</p>
                        <p className="mt-0.5 text-[9px] text-slate-400">{dateTime.time}</p>
                      </div>

                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-500">
                          <Stethoscope size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-800">
                            {record.service_name}
                          </p>
                          <p className="mt-0.5 text-[9px] text-slate-400">
                            {record.service_category}
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full bg-sky-100 px-2 py-1 text-[9px] font-semibold text-sky-600">
                        {record.status}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[10px] text-slate-400">
            <span>
              Showing {records.length} of {pagination.total} records
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="rounded border border-slate-200 p-1.5 disabled:opacity-40"
              >
                <ChevronLeft size={12} />
              </button>
              <span className="rounded bg-sky-500 px-2 py-1.5 font-semibold text-white">{page}</span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(pagination.total_pages || 1, current + 1))}
                disabled={page >= (pagination.total_pages || 1)}
                className="rounded border border-slate-200 p-1.5 disabled:opacity-40"
              >
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </section>

        <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">Visit Details</h2>

          {!selected ? (
            <div className="flex h-64 items-center justify-center text-center text-xs text-slate-400">
              Select a consultation to view its details.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-50 text-sky-500">
                  <Stethoscope size={15} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">{selected.service_name}</p>
                  <p className="text-[10px] text-slate-400">{selected.service_category}</p>
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-slate-400">Record ID</p>
                  <p className="mt-1 break-all text-xs font-medium text-slate-700">{selected.record_id}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-slate-400">Date & Time</p>
                  <p className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-700">
                    <CalendarDays size={13} />
                    {selectedDate?.date} {selectedDate?.time}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-slate-400">Status</p>
                  <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-600">
                    {selected.status}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 text-[10px] leading-5 text-slate-500">
                This panel uses only the fields already returned by the consultation list endpoint. If your existing endpoint also returns diagnosis, doctor, room, vitals, or notes, those fields can be displayed here without any backend change.
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default ConsultationsView;

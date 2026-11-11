import { useEffect, useState } from "react";
import axios from "axios";
import {
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Search,
  Stethoscope,
} from "lucide-react";
import EmptyState from "../../../components/EmptyState";
import ErrorMessage from "../../../components/ErrorMessage";
import LoadingScreen from "../../../components/LoadingScreen";
import { fetchPatientMedicalHistory } from "../components/utils/patientApi";
import type { HistoryRecord, Pagination } from "../../../interface/PatientPortal";
import PatientVisitPanel from "../components/MedicalHistory/PatientVisitPanel";
import PortalStatus from "../components/PortalStatus";

type Props = {
  patientId: string;
  refreshKey?: number;
  onLoadingChange?: (loading: boolean) => void;
  onPrescriptions: (consultationId?: string) => void;
  laboratoryOnly?: boolean;
};
const fieldClass =
  "h-9 min-w-0 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-600 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20";
const recordKey = (record: HistoryRecord) =>
  record.record_type + ":" + record.record_id;

export default function MedicalHistory({
  patientId,
  refreshKey = 0,
  onLoadingChange,
  onPrescriptions,
  laboratoryOnly = false,
}: Props) {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [service, setService] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 6,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      onLoadingChange?.(true);
      setError("");
      try {
        const response = await fetchPatientMedicalHistory(
          patientId,
          {
            search: search.trim() || undefined,
            service_category: laboratoryOnly
              ? "Laboratory"
              : service || undefined,
            status: laboratoryOnly ? "Released" : status || undefined,
            start_date: startDate || undefined,
            end_date: endDate || undefined,
            page,
            limit: 6,
          },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setRecords(response.records);
        setPagination(response.pagination);
        setSelectedId((current) =>
          response.records.some((item) => recordKey(item) === current)
            ? current
            : response.records[0]
              ? recordKey(response.records[0])
              : null,
        );
      } catch (err) {
        if (axios.isCancel(err) || controller.signal.aborted) return;
        setError("Medical history could not be loaded. Please try refreshing.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          onLoadingChange?.(false);
        }
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [
    patientId,
    search,
    service,
    status,
    startDate,
    endDate,
    page,
    refreshKey,
    laboratoryOnly,
    onLoadingChange,
  ]);
  const selected =
    records.find((record) => recordKey(record) === selectedId) ?? null;
  const first = pagination.total
    ? (pagination.page - 1) * pagination.limit + 1
    : 0;
  const changeFilter = (setter: (value: string) => void) => (value: string) => {
    setLoading(true);
    setter(value);
    setPage(1);
  };
  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-7">
      <section className="flex min-w-0 flex-col rounded-md border border-gray-200 bg-white p-5 lg:col-span-5 lg:min-h-[calc(100vh-160px)]">
        <h2 className="font-bold">
          {laboratoryOnly ? "Laboratory Results" : "Medical History"}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {laboratoryOnly
            ? "View laboratory results released by the clinic."
            : "View your past visits, services, and records."}
        </p>
        <div className="mb-5 mt-5 flex flex-wrap items-center gap-2">
          <label className="flex min-w-0 flex-1 basis-44 items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 text-gray-400 focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-400/20">
            <Search size={16} className="shrink-0" aria-hidden="true" />
            <input
              aria-label="Search medical history"
              placeholder="Search by service..."
              value={search}
              onChange={(event) => changeFilter(setSearch)(event.target.value)}
              className="h-9 w-full min-w-0 bg-transparent text-sm text-gray-700 outline-none"
            />
          </label>
          {!laboratoryOnly && (
            <>
              <select
                aria-label="Filter by service"
                value={service}
                onChange={(event) =>
                  changeFilter(setService)(event.target.value)
                }
                className={fieldClass + " w-32"}
              >
                <option value="">All Services</option>
                <option value="Consultation">Consultation</option>
                <option value="Laboratory">Laboratory</option>
              </select>
              <select
                aria-label="Filter by status"
                value={status}
                onChange={(event) =>
                  changeFilter(setStatus)(event.target.value)
                }
                className={fieldClass + " w-32"}
              >
                <option value="">All Status</option>
                {[
                  "Created",
                  "Requested",
                  "In Queue",
                  "In Consultation",
                  "In Progress",
                  "Completed",
                  "Released",
                  "Cancelled",
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </>
          )}
          <input
            aria-label="Start date"
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(event) => changeFilter(setStartDate)(event.target.value)}
            className={fieldClass + " w-36"}
          />
          <input
            aria-label="End date"
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) => changeFilter(setEndDate)(event.target.value)}
            className={fieldClass + " w-36"}
          />
        </div>
        {error && <ErrorMessage className="mb-4">{error}</ErrorMessage>}
        {loading && !records.length ? (
          <LoadingScreen message="Loading medical history..." />
        ) : !records.length ? (
          <EmptyState
            message={
              error
                ? "Medical history is unavailable."
                : laboratoryOnly
                  ? "No released laboratory results found."
                  : "No medical records found."
            }
          />
        ) : (
          <ul
            aria-label="Medical history records"
            aria-busy={loading}
            className={loading ? "opacity-60" : ""}
          >
            {records.map((record, index) => {
              const Icon =
                record.record_type === "laboratory"
                  ? FlaskConical
                  : Stethoscope;
              const date = new Date(record.occurred_at);
              return (
                <li key={recordKey(record)} className="relative">
                  <span
                    aria-hidden="true"
                    className={[
                      "absolute left-1.5 w-px bg-sky-200",
                      index === 0 ? "top-1/2" : "top-0",
                      index === records.length - 1 ? "bottom-1/2" : "bottom-0",
                    ].join(" ")}
                  />
                  <span
                    aria-hidden="true"
                    className="absolute left-0.5 top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-sky-400"
                  />
                  <button
                    type="button"
                    aria-pressed={recordKey(record) === selectedId}
                    onClick={() => setSelectedId(recordKey(record))}
                    className={[
                      "ml-6 grid w-[calc(100%-1.5rem)] cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-gray-100 px-2 py-4 text-left focus-visible:outline-2 focus-visible:outline-sky-500 sm:grid-cols-[112px_minmax(0,1fr)_auto]",
                      recordKey(record) === selectedId
                        ? "bg-sky-50/60"
                        : "hover:bg-gray-50",
                    ].join(" ")}
                  >
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-xs font-semibold text-gray-700">
                        {date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {date.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={[
                          "flex size-10 shrink-0 items-center justify-center rounded-md",
                          record.record_type === "laboratory"
                            ? "bg-gray-100 text-gray-500"
                            : "bg-sky-50 text-sky-500",
                        ].join(" ")}
                      >
                        <Icon size={20} strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-gray-900">
                          {record.service_name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {record.service_category}
                          {record.room && " · " + record.room}
                        </p>
                      </div>
                    </div>
                    <PortalStatus status={record.status} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-8 text-xs text-gray-500">
          <p>
            Showing {first}–
            {Math.min(
              (pagination.page - 1) * pagination.limit + records.length,
              pagination.total,
            )}{" "}
            of {pagination.total} records
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous page"
              disabled={loading || page <= 1}
              onClick={() => {
                setLoading(true);
                setPage((current) => current - 1);
              }}
              className="cursor-pointer rounded-md border border-gray-200 p-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="rounded-md bg-sky-500 px-3 py-2 font-semibold text-white">
              {pagination.page}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={loading || page >= Math.max(1, pagination.total_pages)}
              onClick={() => {
                setLoading(true);
                setPage((current) => current + 1);
              }}
              className="cursor-pointer rounded-md border border-gray-200 p-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
      <PatientVisitPanel
        record={selected}
        refreshKey={refreshKey}
        onPrescriptions={onPrescriptions}
      />
    </div>
  );
}

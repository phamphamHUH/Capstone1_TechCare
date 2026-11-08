import React, { useEffect, useState } from "react";
import { ChevronDown, Search, Calendar } from "lucide-react";
// import HistoryPanel from "./HistoryPanel";
// import VisitDetails from "./VisitDetails";
import type {
  HistoryRecord,
  Pagination,
  Result,
} from "../../../../interface/HistoryRecord";
import { useDebounce } from "../../../../utils/debounce";
import axios from "axios";
import api from "#lib/axios";
import HistoryTimeline from "./HistoryTimeline";
import VisitDetails from "./VisitDetails";

type MedicalHistoryTabProps = {
  patientId: string | null;
};

function MedicalHistoryTab({ patientId }: MedicalHistoryTabProps) {
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Result | null>(null);

  const debouncedSearch = useDebounce(search);

  const withReset =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setPage(1);
    };

  const params = new URLSearchParams({ page: String(page), limit: "10" });
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (serviceFilter !== "all") params.set("service_category", serviceFilter);
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);

  const key = `${patientId}?${params.toString()}`;

  useEffect(() => {
    const controller = new AbortController();

    api
      .get(`/api/fdstaff/patients/medical-history/${key}`, {
        signal: controller.signal,
      })
      .then((res) => {
        setResult({
          key,
          records: res.data.records,
          pagination: res.data.pagination,
          error: null,
        });
      })
      .catch((err) => {
        if (axios.isCancel(err)) return;
        setResult((prev) => ({
          key,
          records: prev?.records ?? [],
          pagination: prev?.pagination ?? null,
          error: err.response?.data?.message ?? err.message,
        }));
      });

    return () => controller.abort();
  }, [key]);

  const loading = result?.key !== key;
  const records = result?.records ?? [];
  const pagination = result?.pagination ?? null;
  const error = result && !loading ? result.error : null;

  return (
    <div className="grid grid-cols-7 gap-5 mb-5">
      {/* MAIN PANEL */}
      <main className="col-span-5 border shadow-lg rounded-xl px-5 py-6 border-gray-200 h-fit">
        <h1 className="font-bold">Medical History</h1>
        <span className="text-gray-500 text-sm">
          View the patient's past visits, services, and records
        </span>
        {/* FILTERS */}
        <section className="mb-4 flex w-full flex-nowrap items-center gap-2 mt-5">
          <div className="relative min-w-40 flex-1">
            <Search
              size={17}
              strokeWidth={1.5}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20"
            />
          </div>
          <label className="relative shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 min-w-25 appearance-none rounded-lg border border-gray-200 bg-gray-50 px-3 pr-8 text-sm text-gray-600 outline-none transition hover:border-gray-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20"
            >
              <option value="all">All Status</option>
              <option value="requested">Requested</option>
              <option value="collected">Collected</option>
              <option value="waiting">Waiting</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="released">Released</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </label>
          <label className="relative shrink-0">
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="h-9 min-w-27.5 appearance-none rounded-lg border border-gray-200 bg-gray-50 px-3 pr-8 text-sm text-gray-600 outline-none transition hover:border-gray-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20"
            >
              <option value="all">Service: All</option>
              <option value="consultation">Consultation</option>
              <option value="laboratory">Laboratory</option>
            </select>
            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </label>

          <label className="relative shrink-0">
            <input
              type="date"
              name="start-date"
              id="start-date"
              className="h-9 w-37.5 appearance-none rounded-lg border border-gray-200 bg-gray-50 px-3 pr-9 text-sm text-gray-600 outline-none transition hover:border-gray-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20
          [&::-webkit-calendar-picker-indicator]:absolute
          [&::-webkit-calendar-picker-indicator]:inset-0
          [&::-webkit-calendar-picker-indicator]:h-full
          [&::-webkit-calendar-picker-indicator]:w-full
          [&::-webkit-calendar-picker-indicator]:cursor-pointer
          [&::-webkit-calendar-picker-indicator]:opacity-0"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Calendar
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </label>

          <label className="relative shrink-0">
            <input
              type="date"
              name="end-date"
              id="end-date"
              className="h-9 w-37.5 appearance-none rounded-lg border border-gray-200 bg-gray-50 px-3 pr-9 text-sm text-gray-600 outline-none transition hover:border-gray-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20
          [&::-webkit-calendar-picker-indicator]:absolute
          [&::-webkit-calendar-picker-indicator]:inset-0
          [&::-webkit-calendar-picker-indicator]:h-full
          [&::-webkit-calendar-picker-indicator]:w-full
          [&::-webkit-calendar-picker-indicator]:cursor-pointer
          [&::-webkit-calendar-picker-indicator]:opacity-0"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <Calendar
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </label>
        </section>
        {error ? (
          <p className="py-10 text-center text-sm text-red-500">{error}</p>
        ) : (
          <HistoryTimeline
            records={records}
            pagination={pagination}
            loading={loading}
            onPageChange={setPage}
            setSelectedRecord={setSelectedRecord}
          />
        )}
      </main>

      <aside className="col-span-2 border shadow-lg rounded-xl px-5 py-6 border-gray-200  h-fit">
        <VisitDetails selectedRecord={selectedRecord} />
      </aside>
    </div>
  );
}

export default MedicalHistoryTab;

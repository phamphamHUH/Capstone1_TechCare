import { useEffect, useState } from "react";
import axios from "axios";
import HistoryFilters from "./HistoryPanel/HistoryFilters";
import HistoryTimeline from "./HistoryPanel/HistoryTimeline";
import type {
  HistoryRecord,
  Pagination,
} from "../../../../../interface/HistoryRecord";
import api from "#lib/axios";

type HistoryPanelProps = {
  patientId: string | null;
  setSelectedRecord: (selectedRecord: HistoryRecord) => void;
};

type Result = {
  key: string; // identifies the request this result belongs to
  records: HistoryRecord[];
  pagination: Pagination | null;
  error: string | null;
};

function useDebounce<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function HistoryPanel({ patientId, setSelectedRecord }: HistoryPanelProps) {
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

  // Includes patientId, so switching patients also triggers a refetch
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
    <div>
      <div>
        <h1 className="font-bold">Medical History</h1>
        <span className="text-gray-500 text-sm">
          View the patient's past visits, services, and records
        </span>

        <HistoryFilters
          search={search}
          setSearch={withReset(setSearch)}
          statusFilter={statusFilter}
          setStatusFilter={withReset(setStatusFilter)}
          serviceFilter={serviceFilter}
          setServiceFilter={withReset(setServiceFilter)}
          startDate={startDate}
          setStartDate={withReset(setStartDate)}
          endDate={endDate}
          setEndDate={withReset(setEndDate)}
        />
      </div>

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
    </div>
  );
}

export default HistoryPanel;

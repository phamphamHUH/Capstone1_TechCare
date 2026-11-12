import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { Search, UserRound, X } from "lucide-react";
import api from "#lib/axios";
import ErrorMessage from "../../../../components/ErrorMessage";
import { LoadingSpinner } from "../../../../components/LoadingScreen";
import type { MedicalDocumentPatient } from "../../../../utils/medicalDocuments";

type Props = {
  patient: MedicalDocumentPatient | null;
  onChange: (patient: MedicalDocumentPatient | null) => void;
  disabled?: boolean;
  error?: string;
};

export default function PatientPicker({ patient, onChange, disabled, error }: Props) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<MedicalDocumentPatient[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (patient) return;
    const controller = new AbortController();
    // Wait for the doctor to stop typing before searching.
    const timer = window.setTimeout(() => {
      setLoading(true);
      setLoadError("");
      api
        .get<{ patients: MedicalDocumentPatient[] }>("/api/doctor/medical-document-patients", {
          params: { search: search.trim() },
          signal: controller.signal,
        })
        .then(({ data }) => setResults(Array.isArray(data.patients) ? data.patients : []))
        .catch((cause: unknown) => {
          if (controller.signal.aborted) return;
          setLoadError(
            isAxiosError<{ message?: string }>(cause)
              ? cause.response?.data?.message || "Patients could not be loaded."
              : "Patients could not be loaded.",
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, patient]);

  if (patient) {
    return (
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-sky-200 bg-sky-50 p-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-md bg-white p-2 text-sky-600"><UserRound size={20} /></div>
          <div className="min-w-0 text-sm">
            <p className="break-words font-semibold text-gray-900">{patient.full_name}</p>
            <p className="text-gray-600">
              {patient.patient_id} · {patient.age ?? "—"} yrs · {patient.sex || "—"}
            </p>
            {patient.address && <p className="break-words text-gray-500">{patient.address}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X size={14} />Change patient
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="relative block">
        <span className="sr-only">Search patients by name or ID</span>
        <Search size={17} aria-hidden="true" className="absolute top-3 left-3 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          disabled={disabled}
          placeholder="Search patient by name or ID..."
          aria-invalid={Boolean(error)}
          className="w-full rounded-md border border-gray-300 bg-white py-2.5 pr-3 pl-10 text-sm outline-sky-500 aria-invalid:border-rose-400"
        />
        {loading && <LoadingSpinner size={14} className="absolute top-3.5 right-3" />}
      </label>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {loadError && <ErrorMessage>{loadError}</ErrorMessage>}
      <ul className="max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-md border border-gray-200 bg-white" aria-label="Patients">
        {results.map((item) => (
          <li key={item.patient_id}>
            <button
              type="button"
              onClick={() => onChange(item)}
              disabled={disabled}
              className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-sky-50 focus-visible:bg-sky-50 focus-visible:outline-none"
            >
              <span className="min-w-0 break-words font-medium text-gray-800">{item.full_name}</span>
              <span className="text-xs text-gray-500">
                {item.patient_id} · {item.age ?? "—"} yrs · {item.sex || "—"}
              </span>
            </button>
          </li>
        ))}
        {!loading && !loadError && results.length === 0 && (
          <li className="px-3 py-4 text-center text-sm text-gray-500">
            {search.trim() ? "No matching patients." : "No patients found."}
          </li>
        )}
      </ul>
    </div>
  );
}

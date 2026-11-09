import EmptyState from "../../../../components/EmptyState";
import ErrorMessage from "../../../../components/ErrorMessage";
import LoadingScreen from "../../../../components/LoadingScreen";
import { useEffect, useMemo, useState } from "react";
import { Phone, Search, UserPlus, X, Check } from "lucide-react";
import api from "#lib/axios";
import type { Patient } from "../../../../interface/Patient";

type PatientSearchModalProps = {
  onClose: () => void;
  onSelect: (patient: Patient) => void;
  onRegister?: () => void;
};

type PatientFilter = "all" | "senior" | "pwd";

const fullName = (p: Patient) =>
  [p.first_name, p.middle_name, p.last_name, p.suffix]
    .filter(Boolean)
    .join(" ");

const initials = (p: Patient) =>
  `${p.first_name?.charAt(0) ?? ""}${p.last_name?.charAt(0) ?? ""}`.toUpperCase();

const getAge = (birthdate?: string | null) => {
  if (!birthdate) return null;
  const birth = new Date(birthdate);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
};

const FILTERS: { label: string; value: PatientFilter }[] = [
  { label: "All Patients", value: "all" },
  { label: "Senior Citizen", value: "senior" },
  { label: "PWD", value: "pwd" },
];

function PatientSearchModal({
  onClose,
  onSelect,
  onRegister,
}: PatientSearchModalProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PatientFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchPatients = async () => {
      try {
        const res = await api.get("/api/fdstaff/patients", {
          signal: controller.signal,
        });
        setPatients(res.data.patients ?? []);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Error fetching patients:", err);
        setError("Failed to load patients.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchPatients();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const MAX_RESULTS = 10; // put this above the component

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return patients
      .filter((p) => {
        const age = getAge(p.birthdate);

        const matchesFilter =
          filter === "all" ||
          (filter === "senior" && age !== null && age >= 60) ||
          (filter === "pwd" && p.is_pwd === true);

        const matchesSearch =
          !q ||
          fullName(p).toLowerCase().includes(q) ||
          p.patient_id?.toLowerCase().includes(q) ||
          p.contact_number?.toLowerCase().includes(q);

        return matchesFilter && matchesSearch;
      })
      .sort(
        (a, b) =>
          new Date(b.updated_at ?? 0).getTime() -
          new Date(a.updated_at ?? 0).getTime(),
      )
      .slice(0, MAX_RESULTS);
  }, [patients, search, filter]);

  const selectedPatient = patients.find((p) => p.patient_id === selectedId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex h-5/6 w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Select patient"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold">Select Patient</h2>
            <p className="mt-1 text-xs text-gray-500">
              Choose an existing patient record or register a new one
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-full bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, patient ID (e.g. P-26), or contact number..."
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-xs outline-none focus:border-sky-400"
            />
          </div>

          {/* Count + filters */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">
              Showing {filtered.length}{" "}
              {filtered.length === 1 ? "patient" : "patients"}
            </span>
            <div className="flex items-center gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold ${
                    filter === f.value
                      ? "bg-sky-100 text-sky-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto bg-gray-50 px-6 py-3">
          {error && (
            <ErrorMessage>{error}</ErrorMessage>
          )}
          {loading ? (
            <LoadingScreen message="Loading patients..." />
          ) : ((filtered.length === 0 ? (
            <EmptyState message="No patients found." />
          ) : (
            <ul className="flex flex-col gap-3">
              {filtered.map((p) => {
                const selected = selectedId === p.patient_id;
                const age = getAge(p.birthdate);

                return (
                  <li key={p.patient_id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(p.patient_id)}
                      onDoubleClick={() => onSelect(p)}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left transition ${
                        selected
                          ? "border-sky-500 bg-sky-50"
                          : "border-gray-200 hover:border-sky-300"
                      }`}
                    >
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          selected
                            ? "bg-sky-500 text-white"
                            : "bg-sky-50 text-sky-600"
                        }`}
                      >
                        {initials(p)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">
                            {fullName(p)}
                          </span>
                          {age !== null && age >= 60 && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                              Senior Citizen
                            </span>
                          )}
                          {p.is_pwd && (
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
                              PWD
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-gray-500">
                          {p.patient_id}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-gray-500">
                          <span>
                            {p.sex}
                            {age !== null ? `, ${age} yrs old` : ""}
                          </span>
                          {p.contact_number && (
                            <>
                              <span>•</span>
                              <Phone size={12} />
                              <span>{p.contact_number}</span>
                            </>
                          )}
                        </p>
                      </div>

                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          selected
                            ? "border-sky-500 bg-sky-500 text-white"
                            : "border-gray-300"
                        }`}
                      >
                        {selected && <Check size={12} strokeWidth={3} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onRegister}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-sky-300 px-5 py-2.5 text-xs font-semibold text-sky-600 hover:bg-sky-50"
          >
            <UserPlus size={15} />
            Register New Patient
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedPatient}
              onClick={() => selectedPatient && onSelect(selectedPatient)}
              className="cursor-pointer rounded-lg bg-sky-500 px-5 py-2.5 text-xs font-semibold text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Confirm Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientSearchModal;

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import api from "#lib/axios";
import type { Patient } from "../../../../../interface/Patient";

type PatientSearchModalProps = {
  onClose: () => void;
  onSelect: (patient: Patient) => void;
};

const fullName = (p: Patient) =>
  [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" ");

function PatientSearchModal({ onClose, onSelect }: PatientSearchModalProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // fetch once when the modal mounts
  useEffect(() => {
    const controller = new AbortController();

    const fetchPatients = async () => {
      try {
        const res = await api.get("/api/fdstaff/patients", {
          signal: controller.signal,
        });
        setPatients(res.data.patients ?? []);
      } catch (err) {
        if (controller.signal.aborted) return; // request was cancelled
        console.error("Error fetching patients:", err);
        setError("Failed to load patients.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchPatients();
    return () => controller.abort();
  }, []);

  // close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        fullName(p).toLowerCase().includes(q) ||
        p.patient_id?.toLowerCase().includes(q),
    );
  }, [patients, search]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()} // clicks inside don't close it
        role="dialog"
        aria-modal="true"
        aria-label="Select patient"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Select Patient</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer text-gray-500 hover:text-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative mb-3">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or patient ID..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm
                       outline-none focus:border-sky-500"
          />
        </div>

        <div className="max-h-72 overflow-y-auto">
          {loading ? (
            <p className="py-6 text-center text-sm text-gray-400">Loading...</p>
          ) : error ? (
            <p className="py-6 text-center text-sm text-red-500">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              No patients found.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {filtered.map((p) => (
                <li key={p.patient_id}>
                  <button
                    type="button"
                    onClick={() => onSelect(p)}
                    className="flex w-full cursor-pointer items-center justify-between rounded-lg
                               px-3 py-2 text-left hover:bg-sky-50"
                  >
                    <span className="text-sm font-semibold">{fullName(p)}</span>
                    <span className="text-xs text-gray-500">
                      {p.patient_id}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default PatientSearchModal;

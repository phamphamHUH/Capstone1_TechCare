import { useEffect, useMemo, useState } from "react";
import { FileText, Pill, Search } from "lucide-react";
import PatientSummaryCard from "../components/PatientSummaryCard";
import { fetchPatientPrescriptions } from "../patientApi";
import type {
  PatientSessionUser,
  PrescriptionItem,
  PrescriptionRecord,
} from "../types";

type Props = {
  patient: PatientSessionUser;
  patientId: string;
};

function parseItems(value: PrescriptionRecord["prescription_items"]): PrescriptionItem[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as PrescriptionItem[]) : [];
  } catch {
    return [];
  }
}

function itemName(item: PrescriptionItem) {
  return item.medication_name ?? item.medicine_name ?? item.medication ?? item.name ?? "Medication";
}

function patientName(patient: PatientSessionUser) {
  return [patient.first_name, patient.middle_name, patient.last_name, patient.suffix]
    .filter(Boolean)
    .join(" ") || patient.username || "Patient";
}

function PrescriptionsView({ patient, patientId }: Props) {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPrescriptions() {
      try {
        setLoading(true);
        setError("");

        const result = await fetchPatientPrescriptions(patientId);
        const rows = result.prescriptions ?? [];

        setPrescriptions(rows);
        setSelectedId((current) => {
          if (current && rows.some((item) => item.prescription_id === current)) return current;
          return rows[0]?.prescription_id ?? null;
        });
      } catch (requestError) {
        console.error("Unable to load prescriptions:", requestError);
        setPrescriptions([]);
        setSelectedId(null);
        setError("Unable to load prescriptions.");
      } finally {
        setLoading(false);
      }
    }

    void loadPrescriptions();
  }, [patientId]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return prescriptions.filter((prescription) => {
      const matchesSearch =
        !query ||
        prescription.prescription_id.toLowerCase().includes(query) ||
        parseItems(prescription.prescription_items).some((item) =>
          itemName(item).toLowerCase().includes(query),
        );

      const matchesStatus = !status || prescription.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [prescriptions, search, status]);

  const selected = useMemo(
    () => filtered.find((item) => item.prescription_id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  );

  const items = selected ? parseItems(selected.prescription_items) : [];

  return (
    <div className="space-y-4">
      <PatientSummaryCard patient={patient} />

      <div className="grid min-h-[540px] grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <h2 className="text-sm font-bold text-slate-900">Prescription History</h2>
            <p className="mt-0.5 text-[10px] text-slate-400">View your current prescriptions.</p>

            <label className="mt-4 flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-500">
              <Search size={14} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search prescription..."
                className="w-full bg-transparent outline-none"
              />
            </label>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Expired">Expired</option>
            </select>
          </div>

          <div className="max-h-[430px] overflow-y-auto p-2">
            {loading ? (
              <div className="flex h-64 items-center justify-center text-xs text-slate-400">
                Loading prescriptions...
              </div>
            ) : error ? (
              <div className="flex h-64 items-center justify-center text-xs text-rose-500">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-xs text-slate-400">
                No prescriptions found.
              </div>
            ) : (
              filtered.map((prescription) => {
                const active = selected?.prescription_id === prescription.prescription_id;
                const count = parseItems(prescription.prescription_items).length;

                return (
                  <button
                    type="button"
                    key={prescription.prescription_id}
                    onClick={() => setSelectedId(prescription.prescription_id)}
                    className={`mb-1 w-full rounded-lg p-3 text-left transition ${
                      active ? "bg-sky-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                          <FileText size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-800">
                            {prescription.prescription_id}
                          </p>
                          <p className="mt-1 text-[9px] text-slate-400">
                            {new Date(prescription.prescribed_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "2-digit",
                              year: "numeric",
                            })}
                          </p>
                          <p className="mt-1 text-[9px] text-slate-500">
                            {count} medication{count === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-600">
                        {prescription.status}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {!selected ? (
            <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-slate-400">
              Select a prescription to preview it.
            </div>
          ) : (
            <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-6">
              <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-300 pb-4">
                <div className="flex items-center gap-3">
                  <img src="/assets/reyna-g-logo.png" alt="Reyna G" className="h-10 w-10 object-contain" />
                  <div>
                    <h2 className="text-xs font-extrabold text-slate-900">
                      REYNA G DIAGNOSTIC MEDICAL CLINIC
                    </h2>
                    <p className="mt-1 text-[9px] text-slate-500">Manila, Philippines</p>
                  </div>
                </div>

                <div className="text-right text-[9px] leading-5 text-slate-500">
                  <p>
                    Date: <strong className="text-slate-700">{new Date(selected.prescribed_at).toLocaleDateString()}</strong>
                  </p>
                  <p>
                    Prescription ID: <strong className="text-slate-700">{selected.prescription_id}</strong>
                  </p>
                  {selected.consultation_record_id && (
                    <p>
                      Consultation ID: <strong className="text-slate-700">{selected.consultation_record_id}</strong>
                    </p>
                  )}
                </div>
              </header>

              <div className="my-5 flex items-center gap-3">
                <Pill size={24} className="text-blue-700" />
                <h1 className="flex-1 text-center text-xs font-extrabold tracking-[0.35em] text-slate-900">
                  PRESCRIPTION
                </h1>
              </div>

              <div className="grid gap-3 rounded-lg bg-slate-50 p-4 text-[10px] sm:grid-cols-2">
                <div>
                  <span className="text-slate-400">Patient Name:</span>{" "}
                  <strong className="text-slate-700">{patientName(patient)}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Patient ID:</span>{" "}
                  <strong className="text-slate-700">{patientId}</strong>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
                <div className="grid grid-cols-[42px_1.4fr_.8fr_.8fr_.8fr_1.2fr] bg-slate-100 px-3 py-2 text-[9px] font-bold text-slate-600">
                  <span>#</span>
                  <span>Medication</span>
                  <span>Dosage</span>
                  <span>Frequency</span>
                  <span>Duration</span>
                  <span>Instructions</span>
                </div>

                {items.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-slate-400">
                    No medication items were returned for this prescription.
                  </div>
                ) : (
                  items.map((item, index) => (
                    <div
                      key={String(item.id ?? `${selected.prescription_id}-${index}`)}
                      className="grid grid-cols-[42px_1.4fr_.8fr_.8fr_.8fr_1.2fr] border-t border-slate-100 px-3 py-3 text-[9px] text-slate-600"
                    >
                      <span>{index + 1}</span>
                      <span className="font-semibold text-slate-800">{itemName(item)}</span>
                      <span>{item.dosage ?? item.dose ?? "—"}</span>
                      <span>{item.frequency ?? "—"}</span>
                      <span>{item.duration ?? "—"}</span>
                      <span className="italic">{item.instructions ?? "—"}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-5 rounded-lg bg-slate-50 p-4">
                <p className="text-[9px] font-bold text-slate-700">Additional Notes:</p>
                <p className="mt-2 text-[10px] italic leading-5 text-slate-500">
                  {selected.notes || "No additional notes."}
                </p>
              </div>

              {selected.valid_until && (
                <p className="mt-4 text-right text-[9px] text-slate-400">
                  Valid until {new Date(selected.valid_until).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default PrescriptionsView;

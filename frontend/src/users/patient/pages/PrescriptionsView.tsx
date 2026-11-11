import EmptyState from "../../../components/EmptyState";
import ErrorMessage from "../../../components/ErrorMessage";
import LoadingScreen from "../../../components/LoadingScreen";
import { useEffect, useMemo, useState } from "react";
import { FileText, MousePointerClick, Pill, Search } from "lucide-react";
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
  refreshKey?: number;
  onLoadingChange?: (loading: boolean) => void;
  consultationId?: string;
};

function parseItems(
  value: PrescriptionRecord["prescription_items"],
): PrescriptionItem[] {
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
  return (
    item.medication_name ??
    item.medicine_name ??
    item.medication ??
    item.name ??
    "Medication"
  );
}

function patientName(patient: PatientSessionUser) {
  return (
    [patient.first_name, patient.middle_name, patient.last_name, patient.suffix]
      .filter(Boolean)
      .join(" ") ||
    patient.username ||
    "Patient"
  );
}

function PrescriptionsView({
  patient,
  patientId,
  refreshKey = 0,
  onLoadingChange,
  consultationId,
}: Props) {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadPrescriptions() {
      try {
        setLoading(true);
        onLoadingChange?.(true);
        setError("");

        const result = await fetchPatientPrescriptions(
          patientId,
          consultationId,
        );
        if (cancelled) return;
        const rows = result.prescriptions ?? [];

        setPrescriptions(rows);
        setSelectedId((current) => {
          if (current && rows.some((item) => item.prescription_id === current))
            return current;
          return rows[0]?.prescription_id ?? null;
        });
      } catch (requestError) {
        if (cancelled) return;
        console.error("Unable to load prescriptions:", requestError);
        setError("Unable to load prescriptions.");
      } finally {
        if (!cancelled) {
          setLoading(false);
          onLoadingChange?.(false);
        }
      }
    }

    void loadPrescriptions();
    return () => {
      cancelled = true;
    };
  }, [patientId, refreshKey, onLoadingChange, consultationId]);

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
    () =>
      filtered.find((item) => item.prescription_id === selectedId) ??
      filtered[0] ??
      null,
    [filtered, selectedId],
  );

  const items = selected ? parseItems(selected.prescription_items) : [];

  return (
    <div className="space-y-6">
      <PatientSummaryCard patient={patient} />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-7">
        <section className="min-w-0 rounded-md border border-gray-200 bg-white px-5 py-6 shadow-lg lg:col-span-2">
          <div className="mb-5">
            <h2 className="font-bold text-gray-900">Prescription History</h2>
            <p className="mt-1 text-sm text-gray-500">
              View your current prescriptions.
            </p>

            <label className="mt-5 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-400/20">
              <Search
                size={17}
                strokeWidth={1.5}
                aria-hidden="true"
                className="shrink-0"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search prescription..."
                aria-label="Search prescriptions"
                className="h-9 w-full min-w-0 bg-transparent outline-none"
              />
            </label>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter prescriptions by status"
              className="mt-2 h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-600 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Expired">Expired</option>
            </select>
          </div>

          <div className="max-h-[540px] space-y-2 overflow-y-auto">
            {error && <ErrorMessage>{error}</ErrorMessage>}
            {loading && prescriptions.length === 0 ? (
              <LoadingScreen message="Loading prescriptions..." />
            ) : filtered.length === 0 ? (
              <EmptyState
                message={
                  error
                    ? "Prescriptions are unavailable."
                    : "No prescriptions found."
                }
              />
            ) : (
              filtered.map((prescription) => {
                const active =
                  selected?.prescription_id === prescription.prescription_id;
                const count = parseItems(
                  prescription.prescription_items,
                ).length;

                return (
                  <button
                    type="button"
                    key={prescription.prescription_id}
                    onClick={() => setSelectedId(prescription.prescription_id)}
                    aria-pressed={active}
                    className={`w-full cursor-pointer rounded-md border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-sky-500 ${
                      active
                        ? "border-sky-200 bg-sky-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-600">
                          <FileText size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-gray-800">
                            {prescription.prescription_id}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {new Date(
                              prescription.prescribed_at,
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "2-digit",
                              year: "numeric",
                            })}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {count} medication{count === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-600">
                        {prescription.status}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="min-w-0 rounded-md border border-gray-200 bg-white px-5 py-6 shadow-lg lg:col-span-5">
          <h2 className="font-bold text-gray-900">Prescription Preview</h2>
          {!selected ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-gray-400">
              <MousePointerClick
                size={28}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <EmptyState message="Select a prescription to preview it." />
            </div>
          ) : (
            <div className="mt-5 rounded-md border border-gray-200 bg-white p-4 sm:p-6">
              <header className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-300 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src="/assets/images/reyna-g-logo.png"
                    alt="Reyna G"
                    className="h-14 w-14 shrink-0 object-contain"
                  />
                  <div>
                    <h3 className="text-sm font-extrabold text-gray-900">
                      REYNA G DIAGNOSTIC MEDICAL CLINIC
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Manila, Philippines
                    </p>
                  </div>
                </div>

                <div className="min-w-0 break-words text-xs leading-6 text-gray-500 sm:text-right">
                  <p>
                    Date:{" "}
                    <strong className="text-gray-700">
                      {new Date(selected.prescribed_at).toLocaleDateString()}
                    </strong>
                  </p>
                  <p>
                    Prescription ID:{" "}
                    <strong className="text-gray-700">
                      {selected.prescription_id}
                    </strong>
                  </p>
                  {selected.consultation_record_id && (
                    <p>
                      Consultation ID:{" "}
                      <strong className="text-gray-700">
                        {selected.consultation_record_id}
                      </strong>
                    </p>
                  )}
                </div>
              </header>

              <div className="my-5 flex items-center gap-3">
                <Pill size={24} className="shrink-0 text-sky-600" />
                <h3 className="flex-1 text-center text-base font-extrabold tracking-widest text-gray-900">
                  PRESCRIPTION
                </h3>
              </div>

              <div className="grid gap-3 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm sm:grid-cols-2">
                <div className="min-w-0 break-words">
                  <span className="text-gray-500">Patient Name:</span>{" "}
                  <strong className="text-gray-700">
                    {patientName(patient)}
                  </strong>
                </div>
                <div className="min-w-0 break-words">
                  <span className="text-gray-500">Patient ID:</span>{" "}
                  <strong className="text-gray-700">{patientId}</strong>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto rounded-md border border-gray-200">
                {items.length === 0 ? (
                  <EmptyState message="No medication items were returned for this prescription." />
                ) : (
                  <table className="w-full min-w-[640px] text-left text-sm text-gray-600">
                    <caption className="sr-only">
                      Prescribed medications
                    </caption>
                    <thead className="bg-gray-50 text-xs text-gray-600">
                      <tr>
                        {[
                          "#",
                          "Medication",
                          "Dosage",
                          "Frequency",
                          "Duration",
                          "Instructions",
                        ].map((label) => (
                          <th
                            key={label}
                            scope="col"
                            className="px-3 py-3 font-semibold"
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((item, index) => (
                        <tr
                          key={String(
                            item.id ?? `${selected.prescription_id}-${index}`,
                          )}
                          className="align-top"
                        >
                          <td className="px-3 py-3">{index + 1}</td>
                          <td className="px-3 py-3 font-semibold text-gray-800">
                            {itemName(item)}
                          </td>
                          <td className="px-3 py-3">
                            {item.dosage ?? item.dose ?? "—"}
                          </td>
                          <td className="px-3 py-3">{item.frequency ?? "—"}</td>
                          <td className="px-3 py-3">
                            {item.duration ??
                              (item.duration_days != null
                                ? `${item.duration_days} days`
                                : "—")}
                          </td>
                          <td className="px-3 py-3">
                            {item.instructions ?? item.instruction ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="mt-5 rounded-md border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-bold text-gray-700">
                  Additional Notes
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-600">
                  {selected.notes || "No additional notes."}
                </p>
              </div>

              {selected.valid_until && (
                <p className="mt-4 text-right text-xs text-gray-500">
                  Valid until{" "}
                  {new Date(selected.valid_until).toLocaleDateString()}
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

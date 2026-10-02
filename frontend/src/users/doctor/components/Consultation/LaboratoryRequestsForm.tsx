import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, Check, Loader2, RefreshCw, Search, X } from "lucide-react";
import calculateAge from "../../../../utils/calculateAge";
import {
  fetchLaboratoryServices,
  submitLaboratoryRequest,
  toApiFailure,
} from "./consultationsApi.ts";
import type {
  ConsultationPatient,
  FieldErrors,
  LabPriority,
  LaboratoryService,
} from "./types.ts";
import { LIMITS, validateLabRequestForm } from "./validation.ts";

type Props = {
  patient: ConsultationPatient;
  /** Links the request to a saved consultation when one exists. */
  consultationRecordId?: string;
  onChangePatient: () => void;
};

type SortKey = "az" | "za" | "price";

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const peso = (v: string | number) =>
  `₱${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const selectBase =
  "w-full text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-sky-400";

export default function LaboratoryRequestForm({ patient, consultationRecordId, onChangePatient }: Props) {
  const [services, setServices] = useState<LaboratoryService[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<SortKey>("az");

  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<LabPriority>("No");
  const [requestDate, setRequestDate] = useState(todayKey());
  const [estimatedReleaseDate, setEstimatedReleaseDate] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState<{ requestId: string; count: number } | null>(null);

  const [reloadToken, setReloadToken] = useState(0);
  const retryLoad = () => {
    setLoading(true);
    setLoadError(null);
    setReloadToken((n) => n + 1);
  };

  useEffect(() => {
    let cancelled = false;
    fetchLaboratoryServices()
      .then((list) => {
        if (!cancelled) setServices(list);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(toApiFailure(e, "Couldn't load laboratory services.").message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(services.map((s) => s.service_type))).sort()],
    [services],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = services.filter(
      (s) =>
        (category === "All" || s.service_type === category) &&
        (!q || s.service_name.toLowerCase().includes(q) || s.service_type.toLowerCase().includes(q)),
    );
    return [...list].sort((a, b) =>
      sort === "price"
        ? Number(a.price) - Number(b.price)
        : sort === "za"
          ? b.service_name.localeCompare(a.service_name)
          : a.service_name.localeCompare(b.service_name),
    );
  }, [services, query, category, sort]);

  const selected = useMemo(
    () => serviceIds.map((id) => services.find((s) => s.service_id === id)).filter((s): s is LaboratoryService => !!s),
    [serviceIds, services],
  );
  const total = selected.reduce((sum, s) => sum + Number(s.price), 0);

  const clientErrors = validateLabRequestForm(patient.patient_id, {
    serviceIds,
    priority,
    requestDate,
    estimatedReleaseDate,
  });
  const errors = { ...serverErrors, ...clientErrors };

  const toggle = (id: string) => {
    setSuccess(null);
    setServerErrors({});
    setServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= LIMITS.maxLabServices ? prev : [...prev, id],
    );
  };

  async function handleSubmit() {
    setSubmitted(true);
    setSubmitError(null);
    setSuccess(null);
    if (Object.keys(clientErrors).length > 0) return;

    setSubmitting(true);
    try {
      const result = await submitLaboratoryRequest({
        patientId: patient.patient_id,
        consultationRecordId,
        serviceIds,
        priority,
        requestDate,
        estimatedReleaseDate,
      });
      setSuccess({ requestId: result.request[0].request_id, count: result.items.length });
      setServiceIds([]);
      setSubmitted(false);
      setPriority("No");
      setEstimatedReleaseDate("");
      setRequestDate(todayKey());
    } catch (e) {
      const failure = toApiFailure(e, "Couldn't submit the laboratory request. Please try again.");
      setSubmitError(failure.message);
      setServerErrors(failure.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  }

  const fullName = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ");
  const age = calculateAge(patient.birthdate);

  return (
    <div className="flex flex-col gap-4">
      {success && (
        <div role="status" className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <CheckCircle2 size={14} />
          <span>
            Request <span className="font-mono font-semibold">{success.requestId}</span> submitted with {success.count}{" "}
            test{success.count === 1 ? "" : "s"}.
          </span>
        </div>
      )}
      {submitError && (
        <div role="alert" className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* ---------------- Test selection + selected list ---------------- */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-xs grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] overflow-hidden">
        <div className="p-5 lg:border-r border-gray-200">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Select Laboratory Service</h3>

          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search.."
                aria-label="Search laboratory tests"
                className={`${selectBase} pl-8`}
              />
            </div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className={`${selectBase} sm:w-40`}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  Category: {c}
                </option>
              ))}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort" className={`${selectBase} sm:w-36`}>
              <option value="az">Sort: A-Z</option>
              <option value="za">Sort: Z-A</option>
              <option value="price">Sort: Price</option>
            </select>
          </div>

          <h4 className="text-xs font-bold text-gray-900 mb-2">{query.trim() ? "Search Results" : "Common Tests"}</h4>

          {loading ? (
            <div className="py-10 flex items-center justify-center text-xs text-gray-500" role="status">
              <Loader2 size={16} className="animate-spin text-sky-500 mr-2" /> Loading tests...
            </div>
          ) : loadError ? (
            <div className="py-8 text-center" role="alert">
              <p className="text-xs text-red-600 mb-3">{loadError}</p>
              <button
                type="button"
                onClick={retryLoad}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg cursor-pointer"
              >
                <RefreshCw size={12} /> Try again
              </button>
            </div>
          ) : visible.length === 0 ? (
            <p className="py-8 text-center text-xs text-gray-400">
              {services.length === 0 ? "No laboratory tests are available yet." : "No tests match your search."}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {visible.map((s) => {
                const checked = serviceIds.includes(s.service_id);
                return (
                  <button
                    key={s.service_id}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggle(s.service_id)}
                    className={`flex items-center gap-3 text-left border rounded-lg px-3 py-2 transition-colors cursor-pointer ${
                      checked ? "border-sky-400 bg-sky-50" : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <span className="w-8 h-8 rounded bg-sky-100 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[11px] font-semibold text-gray-800 truncate">{s.service_name}</span>
                      <span className="block text-[10px] text-gray-400 truncate">
                        {s.service_type} • {peso(s.price)}
                      </span>
                    </span>
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        checked ? "bg-sky-500 border-sky-500 text-white" : "border-gray-300 bg-white"
                      }`}
                    >
                      {checked && <Check size={11} strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-5 flex flex-col min-h-64 border-t lg:border-t-0 border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Selected Laboratory Request ({serviceIds.length})</h3>
            {serviceIds.length > 0 && (
              <button type="button" onClick={() => setServiceIds([])} className="text-[11px] text-sky-500 hover:underline cursor-pointer">
                Clear All
              </button>
            )}
          </div>

          {selected.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <div className="w-20 h-20 rounded-full bg-gray-200 mb-3" />
              <p className="text-xs font-bold text-gray-800">No Test Selected</p>
              <p className="text-[10px] text-gray-400 mt-1 max-w-48">Select One or more Laboratory Test to add to the Request</p>
              {submitted && errors.services && <p className="text-[11px] text-red-600 mt-3">{errors.services}</p>}
            </div>
          ) : (
            <>
              <ul className="mt-3 flex flex-col gap-2 flex-1">
                {selected.map((s) => (
                  <li key={s.service_id} className="flex items-center justify-between gap-2 border border-gray-200 rounded-lg px-3 py-2">
                    <span className="min-w-0">
                      <span className="block text-[11px] font-semibold text-gray-800 truncate">{s.service_name}</span>
                      <span className="block text-[10px] text-gray-400">{peso(s.price)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => toggle(s.service_id)}
                      aria-label={`Remove ${s.service_name}`}
                      className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between text-xs mt-3 pt-3 border-t border-gray-100">
                <span className="text-gray-500">Estimated total</span>
                <span className="font-bold text-gray-900">{peso(total)}</span>
              </div>
              {submitted && errors.services && <p className="text-[11px] text-red-600 mt-2">{errors.services}</p>}
            </>
          )}
        </div>
      </section>

      {/* ------------------- Request details + patient ------------------ */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-xs p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">Request Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="lab-priority" className="block text-[11px] text-gray-500 mb-1">Priority</label>
              <select id="lab-priority" value={priority} onChange={(e) => setPriority(e.target.value as LabPriority)} className={selectBase}>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            <div>
              <label htmlFor="lab-request-date" className="block text-[11px] text-gray-500 mb-1">Request Date</label>
              <div className="relative">
                <input
                  id="lab-request-date"
                  type="date"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  aria-invalid={!!errors.request_date}
                  className={`${selectBase} ${errors.request_date ? "border-red-300" : ""}`}
                />
                <CalendarDays size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              {errors.request_date && <p className="text-[10px] text-red-600 mt-0.5">{errors.request_date}</p>}
            </div>
            <div>
              <label htmlFor="lab-release-date" className="block text-[11px] text-gray-500 mb-1">Estimate Release Date</label>
              <div className="relative">
                <input
                  id="lab-release-date"
                  type="date"
                  value={estimatedReleaseDate}
                  min={requestDate || undefined}
                  onChange={(e) => setEstimatedReleaseDate(e.target.value)}
                  aria-invalid={!!errors.estimated_release_date}
                  className={`${selectBase} ${errors.estimated_release_date ? "border-red-300" : ""}`}
                />
                <CalendarDays size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              {errors.estimated_release_date && <p className="text-[10px] text-red-600 mt-0.5">{errors.estimated_release_date}</p>}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">Patient</h3>
          <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-600 text-xs font-semibold flex items-center justify-center shrink-0">
              {patient.first_name.charAt(0)}
              {patient.last_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate">{fullName}</p>
              <p className="text-[10px] text-gray-500 truncate">
                {patient.patient_id} • {patient.sex.toUpperCase()} • {Number.isNaN(age) ? "—" : age} YEARS OLD • {patient.contact_number}
              </p>
            </div>
            <button
              type="button"
              onClick={onChangePatient}
              className="px-4 py-1.5 bg-white border border-sky-400 text-sky-500 hover:bg-sky-50 text-[11px] font-semibold rounded-lg cursor-pointer"
            >
              Change
            </button>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="flex items-center gap-2 px-6 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-wait"
        >
          {submitting && <Loader2 size={13} className="animate-spin" />}
          {submitting ? "Submitting..." : "Submit Request"}
        </button>
      </div>
    </div>
  );
}

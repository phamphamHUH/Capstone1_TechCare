import { useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import type {
  DiagnosisRow,
  DiagnosisType,
  FieldErrors,
  FindingsFormState,
} from "./types.ts";
import { PHYSICAL_EXAM_FIELDS, newDiagnosisRow } from "./types.ts";
import { LIMITS, validateFindingsForm } from "./validation.ts";

type Props = {
  value: FindingsFormState;
  onChange: (next: FindingsFormState) => void;
  /** Called after validation passes. Must resolve true when saved. */
  onSubmit: () => Promise<boolean>;
  onBack: () => void;
  saving: boolean;
  /** Set once the findings are stored; the form becomes read-only. */
  savedConsultationId: string | null;
  submitError: string | null;
  serverErrors: FieldErrors;
};

const inputBase =
  "w-full text-xs text-gray-800 bg-white border rounded-lg px-3 py-2 outline-none transition-colors placeholder:text-gray-300 disabled:bg-gray-50 disabled:text-gray-500";
const okBorder = "border-gray-200 focus:border-sky-400";
const errBorder = "border-red-300 focus:border-red-400";

export default function ConsultationFindingsForm({
  value,
  onChange,
  onSubmit,
  onBack,
  saving,
  savedConsultationId,
  submitError,
  serverErrors,
}: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const topRef = useRef<HTMLDivElement>(null);
  const locked = savedConsultationId !== null;

  const clientErrors = useMemo(() => validateFindingsForm(value), [value]);
  const errors: FieldErrors = { ...serverErrors, ...clientErrors };

  const show = (key: string) =>
    (submitted || touched.has(key)) && !locked ? errors[key] : undefined;
  const touch = (key: string) =>
    setTouched((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));

  const setRow = (key: string, patch: Partial<DiagnosisRow>) =>
    onChange({
      ...value,
      diagnosis: value.diagnosis.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    });

  const addRow = () => {
    if (value.diagnosis.length >= LIMITS.maxDiagnoses) return;
    // The first diagnosis defaults to Primary so the common case needs no extra click.
    const row = newDiagnosisRow();
    if (value.diagnosis.length === 0) row.type = "Primary";
    onChange({ ...value, diagnosis: [...value.diagnosis, row] });
  };

  const removeRow = (key: string) =>
    onChange({ ...value, diagnosis: value.diagnosis.filter((r) => r.key !== key) });

  async function handleNext() {
    setSubmitted(true);
    if (locked) {
      await onSubmit();
      return;
    }
    if (Object.keys(clientErrors).length > 0) {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    await onSubmit();
  }

  const diagnosisError = show("diagnosis");

  return (
    <div ref={topRef} className="flex flex-col gap-4">
      {savedConsultationId && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <CheckCircle2 size={14} />
          <span>
            Findings saved as <span className="font-mono font-semibold">{savedConsultationId}</span>. They
            can't be edited here; continue to the prescription.
          </span>
        </div>
      )}
      {submitError && (
        <div role="alert" className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-4 items-start">
        {/* ------------------------- Left column ------------------------- */}
        <div className="flex flex-col gap-4">
          <section className="bg-white border border-gray-200 rounded-2xl shadow-xs p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">History of Present Illness (HPI)</h3>
            <textarea
              rows={4}
              maxLength={LIMITS.hpiMax + 200}
              value={value.hpi}
              disabled={locked}
              onChange={(e) => onChange({ ...value, hpi: e.target.value })}
              onBlur={() => touch("presenting_complaint")}
              placeholder="Patient reports persistent cough with occasional phlegm for 3 days..."
              aria-invalid={!!show("presenting_complaint")}
              className={`${inputBase} resize-none ${show("presenting_complaint") ? errBorder : okBorder}`}
            />
            <div className="flex justify-between mt-1">
              <p className="text-[11px] text-red-600 min-h-4">{show("presenting_complaint")}</p>
              <p className="text-[10px] text-gray-400">
                {value.hpi.trim().length}/{LIMITS.hpiMax}
              </p>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-2xl shadow-xs p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">Assessment / Diagnosis</h3>
              <button
                type="button"
                onClick={addRow}
                disabled={locked || value.diagnosis.length >= LIMITS.maxDiagnoses}
                className="flex items-center gap-1 px-4 py-1.5 bg-sky-500 hover:bg-sky-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-[11px] font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <Plus size={12} />
                Add
              </button>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[minmax(0,1fr)_88px_96px_36px] gap-2 bg-gray-50 px-3 py-2 text-[11px] font-semibold text-gray-600">
                <span>Diagnosis</span>
                <span>ICD-10</span>
                <span>Type</span>
                <span className="text-center">Actions</span>
              </div>

              {value.diagnosis.length === 0 ? (
                <p className="px-3 py-5 text-center text-xs text-gray-400">
                  No diagnosis added yet. Click <span className="font-semibold">Add</span> to begin.
                </p>
              ) : (
                value.diagnosis.map((row, i) => {
                  const nameKey = `diagnosis.${i}.diagnosis`;
                  const codeKey = `diagnosis.${i}.icd10`;
                  return (
                    <div
                      key={row.key}
                      className="grid grid-cols-[minmax(0,1fr)_88px_96px_36px] gap-2 px-3 py-2 border-t border-gray-100 items-start"
                    >
                      <div>
                        <input
                          type="text"
                          value={row.diagnosis}
                          disabled={locked}
                          onChange={(e) => setRow(row.key, { diagnosis: e.target.value })}
                          onBlur={() => touch(nameKey)}
                          placeholder="e.g. Acute Upper Respiratory Infection"
                          aria-label={`Diagnosis ${i + 1}`}
                          aria-invalid={!!show(nameKey)}
                          className={`${inputBase} ${show(nameKey) ? errBorder : okBorder}`}
                        />
                        {show(nameKey) && <p className="text-[10px] text-red-600 mt-0.5">{show(nameKey)}</p>}
                      </div>
                      <div>
                        <input
                          type="text"
                          value={row.icd10}
                          disabled={locked}
                          onChange={(e) => setRow(row.key, { icd10: e.target.value.toUpperCase() })}
                          onBlur={() => touch(codeKey)}
                          placeholder="J06.9"
                          maxLength={8}
                          aria-label={`ICD-10 code ${i + 1}`}
                          aria-invalid={!!show(codeKey)}
                          className={`${inputBase} font-mono ${show(codeKey) ? errBorder : okBorder}`}
                        />
                        {show(codeKey) && <p className="text-[10px] text-red-600 mt-0.5 leading-tight">{show(codeKey)}</p>}
                      </div>
                      <select
                        value={row.type}
                        disabled={locked}
                        onChange={(e) => setRow(row.key, { type: e.target.value as DiagnosisType })}
                        aria-label={`Diagnosis type ${i + 1}`}
                        className={`text-[11px] font-semibold rounded-full px-2 py-1.5 border-0 outline-none cursor-pointer disabled:cursor-default ${
                          row.type === "Primary" ? "bg-sky-100 text-sky-600" : "bg-amber-100 text-amber-600"
                        }`}
                      >
                        <option value="Primary">Primary</option>
                        <option value="Secondary">Secondary</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        disabled={locked}
                        aria-label={`Remove diagnosis ${i + 1}`}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            {(diagnosisError || (submitted && errors.diagnosis)) && !locked && (
              <p className="text-[11px] text-red-600 mt-2">{errors.diagnosis}</p>
            )}
          </section>
        </div>

        {/* ------------------------- Right column ------------------------ */}
        <section className="bg-white border border-gray-200 rounded-2xl shadow-xs p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Physical Examination</h3>
          <div className="flex flex-col gap-3">
            {PHYSICAL_EXAM_FIELDS.map(({ key, label }) => {
              const errKey = `physical_examination.${key}`;
              return (
                <div key={key}>
                  <label htmlFor={`exam-${key}`} className="block text-[11px] text-gray-400 mb-1">
                    {label}
                  </label>
                  <textarea
                    id={`exam-${key}`}
                    rows={2}
                    value={value.exam[key]}
                    disabled={locked}
                    onChange={(e) => onChange({ ...value, exam: { ...value.exam, [key]: e.target.value } })}
                    onBlur={() => touch(errKey)}
                    aria-invalid={!!show(errKey)}
                    className={`${inputBase} resize-none ${show(errKey) ? errBorder : okBorder}`}
                  />
                  {show(errKey) && <p className="text-[10px] text-red-600 mt-0.5">{show(errKey)}</p>}
                </div>
              );
            })}
          </div>
          {submitted && !locked && errors.physical_examination && (
            <p className="text-[11px] text-red-600 mt-3">{errors.physical_examination}</p>
          )}
        </section>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="px-6 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-wait"
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          {saving ? "Saving..." : "Next: Prescription →"}
        </button>
      </div>
    </div>
  );
}

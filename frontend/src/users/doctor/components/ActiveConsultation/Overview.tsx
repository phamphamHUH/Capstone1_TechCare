import axios from "axios";
import { CalendarDays } from "lucide-react";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { flushSync } from "react-dom";
import type { QueueEntry } from "../../../../interface/Queue";
import { formatDateTime } from "../../../../utils/formats";
import {
  NoteSection,
  ReadOnlyField,
  Section,
  Tile,
} from "../../components/ActiveConsultation/Overview/FormParts";
import DiagnosisSection from "./Overview/DiagnosisSection";
import {
  CONSULTATION_TYPES,
  EXAM_FIELDS,
  VISIT_TILES,
  VITAL_FIELDS,
  complaintField,
  doctorNotesField,
  hpiField,
  type Diagnosis,
  type ExamKey,
  type NewDiagnosis,
  type NoteField,
  type NoteKey,
  type VitalKey,
} from "../../../../interface/Overview";
import api from "#lib/axios";

type OverviewProps = {
  selectedQueue: QueueEntry | null;
  onProceed: () => void;
};

const fieldClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-xs text-gray-800 outline-none";
const tileClass = "rounded-lg border border-gray-200 px-2.5 py-2.5 space-y-1";

const INLINE_ERROR_KEYS =
  /^(presenting_complaint|diagnosis|physical_examination)/;

const snake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

function usePersistentState<T>(key: string | null, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (!key) return initial;
    try {
      const stored = sessionStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    if (!key) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or unavailable */
    }
  }, [key, value]);

  return [value, setValue] as const;
}

function Overview({ selectedQueue, onProceed }: OverviewProps) {
  const [user] = useState(() => {
    try {
      const stored = sessionStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // DATA FIELDS
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const draftKey = selectedQueue
    ? `consultation-draft:${selectedQueue.consultation_record_id}`
    : null;
  const k = (name: string) => (draftKey ? `${draftKey}:${name}` : null);
  const [consultationType, setConsultationType] = usePersistentState(
    `${draftKey}:type`,
    "",
  );
  const [vitals, setVitals] = usePersistentState<Record<VitalKey, string>>(
    k("vitals"),
    {
      bloodPressure: "",
      heartRate: "",
      respiratoryRate: "",
      temperature: "",
      bloodOxygen: "",
    },
  );
  const [notes, setNotes] = usePersistentState<Record<NoteKey, string>>(
    k("notes"),
    {
      hpi: "",
      chiefComplaint: "",
      doctorNotes: "",
    },
  );
  const [exam, setExam] = usePersistentState<Record<ExamKey, string>>(
    k("exam"),
    {
      generalAppearance: "",
      heent: "",
      cardiovascular: "",
      respiratory: "",
      abdomen: "",
      extremities: "",
    },
  );
  const [diagnoses, setDiagnoses] = usePersistentState<Diagnosis[]>(
    k("dx"),
    [],
  );

  if (!selectedQueue) return null;

  // FORMATS
  const created = formatDateTime(selectedQueue.created_at);
  const fullName = user
    ? [user.first_name, user.middle_name, user.last_name]
        .filter(Boolean)
        .join(" ")
    : "N/A";

  // Handlers
  const clearErrors = (prefix: string) =>
    setFieldErrors((prev) =>
      Object.fromEntries(
        Object.entries(prev).filter(([k]) => !k.startsWith(prefix)),
      ),
    );

  async function handleSubmit() {
    if (!selectedQueue) return;

    setIsSaving(true);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      const response = await api.patch(
        `/api/doctor/consultation-records/${encodeURIComponent(
          selectedQueue.consultation_record_id,
        )}/findings`,
        {
          patient_id: selectedQueue.patient_id,
          doctor_id: user?.user_id != null ? String(user.user_id) : undefined,
          consultation_type: consultationType || undefined,
          presenting_complaint: {
            chief_complaint: notes.chiefComplaint.trim(),
            hpi: notes.hpi.trim(),
          },
          diagnosis: diagnoses.map(({ name, icd10, type }) => ({
            diagnosis: name,
            icd10,
            type,
          })),
          physical_examination: {
            general_appearance: exam.generalAppearance,
            heent: exam.heent,
            cardiovascular: exam.cardiovascular,
            respiratory: exam.respiratory,
            abdomen: exam.abdomen,
            extremities: exam.extremities,
          },
          notes: notes.doctorNotes.trim(),
        },
      );
      onProceed();
      console.log(response.data.message);
    } catch (error: unknown) {
      console.error("Submit consultation error:", error);

      if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        const errors: Record<string, string> = data?.errors ?? {};

        // Render the field errors now so we can scroll to the first one
        flushSync(() => setFieldErrors(errors));
        document
          .querySelector("[data-field-error]")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });

        const other = Object.entries(errors)
          .filter(([k]) => !INLINE_ERROR_KEYS.test(k))
          .map(([, v]) => v);

        setErrorMessage(
          other.join(" ") ||
            (Object.keys(errors).length
              ? "Please fix the highlighted fields."
              : "") ||
            data?.message ||
            data?.error ||
            "Failed to save the consultation. Please check your connection.",
        );
      } else {
        setErrorMessage(
          "Failed to save the consultation. Please check your connection.",
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  // Diagnosis errors are keyed by row index, so any change clears them all.
  const addDiagnosis = (dx: NewDiagnosis) => {
    clearErrors("diagnosis");
    setDiagnoses((prev) => [
      ...prev,
      {
        ...dx,
        id: Date.now(),
        // Only one primary diagnosis: a second one becomes secondary.
        type:
          dx.type === "Primary" && prev.some((d) => d.type === "Primary")
            ? "Secondary"
            : dx.type,
      },
    ]);
  };

  const updateDiagnosis = (id: number, dx: NewDiagnosis) => {
    clearErrors("diagnosis");
    setDiagnoses((prev) =>
      prev.map((d) =>
        d.id !== id
          ? d
          : {
              ...d,
              ...dx,
              type:
                dx.type === "Primary" &&
                prev.some((o) => o.id !== id && o.type === "Primary")
                  ? "Secondary"
                  : dx.type,
            },
      ),
    );
  };

  const removeDiagnosis = (id: number) => {
    clearErrors("diagnosis");
    setDiagnoses((prev) => prev.filter((d) => d.id !== id));
  };

  const setNote = (key: NoteKey, value: string) => {
    setNotes((prev) => ({ ...prev, [key]: value }));
    if (key === "hpi") clearErrors("presenting_complaint");
  };

  const noteProps = (field: NoteField) => ({
    field,
    value: notes[field.key],
    onChange: (v: string) => setNote(field.key, v),
  });

  return (
    <div key={selectedQueue.queue_id} className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column */}
        <div className="space-y-5">
          <Section title="Visit Information" gap="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400">Date & Time</label>
              <div className={`flex items-center gap-2 ${fieldClass}`}>
                <CalendarDays size={18} className="text-gray-400" />
                <span className="text-xs text-gray-800">
                  {created ? `${created.date}, ${created.time}` : "N/A"}
                </span>
              </div>
            </div>

            <ReadOnlyField label="Room" value={selectedQueue.room ?? ""} />
            <ReadOnlyField
              label="Consultation Service"
              value={selectedQueue.service_name ?? ""}
            />

            <div className="space-y-1.5">
              <label className="text-xs text-gray-400">Consultation Type</label>
              <select
                value={consultationType}
                onChange={(e) => setConsultationType(e.target.value)}
                className={fieldClass}
              >
                <option value="">Select Consultation Type</option>
                {CONSULTATION_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Tile label="Height">Not Recorded</Tile>
              <Tile label="Weight">Not Recorded</Tile>
              {VISIT_TILES.map((t) => (
                <Tile key={t.label} label={t.label}>
                  {t.get(selectedQueue)}
                </Tile>
              ))}
              <Tile label="Attending Physician">Dr. {fullName}</Tile>
              <div className={tileClass}>
                <p className="text-[10px] text-gray-400">Status</p>
                <span className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-[9px] font-medium text-blue-600">
                  In Consultation
                </span>
              </div>
            </div>
          </Section>

          <NoteSection
            {...noteProps(hpiField)}
            error={fieldErrors.presenting_complaint}
          />

          <DiagnosisSection
            diagnoses={diagnoses}
            onAdd={addDiagnosis}
            onUpdate={updateDiagnosis}
            onRemove={removeDiagnosis}
            errors={fieldErrors}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          <NoteSection {...noteProps(complaintField)} />

          <Section title="Vital Signs">
            <div className="grid grid-cols-3 gap-2">
              {VITAL_FIELDS.map((f) => (
                <div
                  key={f.key}
                  className={`${tileClass} focus-within:border-sky-400`}
                >
                  <label
                    htmlFor={`vs-${f.key}`}
                    className="text-[10px] text-gray-400"
                  >
                    {f.label}
                  </label>
                  <div className="flex items-baseline gap-1">
                    <input
                      id={`vs-${f.key}`}
                      type="text"
                      inputMode={f.inputMode}
                      placeholder={f.placeholder}
                      value={vitals[f.key]}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (f.pattern.test(v))
                          setVitals((prev) => ({ ...prev, [f.key]: v }));
                      }}
                      className="w-full text-xs font-bold outline-none placeholder:font-normal placeholder:text-gray-300"
                    />
                    <span className="text-[10px] text-gray-400">{f.unit}</span>
                  </div>
                </div>
              ))}
              {/* BMI (computed later from height and weight) */}
              <Tile label="BMI" className="bg-gray-50">
                Not Recorded
              </Tile>
            </div>
          </Section>

          <Section title="Physical Examination" gap="space-y-4">
            {fieldErrors.physical_examination && (
              <p data-field-error className="text-[10px] text-red-500">
                {fieldErrors.physical_examination}
              </p>
            )}
            <div className="space-y-3">
              {EXAM_FIELDS.map((f) => {
                const err = fieldErrors[`physical_examination.${snake(f.key)}`];
                return (
                  <div key={f.key} className="space-y-1">
                    <label
                      htmlFor={`exam-${f.key}`}
                      className="text-[11px] text-gray-400"
                    >
                      {f.label}
                    </label>
                    <textarea
                      id={`exam-${f.key}`}
                      rows={2}
                      value={exam[f.key]}
                      onChange={(e) => {
                        setExam((prev) => ({
                          ...prev,
                          [f.key]: e.target.value,
                        }));
                        clearErrors("physical_examination");
                      }}
                      placeholder={f.placeholder}
                      className={`w-full resize-none rounded-lg border border-gray-200 p-2.5 text-xs text-gray-700 outline-none placeholder:text-gray-300 focus:border-sky-400 ${
                        err ? "ring-1 ring-red-400" : ""
                      }`}
                    />
                    {err && (
                      <p data-field-error className="text-[10px] text-red-500">
                        {err}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          <NoteSection {...noteProps(doctorNotesField)} />
        </div>
      </div>

      {/* Actions */}
      {submitError && <p className="text-xs text-red-500">{submitError}</p>}
      <div className="flex justify-between">
        <button
          type="button"
          className="rounded-lg border cursor-pointer border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving}
          className="rounded-lg bg-blue-600 cursor-pointer px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isSaving ? "Saving..." : "Proceed to Prescription"}
        </button>
      </div>
    </div>
  );
}

export default Overview;

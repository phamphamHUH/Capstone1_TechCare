import axios from "axios";
import {
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  TriangleAlert,
} from "lucide-react";
import ConfirmDialog from "../../../../components/ConfirmDialog";
import UniversalModal from "#components/UniversalModal";
import { useState } from "react";
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
import { usePersistentState } from "./utils/persistentState";

type OverviewProps = {
  selectedQueue: QueueEntry | null;
  setSelectedQueue: React.Dispatch<React.SetStateAction<QueueEntry | null>>;
  findingsSaved: boolean;
  onFindingsSaved: () => void;
  onProceed: () => void;
  onCompleted?: () => void | Promise<void>;
};

const fieldClass =
  "w-full rounded-md border border-gray-200 px-3 py-2.5 text-xs text-gray-800 outline-none";
const tileClass = "rounded-md border border-gray-200 px-2.5 py-2.5 space-y-1";

const INLINE_ERROR_KEYS =
  /^(presenting_complaint|diagnosis|physical_examination)/;

const snake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

function Overview({
  selectedQueue,
  findingsSaved,
  onFindingsSaved,
  onProceed,
  onCompleted,
}: OverviewProps) {
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
  const [showSuccess, setShowSuccess] = useState(false);
  const [confirmingProceed, setConfirmingProceed] = useState(false);
  const [confirmingSkip, setConfirmingSkip] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
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
      // Taken at the front desk; the doctor can correct it.
      temperature: selectedQueue?.vital_signs?.temperature ?? "",
      bloodOxygen: "",
    },
  );
  // Measured at the front desk (read-only here).
  const height = Number(selectedQueue?.vital_signs?.height);
  const weight = Number(selectedQueue?.vital_signs?.weight);
  const bmi = height > 0 && weight > 0 ? weight / (height / 100) ** 2 : null;
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
      await api.patch(
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
          diagnosis: diagnoses.map(({ name, type }) => ({
            diagnosis: name,
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
      setShowSuccess(true);
      onFindingsSaved();
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

  async function handleEndConsultation() {
    if (!selectedQueue) return;
    try {
      setErrorMessage(null);
      await api.patch(
        `/api/doctor/consultation-queues/${encodeURIComponent(selectedQueue.queue_id)}/complete`,
        { room: selectedQueue.room, action: "complete" },
      );

      // the consultation is over, so drop its drafts
      for (const name of ["type", "vitals", "notes", "exam", "dx"]) {
        sessionStorage.removeItem(`${draftKey}:${name}`);
      }

      await onCompleted?.();
    } catch (err) {
      setErrorMessage(
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Failed to end the consultation.",
      );
    } finally {
      setConfirmingEnd(false);
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
      <div className="flex flex-wrap gap-x-3 gap-y-1 border px-4 sm:px-5 py-3 rounded-md border-gray-200 items-center">
        <h1>Findings</h1>
        <p className="text-xs font-extralight">(* indicates required fields)</p>
      </div>
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
              <Tile label="Height">{height}</Tile>
              <Tile label="Weight">{weight}</Tile>
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
              {/* Height and weight come from the front desk */}

              <Tile label="BMI" className="bg-gray-50">
                {bmi ? bmi.toFixed(1) : "Not Recorded"}
              </Tile>
            </div>
          </Section>

          <Section title="Physical Examination *" gap="space-y-4">
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
                      className={`w-full resize-none rounded-md border border-gray-200 p-2.5 text-xs text-gray-700 outline-none placeholder:text-gray-300 focus:border-sky-400 ${
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
      <div className="flex flex-wrap justify-between gap-3">
        <button
          type="button"
          onClick={() => setConfirmingEnd(true)}
          disabled={isSaving || !findingsSaved}
          className="rounded-md border cursor-pointer border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-white"
        >
          Complete Consultation
        </button>
        <div className="flex gap-3">
          {findingsSaved && (
            <button
              type="button"
              onClick={() =>
                findingsSaved ? onProceed() : setConfirmingSkip(true)
              }
              disabled={isSaving}
              className="rounded-md border cursor-pointer border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Proceed to Prescription
            </button>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="rounded-md bg-blue-600 cursor-pointer px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isSaving ? "Saving..." : "Save Findings"}
          </button>
        </div>
      </div>
      {showSuccess && (
        <UniversalModal
          isOpen
          type="success"
          title="Findings Saved"
          description="The consultation findings were saved successfully."
          icon={<CheckCircle2 size={36} />}
          onClose={() => {
            setShowSuccess(false);
            setConfirmingProceed(true);
          }}
          actions={[
            {
              label: "Continue",
              onClick: () => {
                setShowSuccess(false);
                setConfirmingProceed(true);
              },
            },
          ]}
        />
      )}
      {confirmingProceed && (
        <ConfirmDialog
          tone="info"
          icon={CheckCircle2}
          title="Proceed to Prescription?"
          confirmLabel="Proceed"
          cancelLabel="Stay"
          description="Your findings are saved. Do you want to continue to the prescription now, or stay on this page?"
          onCancel={() => setConfirmingProceed(false)}
          onConfirm={() => {
            setConfirmingProceed(false);
            onProceed();
          }}
        />
      )}
      {confirmingSkip && (
        <ConfirmDialog
          tone="warning"
          icon={TriangleAlert}
          title="Findings Not Saved"
          confirmLabel="Proceed Anyway"
          cancelLabel="Go Back"
          description="You haven't saved your findings yet. They're kept as a draft here, but they won't be recorded until you save them. Continue to the prescription anyway?"
          onCancel={() => setConfirmingSkip(false)}
          onConfirm={() => {
            setConfirmingSkip(false);
            onProceed();
          }}
        />
      )}
      {confirmingEnd && (
        <ConfirmDialog
          tone="warning"
          icon={CircleAlert}
          title="End Consultation?"
          confirmLabel="End Consultation"
          cancelLabel="Keep Working"
          description="This completes the consultation and removes the patient from your active queue. Unsaved findings will be discarded."
          onCancel={() => setConfirmingEnd(false)}
          onConfirm={handleEndConsultation}
        />
      )}
    </div>
  );
}

export default Overview;

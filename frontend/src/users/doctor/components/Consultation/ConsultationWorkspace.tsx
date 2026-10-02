import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { AlertCircle, Loader2, Search } from "lucide-react";
import calculateAge from "../../../../utils/calculateAge";
import PrescriptionManager from "../prescription/PrescriptionManager";
import type { PatientInfo } from "../prescription/types";
import ConsultationPatientHeader from "./ConsultationPatientHeader";
import ConsultationFindingsForm from "./ConsultationFindingsForm";
import LaboratoryRequestForm from "./LaboratoryRequestsForm";
import {
  fetchConsultationPatient,
  saveConsultationFindings,
  toApiFailure,
} from "./consultationsApi";
import type {
  ConsultationPatient,
  FieldErrors,
  FindingsFormState,
  WorkspaceTab,
} from "./types.ts";

const STORAGE_PATIENT = "techcare.consultation.patient_id";
const draftKey = (patientId: string) => `techcare.consultation.draft.${patientId}`;

const emptyFindings = (): FindingsFormState => ({
  hpi: "",
  diagnosis: [],
  exam: {
    general_appearance: "",
    heent: "",
    cardiovascular: "",
    respiratory: "",
    abdomen: "",
    extremities: "",
  },
});

type Draft = { form: FindingsFormState; consultationId: string | null };

function loadDraft(patientId: string): Draft {
  try {
    const raw = sessionStorage.getItem(draftKey(patientId));
    if (raw) {
      const parsed = JSON.parse(raw) as Draft;
      if (parsed?.form) return { form: { ...emptyFindings(), ...parsed.form }, consultationId: parsed.consultationId ?? null };
    }
  } catch {
    /* ignore corrupt draft */
  }
  return { form: emptyFindings(), consultationId: null };
}

function toPatientInfo(p: ConsultationPatient): PatientInfo {
  const age = calculateAge(p.birthdate);
  return {
    id: p.patient_id,
    patientId: p.patient_id,
    name: [p.first_name, p.middle_name, p.last_name, p.suffix].filter(Boolean).join(" "),
    age: Number.isNaN(age) ? "—" : `${age} years old`,
    sex: p.sex,
    birthdate: p.birthdate,
    contactNumber: p.contact_number,
    address: p.address ?? undefined,
    isSeniorCitizen: !Number.isNaN(age) && age >= 60,
    avatarInitials: `${p.first_name.charAt(0)}${p.last_name.charAt(0)}`.toUpperCase(),
  };
}

type Props = { initialTab?: WorkspaceTab };

export default function ConsultationWorkspace({ initialTab = "consultation" }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  // Consultation service for the findings record; supplied via ?service_id= for now.
  const serviceId = searchParams.get("service_id") ?? "";

  const [patientId, setPatientId] = useState(
    () => searchParams.get("patient_id") ?? sessionStorage.getItem(STORAGE_PATIENT) ?? "",
  );
  const [lookupInput, setLookupInput] = useState(patientId);
  const [patient, setPatient] = useState<ConsultationPatient | null>(null);
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientError, setPatientError] = useState<string | null>(null);

  const [tab, setTab] = useState<WorkspaceTab>(initialTab);
  const [view, setView] = useState<"workspace" | "prescription">("workspace");

  const [form, setForm] = useState<FindingsFormState>(emptyFindings);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});

  // Load the patient whenever the active patient ID changes.
  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    (async () => {
      setPatientLoading(true);
      setPatientError(null);
      try {
        const p = await fetchConsultationPatient(patientId);
        if (cancelled) return;
        setPatient(p);
        const draft = loadDraft(patientId);
        setForm(draft.form);
        setConsultationId(draft.consultationId);
        setSubmitError(null);
        setServerErrors({});
        sessionStorage.setItem(STORAGE_PATIENT, patientId);
      } catch (e) {
        if (cancelled) return;
        setPatient(null);
        setPatientError(toApiFailure(e, "Couldn't load the patient.").message);
      } finally {
        if (!cancelled) setPatientLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  // Keep the draft so switching sidebar pages doesn't lose what was typed.
  useEffect(() => {
    if (!patient) return;
    try {
      sessionStorage.setItem(draftKey(patient.patient_id), JSON.stringify({ form, consultationId }));
    } catch {
      /* storage full / unavailable */
    }
  }, [patient, form, consultationId]);

  const selectPatient = useCallback(
    (id: string) => {
      setPatientId(id);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) next.set("patient_id", id);
          else next.delete("patient_id");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const changePatient = () => {
    sessionStorage.removeItem(STORAGE_PATIENT);
    setLookupInput("");
    setPatientError(null);
    setView("workspace");
    selectPatient("");
  };

  async function submitFindings(): Promise<boolean> {
    if (!patient) return false;
    // Already stored: don't create a duplicate record, just move on.
    if (consultationId) {
      setView("prescription");
      return true;
    }
    if (!serviceId) {
      setSubmitError("No consultation service selected. Open this page with ?service_id=<service ID> to save findings.");
      return false;
    }
    setSaving(true);
    setSubmitError(null);
    setServerErrors({});
    try {
      const saved = await saveConsultationFindings({ patientId: patient.patient_id, serviceId, form });
      setConsultationId(saved.consultation_record_id);
      setView("prescription");
      return true;
    } catch (e) {
      const failure = toApiFailure(e, "Couldn't save the findings. Please try again.");
      setSubmitError(failure.message);
      setServerErrors(failure.fieldErrors);
      return false;
    } finally {
      setSaving(false);
    }
  }

  /* ---------------------- No patient selected yet ---------------------- */
  if (!patientId || (!patient && !patientLoading)) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs p-8 max-w-xl mx-auto text-center">
        <h2 className="text-base font-bold text-gray-900">Select a patient</h2>
        <p className="text-xs text-gray-500 mt-1 mb-5">Enter a patient ID to start recording findings or a laboratory request.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const id = lookupInput.trim();
            if (id) selectPatient(id);
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={lookupInput}
              onChange={(e) => setLookupInput(e.target.value)}
              placeholder="Patient ID, e.g. P-26-0929-0001"
              aria-label="Patient ID"
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-sky-400"
            />
          </div>
          <button type="submit" disabled={!lookupInput.trim()} className="px-5 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-semibold rounded-lg cursor-pointer disabled:cursor-not-allowed">
            Open
          </button>
        </form>
        {patientError && (
          <p role="alert" className="flex items-center justify-center gap-1.5 text-xs text-red-600 mt-3">
            <AlertCircle size={13} /> {patientError}
          </p>
        )}
      </div>
    );
  }

  if (patientLoading || !patient) {
    return (
      <div className="py-20 flex items-center justify-center text-xs text-gray-500" role="status">
        <Loader2 size={18} className="animate-spin text-sky-500 mr-2" /> Loading patient...
      </div>
    );
  }

  /* --------------------------- Prescription step ------------------------ */
  if (view === "prescription" && consultationId) {
    return (
      <PrescriptionManager
        initialPatient={toPatientInfo(patient)}
        consultationId={consultationId}
        onClose={() => setView("workspace")}
      />
    );
  }

  /* ------------------------------ Workspace ----------------------------- */
  return (
    <div className="flex flex-col gap-4">
      <ConsultationPatientHeader patient={patient} activeTab={tab} onTabChange={setTab} />

      {tab === "consultation" && (
        <ConsultationFindingsForm
          value={form}
          onChange={setForm}
          onSubmit={submitFindings}
          onBack={changePatient}
          saving={saving}
          savedConsultationId={consultationId}
          submitError={submitError}
          serverErrors={serverErrors}
        />
      )}

      {tab === "laboratory-request" && (
        <LaboratoryRequestForm
          patient={patient}
          consultationRecordId={consultationId ?? undefined}
          onChangePatient={changePatient}
        />
      )}

      {tab === "medical-history" && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs p-8 text-center">
          <p className="text-xs text-gray-500 mb-4">View this patient's full history on the Medical History page.</p>
          <button
            type="button"
            onClick={() => setSearchParams({ page: "medical-history", patient_id: patient.patient_id })}
            className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            Open Medical History
          </button>
        </div>
      )}

      {(tab === "laboratory-results" || tab === "attachments") && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs p-8 text-center text-xs text-gray-400">
          This section isn't available yet.
        </div>
      )}
    </div>
  );
}

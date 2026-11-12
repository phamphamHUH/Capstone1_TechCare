import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { ArrowLeft, CheckCircle2, FilePlus2, Send, Stethoscope } from "lucide-react";
import api from "#lib/axios";
import ErrorMessage from "../../../../components/ErrorMessage";
import { LoadingSpinner } from "../../../../components/LoadingScreen";
import type { ResultValues } from "../../../../interface/LaboratoryAnalysis";
import TemplateFields from "../../../laboratory_staff/components/LaboratoryResults/ResultEntry/TemplateFields";
import { validateResults } from "../../../laboratory_staff/components/LaboratoryResults/utils/laboratoryValidation";
import { ReportPreview } from "../../../laboratory_staff/components/LaboratoryResults/PrintResultView";
import {
  DOCUMENT_TYPE_LABELS,
  defaultValues,
  issuedReport,
  medicalReport,
  type IssuedMedicalDocument,
  type MedicalDocumentPatient,
  type MedicalDocumentTemplate,
} from "../../../../utils/medicalDocuments";
import PatientPicker from "./PatientPicker";

type SessionDoctor = {
  first_name?: string;
  middle_name?: string | null;
  last_name?: string;
  suffix?: string | null;
  prc_license_number?: string | null;
};

// The server prints the signed-in doctor on the released document; this is
// only used to show the same name in the draft preview.
function signedInDoctor() {
  try {
    const user = JSON.parse(sessionStorage.getItem("user") || "{}") as SessionDoctor;
    return {
      name: [user.first_name, user.middle_name, user.last_name, user.suffix]
        .filter((part) => part && String(part).trim())
        .join(" "),
      license: user.prc_license_number || null,
    };
  } catch {
    return { name: "", license: null };
  }
}

type Props = {
  template: MedicalDocumentTemplate;
  onBack: () => void;
  onReleased?: (document: IssuedMedicalDocument) => void;
};

export default function DocumentEditor({ template, onBack, onReleased }: Props) {
  const typeLabel = DOCUMENT_TYPE_LABELS[template.document_type];
  const physician = useMemo(() => signedInDoctor(), []);
  const [patient, setPatient] = useState<MedicalDocumentPatient | null>(null);
  const [values, setValues] = useState<ResultValues>(() => defaultValues(template.components));
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [patientError, setPatientError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [released, setReleased] = useState<IssuedMedicalDocument | null>(null);

  const draft = useMemo(
    () => medicalReport({ template, patient, values, remarks, physician }),
    [template, patient, values, remarks, physician],
  );
  // Rebuilding the print frame on every keystroke flickers; wait for a pause.
  const [preview, setPreview] = useState(draft);
  useEffect(() => {
    const timer = window.setTimeout(() => setPreview(draft), 400);
    return () => window.clearTimeout(timer);
  }, [draft]);
  const releasedReport = useMemo(() => (released ? issuedReport(released) : null), [released]);

  function fieldErrors(next: ResultValues) {
    const result = validateResults(template.components, next);
    return Object.fromEntries(Object.entries(result).filter(([key]) => key !== "_form"));
  }

  function startRelease() {
    setSubmitError("");
    const nextErrors = fieldErrors(values);
    setErrors(nextErrors);
    setPatientError(patient ? "" : "Select the patient this document is for.");
    if (!patient || Object.keys(nextErrors).length > 0) {
      setSubmitError("Please complete the highlighted fields before releasing.");
      return;
    }
    if (remarks.length > 5000) {
      setSubmitError("Remarks can be at most 5,000 characters.");
      return;
    }
    setConfirming(true);
  }

  async function release() {
    if (!patient) return;
    setReleasing(true);
    setSubmitError("");
    try {
      const { data } = await api.post<{ document: IssuedMedicalDocument }>("/api/doctor/medical-documents", {
        patient_id: patient.patient_id,
        form_id: template.form_id,
        values,
        remarks,
      });
      // The list endpoint joins patient details; the insert response does not.
      const document: IssuedMedicalDocument = {
        ...data.document,
        patient_name: patient.full_name,
        sex: patient.sex,
        age: patient.age,
        address: patient.address ?? null,
        civil_status: patient.civil_status ?? null,
      };
      setReleased(document);
      setConfirming(false);
      onReleased?.(document);
    } catch (cause) {
      setSubmitError(
        isAxiosError<{ message?: string }>(cause)
          ? cause.response?.data?.message || "The document could not be released. Please try again."
          : "The document could not be released. Please try again.",
      );
    } finally {
      setReleasing(false);
    }
  }

  function issueAnother() {
    setReleased(null);
    setPatient(null);
    setValues(defaultValues(template.components));
    setRemarks("");
    setErrors({});
  }

  if (released && releasedReport) {
    return (
      <section className="space-y-4">
        <button type="button" onClick={onBack} className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} />Back to medical documents
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-md border border-green-200 bg-green-50 p-5" role="status">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 shrink-0 text-green-600" size={22} />
            <div>
              <h2 className="font-semibold text-gray-900">{typeLabel} {released.document_id} released</h2>
              <p className="text-sm text-gray-600">
                {released.patient_name} can now view and print it from their patient portal. You can print a copy below.
              </p>
            </div>
          </div>
          <button type="button" onClick={issueAnother} className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-sky-300 bg-white px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-50">
            <FilePlus2 size={16} />Issue another
          </button>
        </div>
        <div className="rounded-md border border-gray-200 bg-white px-4 pb-4">
          <ReportPreview report={releasedReport} />
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-md border border-gray-200 bg-white p-5">
        <div>
          <button type="button" onClick={onBack} disabled={releasing} className="mb-3 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50">
            <ArrowLeft size={16} />Back to medical documents
          </button>
          <p className="text-xs font-medium text-gray-500">{typeLabel}</p>
          <h2 className="text-xl font-semibold text-gray-900">{template.form_name}</h2>
          <p className="mt-1 text-sm text-gray-500">Select the patient, fill out the form, then release it to the patient.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 2xl:grid-cols-2">
        <div className="min-w-0 space-y-5">
          <section className="rounded-md border border-gray-200 bg-white p-5" aria-labelledby="document-patient-heading">
            <h3 id="document-patient-heading" className="mb-3 font-semibold text-gray-900">1. Patient</h3>
            <PatientPicker
              patient={patient}
              onChange={(next) => { setPatient(next); setPatientError(""); setConfirming(false); }}
              disabled={releasing}
              error={patientError}
            />
          </section>

          <section className="rounded-md border border-gray-200 bg-white p-5" aria-labelledby="document-fields-heading">
            <h3 id="document-fields-heading" className="mb-3 font-semibold text-gray-900">2. Document details</h3>
            {template.components.some((component) => ["text_field", "number_field", "date_field", "checkbox", "table"].includes(component.type)) ? (
              <TemplateFields
                variant="document"
                components={template.components}
                values={values}
                errors={errors}
                disabled={releasing}
                onChange={(key, value) => {
                  setConfirming(false);
                  const next = { ...values, [key]: value };
                  setValues(next);
                  if (errors[key]) setErrors(fieldErrors(next));
                }}
                onBlur={(key) => {
                  const next = fieldErrors(values);
                  setErrors((current) => {
                    const updated = { ...current };
                    if (next[key]) updated[key] = next[key];
                    else delete updated[key];
                    return updated;
                  });
                }}
              />
            ) : (
              <p className="text-sm text-gray-500">This template has no fillable fields. Use the remarks below for any details.</p>
            )}
            <label className="mt-2 block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Remarks (optional)</span>
              <textarea
                value={remarks}
                onChange={(event) => { setRemarks(event.target.value); setConfirming(false); }}
                disabled={releasing}
                rows={3}
                maxLength={5000}
                placeholder="Additional notes printed on the document"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50"
              />
            </label>
          </section>

          <section className="rounded-md border border-gray-200 bg-white p-5" aria-labelledby="document-physician-heading">
            <h3 id="document-physician-heading" className="mb-3 font-semibold text-gray-900">3. Attending physician</h3>
            <div className="flex items-start gap-3 text-sm">
              <div className="rounded-md bg-sky-50 p-2 text-sky-600"><Stethoscope size={18} /></div>
              <div>
                <p className="font-medium text-gray-900">{physician.name || "Your account"}</p>
                <p className="text-gray-500">License #: {physician.license || "Not on file"}</p>
                <p className="mt-1 text-xs text-gray-500">Added automatically from your account. It is printed above “Attending Physician”.</p>
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-md border border-gray-200 bg-white p-5">
            {submitError && <ErrorMessage>{submitError}</ErrorMessage>}
            {confirming && patient ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm" role="alertdialog" aria-labelledby="release-confirm-title">
                <p id="release-confirm-title" className="font-semibold text-gray-900">Release this {typeLabel.toLowerCase()} to {patient.full_name}?</p>
                <p className="mt-1 text-gray-600">The patient will be able to view and print it. Released documents can't be changed; issue a new one if you need to correct it.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void release()} disabled={releasing} className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50">
                    {releasing ? <LoadingSpinner size={14} /> : <Send size={14} />}Confirm release
                  </button>
                  <button type="button" onClick={() => setConfirming(false)} disabled={releasing} className="cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                    Keep editing
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={startRelease} className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500">
                <Send size={16} />Release to patient
              </button>
            )}
          </section>
        </div>

        <section className="min-w-0 rounded-md border border-gray-200 bg-white px-4 pb-4" aria-label="Document preview">
          <ReportPreview report={preview} />
        </section>
      </div>
    </section>
  );
}

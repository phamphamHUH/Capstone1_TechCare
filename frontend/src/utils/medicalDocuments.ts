import {
  dbComponentToBuilderComponent,
  type BuilderComponent,
  type PaperSize,
} from "../interface/FormTemplate";
import type {
  LaboratoryReportData,
  ResultValues,
} from "../interface/LaboratoryAnalysis";

export type MedicalDocumentType = "medical_certificate" | "medical_clearance";

export const DOCUMENT_TYPE_LABELS: Record<MedicalDocumentType, string> = {
  medical_certificate: "Medical Certificate",
  medical_clearance: "Medical Clearance",
};

/** Template as the doctor fills it (components already in builder shape). */
export type MedicalDocumentTemplate = {
  form_id: string;
  form_name: string;
  form_description?: string | null;
  paper_size?: PaperSize | null;
  service_id: string;
  service_name: string;
  service_category: string;
  status: string;
  version?: number;
  document_type: MedicalDocumentType;
  components: BuilderComponent[];
};

export type MedicalDocumentPatient = {
  patient_id: string;
  full_name: string;
  sex: string;
  birthdate?: string | null;
  age: number | null;
  address?: string | null;
  civil_status?: string | null;
  contact_number?: string | null;
};

/** A released document as returned by the API. */
export type IssuedMedicalDocument = {
  document_id: string;
  document_type: MedicalDocumentType;
  patient_id: string;
  form_id: string;
  template_snapshot: Omit<MedicalDocumentTemplate, "components"> & {
    components: unknown[];
  };
  field_values: ResultValues | null;
  remarks: string | null;
  physician_name: string;
  physician_license: string | null;
  status: string;
  issued_at: string;
  patient_name: string;
  sex: string;
  age: number | null;
  address: string | null;
  civil_status: string | null;
};

export function documentTemplate(
  document: IssuedMedicalDocument,
): MedicalDocumentTemplate {
  const snapshot = document.template_snapshot;
  return {
    ...snapshot,
    document_type: document.document_type,
    components: (Array.isArray(snapshot.components) ? snapshot.components : []).map(
      dbComponentToBuilderComponent,
    ),
  };
}

type ReportInput = {
  template: MedicalDocumentTemplate;
  patient: MedicalDocumentPatient | null;
  values: ResultValues;
  remarks: string;
  physician: { name: string; license?: string | null };
  documentId?: string;
  releasedAt?: string;
};

/** Builds the data the shared A4 report renderer prints. */
export function medicalReport({
  template,
  patient,
  values,
  remarks,
  physician,
  documentId,
  releasedAt,
}: ReportInput): LaboratoryReportData {
  const typeLabel = DOCUMENT_TYPE_LABELS[template.document_type];
  return {
    request: {
      requestId: documentId ?? "DRAFT",
      queueId: "",
      patientId: patient?.patient_id ?? "",
      patientName: patient?.full_name ?? "Select a patient",
      birthdate: patient?.birthdate ?? "",
      age: patient?.age ?? null,
      sex: patient?.sex ?? "",
      requestedAt: releasedAt ?? "",
      collectedAt: "",
      accepted: true,
      sampleCollected: false,
      room: "",
      priority: false,
      category: "Normal",
      status: "Completed",
      consultationType: "",
      tests: [
        {
          id: template.form_id,
          serviceId: template.service_id,
          name: template.service_name,
          description: "",
        },
      ],
    },
    template: {
      form_id: template.form_id,
      form_name: template.form_name,
      form_description: template.form_description ?? undefined,
      paper_size: template.paper_size ?? "a4",
      service_id: template.service_id,
      status: template.status,
      created_by: "",
      created_at: "",
      updated_at: "",
      version: template.version,
      components: template.components,
      category: "",
      testNames: [],
    },
    values,
    remarks,
    resultId: documentId,
    releasedAt,
    savedAt: releasedAt,
    attendingPhysician: physician,
    medicalDocument: {
      typeLabel,
      address: patient?.address ?? undefined,
      civilStatus: patient?.civil_status ?? undefined,
    },
  };
}

export function issuedReport(document: IssuedMedicalDocument) {
  return medicalReport({
    template: documentTemplate(document),
    patient: {
      patient_id: document.patient_id,
      full_name: document.patient_name,
      sex: document.sex,
      age: document.age,
      address: document.address,
      civil_status: document.civil_status,
    },
    values: document.field_values ?? {},
    remarks: document.remarks ?? "",
    physician: {
      name: document.physician_name,
      license: document.physician_license,
    },
    documentId: document.document_id,
    releasedAt: document.issued_at,
  });
}

/** Starting values: each field's default from the template builder. */
export function defaultValues(components: BuilderComponent[]): ResultValues {
  return Object.fromEntries(
    components
      .filter((component) => component.settings.defaultValue != null && component.settings.defaultValue !== "")
      .map((component) => [component.fieldKey, component.settings.defaultValue]),
  );
}

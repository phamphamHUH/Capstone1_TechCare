import type { FormTemplate } from "./FormTemplate";

export type AnalysisStatus = "Ready for Analysis" | "In Progress" | "Completed";
export type PatientCategory =
  | "Normal"
  | "Senior Citizen"
  | "Pregnant"
  | "PWD"
  | "Priority";

export interface AnalysisTest {
  id: string;
  serviceId: string;
  name: string;
  description: string;
}

export interface AnalysisRequest {
  requestId: string;
  queueId: string;
  patientId: string;
  patientName: string;
  birthdate: string;
  age: number | null;
  sex: string;
  requestedAt: string;
  collectedAt: string;
  accepted: boolean;
  sampleCollected: boolean;
  room: string;
  priority: boolean;
  category: PatientCategory;
  status: AnalysisStatus;
  consultationType: string;
  tests: AnalysisTest[];
}

export type ReportTemplate = FormTemplate & {
  category: string;
  version?: number;
  testNames: string[];
  fieldsAvailable?: boolean;
};
export type ResultValues = Record<string, unknown>;

/** The template must be the snapshot used to save this result, not a newer revision. */
export interface LaboratoryReportData {
  request: AnalysisRequest;
  template: ReportTemplate;
  values: ResultValues;
  remarks: string;
  requestingPhysician?: string;
  resultId?: string;
  savedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  releasedAt?: string;
  releasedBy?: string;
  onlineAvailable?: boolean;
  releaseStatus?: "Pending" | "Released";
}

export interface ResultReleasePayload {
  result_id: string;
  request_id: string;
  patient_id: string;
}

export interface ResultReleaseResponse {
  result_id: string;
  status?: "Released";
  released_at?: string;
  online_available?: boolean;
  released_by?: string;
}
export interface ResultEntryPayload {
  room: string;
  request_id: string;
  patient_id: string;
  lab_item_id: string | null;
  service_id: string;
  form_id: string;
  template_version: number | null;
  template_snapshot: ReportTemplate;
  values: ResultValues;
  remarks: string;
}

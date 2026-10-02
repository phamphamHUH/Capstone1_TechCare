import { isAxiosError } from "axios";
import api from "../../../../lib/axios";
import type {
  ConsultationPatient,
  DiagnosisRow,
  FieldErrors,
  FindingsFormState,
  LabPriority,
  LaboratoryService,
} from "./types";

export type ApiFailure = { message: string; fieldErrors: FieldErrors };

/** Turns any thrown value into a user-facing message + per-field errors (HTTP 400 `errors`). */
export function toApiFailure(error: unknown, fallback: string): ApiFailure {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; errors?: FieldErrors }
      | undefined;
    if (data?.message || data?.errors) {
      return { message: data.message ?? fallback, fieldErrors: data.errors ?? {} };
    }
    if (!error.response) {
      return { message: "Can't reach the server. Check your connection.", fieldErrors: {} };
    }
  }
  return { message: fallback, fieldErrors: {} };
}

function currentDoctorId(): string | undefined {
  // Only used by the backend when there is no auth token (non-production).
  try {
    const stored = sessionStorage.getItem("user");
    if (stored) {
      const user = JSON.parse(stored) as { user_id?: string };
      return user.user_id || undefined;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

export async function fetchConsultationPatient(patientId: string) {
  const { data } = await api.get<{ patient: ConsultationPatient }>(
    `/api/doctor/consultation-patients/${encodeURIComponent(patientId)}`,
  );
  return data.patient;
}

export type SaveFindingsInput = {
  patientId: string;
  serviceId: string;
  form: FindingsFormState;
};

export type SavedConsultation = { consultation_record_id: string };

export async function saveConsultationFindings(input: SaveFindingsInput) {
  const { form } = input;
  const { data } = await api.post<{ consultation: SavedConsultation }>(
    "/api/doctor/consultations",
    {
      patient_id: input.patientId,
      service_id: input.serviceId,
      doctor_id: currentDoctorId(),
      presenting_complaint: { hpi: form.hpi.trim() },
      diagnosis: form.diagnosis.map((d: DiagnosisRow) => ({
        diagnosis: d.diagnosis.trim(),
        icd10: d.icd10.trim().toUpperCase(),
        type: d.type,
      })),
      physical_examination: form.exam,
    },
  );
  return data.consultation;
}

export async function fetchLaboratoryServices() {
  const { data } = await api.get<{ services: LaboratoryService[] }>(
    "/api/doctor/laboratory-services",
  );
  return data.services;
}

export type SubmitLabRequestInput = {
  patientId: string;
  consultationRecordId?: string;
  serviceIds: string[];
  priority: LabPriority;
  requestDate: string;
  estimatedReleaseDate: string;
};

export type SubmittedLabRequest = {
  /** The API returns the inserted row inside an array. */
  request: { request_id: string }[];
  items: { lab_item_id: string; service_id: string }[];
};

export async function submitLaboratoryRequest(input: SubmitLabRequestInput) {
  const { data } = await api.post<SubmittedLabRequest>(
    "/api/doctor/laboratory-requests",
    {
      patient_id: input.patientId,
      consultation_record_id: input.consultationRecordId || undefined,
      doctor_id: currentDoctorId(),
      services: input.serviceIds.map((service_id) => ({ service_id })),
      priority: input.priority,
      request_date: input.requestDate || undefined,
      estimated_release_date: input.estimatedReleaseDate || undefined,
    },
  );
  return data;
}

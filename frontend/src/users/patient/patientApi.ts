import api from "../../lib/axios";
import type {
  MedicalHistoryResponse,
  PrescriptionsResponse,
  PatientVisitDetails,
  PatientQueueResponse,
} from "./types";

export type MedicalHistoryParams = {
  search?: string;
  service_category?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
};

export async function fetchPatientMedicalHistory(
  patientId: string,
  params?: MedicalHistoryParams,
  signal?: AbortSignal,
) {
  const response = await api.get<MedicalHistoryResponse>(
    `/api/patient/medical-history/${encodeURIComponent(patientId)}`,
    { params, signal },
  );

  return response.data;
}

export async function fetchPatientVisit(
  recordType: string,
  recordId: string,
  signal?: AbortSignal,
) {
  const { data } = await api.get<PatientVisitDetails>(
    `/api/patient/medical-history/${encodeURIComponent(recordType)}/${encodeURIComponent(recordId)}`,
    { signal },
  );
  return data;
}

export async function fetchPatientQueues(signal?: AbortSignal) {
  const { data } = await api.get<PatientQueueResponse>("/api/patient/queues", {
    signal,
  });
  return data;
}

export async function fetchPatientPrescriptions(
  patientId: string,
  consultationId?: string,
) {
  const response = await api.get<PrescriptionsResponse>(
    `/api/patient/prescriptions/${encodeURIComponent(patientId)}`,
    {
      params: consultationId
        ? { consultation_record_id: consultationId }
        : undefined,
    },
  );

  return response.data;
}

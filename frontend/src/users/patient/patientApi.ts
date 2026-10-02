import api from "../../lib/axios";
import type {
  MedicalHistoryResponse,
  PrescriptionsResponse,
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

/**
 * Uses the patient consultation/medical-history route that already exists
 * in the backend workspace.
 *
 * If your working route has a different path, this is the only URL that
 * needs to be changed in the frontend.
 */
export async function fetchPatientMedicalHistory(
  patientId: string,
  params?: MedicalHistoryParams,
) {
  const response = await api.get<MedicalHistoryResponse>(
    `/api/patient/consultations/${patientId}`,
    { params },
  );

  return response.data;
}

export async function fetchPatientPrescriptions(patientId: string) {
  const response = await api.get<PrescriptionsResponse>(
    `/api/patient/prescriptions/${patientId}`,
  );

  return response.data;
}

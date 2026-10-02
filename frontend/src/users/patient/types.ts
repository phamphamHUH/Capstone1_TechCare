export type PatientSessionUser = {
  patient_id?: string;
  user_id?: string;
  username?: string;
  first_name?: string;
  middle_name?: string | null;
  last_name?: string;
  suffix?: string | null;
  sex?: string | null;
  birthdate?: string | null;
  contact_number?: string | null;
  email?: string | null;
  blood_type?: string | null;
  image_url?: string | null;
  profile_photo?: string | null;
  role?: string;
};

export type HistoryRecord = {
  record_type: "consultation" | "laboratory" | string;
  record_id: string;
  service_name: string;
  service_category: string;
  status: string;
  occurred_at: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export type MedicalHistoryResponse = {
  message?: string;
  records: HistoryRecord[];
  pagination: Pagination;
};

export type PrescriptionItem = {
  id?: string | number;
  medication?: string;
  medication_name?: string;
  medicine_name?: string;
  name?: string;
  dosage?: string;
  dose?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
};

export type PrescriptionRecord = {
  prescription_id: string;
  patient_id: string;
  consultation_record_id?: string | null;
  prescriber_id?: string | null;
  prescribed_at: string;
  valid_until?: string | null;
  status: string;
  prescription_items?: PrescriptionItem[] | string | null;
  notes?: string | null;
};

export type PrescriptionsResponse = {
  message?: string;
  prescriptions: PrescriptionRecord[];
};

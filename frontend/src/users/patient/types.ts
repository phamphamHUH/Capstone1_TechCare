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
  room?: string | null;
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
  duration_days?: number | string;
  instructions?: string;
  instruction?: string;
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

export type PatientVisitDetails = {
  record_type: "consultation" | "laboratory";
  service_name: string;
  status: string;
  room?: string | null;
  requested_by?: string | null;
  requested_by_role?: string | null;
  processed_by?: string | null;
  processed_by_role?: string | null;
  occurred_at: string;
  presenting_complaint?: unknown;
  diagnosis?: unknown;
  vital_signs?: unknown;
  physical_examination?: unknown;
  notes?: unknown;
  prescriptions?: PrescriptionRecord[];
  results?: {
    result_id: string;
    results: unknown;
    remarks?: string | null;
    released_at?: string | null;
  }[];
};

export type PatientQueueEntry = {
  queue_id: string;
  queue_number: number;
  service_type: string;
  service_name: string;
  room: string | null;
  status: string;
  now_serving: number[];
  requests_ahead: number;
};

export type PatientQueueResponse = {
  queues: PatientQueueEntry[];
  awaiting_results: number;
  updated_at: string;
};

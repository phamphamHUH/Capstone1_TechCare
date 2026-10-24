export namespace getAllPatients {
  export interface patient {
    id?: number;
    patient_id: string;
    username?: string;
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    suffix?: string | null;
    sex: string;
    email: string;
    address: string;
    contact_number: string;
    civil_status?: string | null;
    blood_type?: string | null;
    birthdate: string;
    emergency_contact_name?: string | null;
    emergency_contact?: string | null;
    image_url?: string | null;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
  }

  export interface response {
    patients: patient[];
    message?: string;
  }

  export interface error {
    error: string;
    message?: string;
  }
}

export namespace getPrintablePatientRecord {
  export interface summary {
    age: number | string;
    sex: string;
    blood_type: string;
    civil_status: string;
    total_visits: number;
    total_lab_requests: number;
    total_billing: string;
    pending_balance: string;
  }

  export interface patientRecord {
    patient: Record<string, unknown>;
    summary: summary;
    visits: Array<{
      queue_id: string;
      service_id: string;
      status: string;
      created_at: string;
      updated_at: string;
    }>;
    labRequests: Array<{
      request_id: string;
      status: string;
      is_paid: boolean;
      requested_at: string;
      updated_at: string;
    }>;
    billing: Array<{
      bill_id: number | string;
      total_amount: string;
      status: string;
      payment_method: string;
      billed_at: string;
    }>;
  }

  export interface response {
    patientRecord: patientRecord;
  }

  export interface error {
    message?: string;
    error?: string;
  }
}

export namespace getAllBilling {
  export interface bill {
    bill_id: number | string;
    patient_id: string;
    services_ids?: number[];
    discount_pct: number | string | null;
    total_amount: number | string | null;
    payment_method: string | null;
    record_type?: "bill" | "laboratory_confirmation";
    request_id?: string;
    status: string;
    receipt_id?: string | null;
    receipt_issued_at?: string | null;
    billed_at?: string;
    created_at?: string;
    [key: string]: unknown;
  }

  export interface response {
    billing: bill[];
    message?: string;
  }

  export interface error {
    error: string;
    message?: string;
  }
}

export namespace getAllQueueEntries {
  export interface queueEntry {
    id: number;
    queue_id: string;
    patient_id: string;
    patient_name: string;
    birthdate: string;
    queue_number: number;
    service_id: string;
    service_name: string;
    service_type: string;
    service_category: string;
    room: string;
    is_priority: boolean;
    status: string;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
  }

  export interface response {
    queueEntries: queueEntry[];
  }

  export interface error {
    message: string;
  }
}

export namespace getAllServices {
  export interface service {
    service_id: string;
    service_name: string;
    price: number | string;
    service_type: string;
    room: string;
    [key: string]: unknown;
  }

  export interface response {
    services: service[];
  }

  export interface error {
    message: string;
  }
}

export namespace getLaboratoryRequest {
  export interface response {
    lab_reqs: Record<string, unknown>[];
    message?: string;
  }

  export interface error {
    error: string;
    message?: string;
  }
}

export namespace getQueueRequests {
  export interface queueRequest {
    request_id: string | null;
    is_paid: boolean;
    request_status: string;
    room: string;
    record_type: "laboratory" | "consultation" | string;
    record_id: string;
    patient_id: string;
    patient_name: string;
    service_id: string;
    service_name: string;
    created_by: string;
    created_at: string;
    [key: string]: unknown;
  }

  export interface response {
    requests: queueRequest[];
  }

  export interface error {
    message: string;
  }
}

export namespace getUnpaidRequests {
  export interface unpaidLabRequest {
    record_type: "laboratory" | string;
    request_id: string;
    patient_id: string;
    patient_name: string;
    is_paid: boolean;
    requested_by: string;
    requester_role: string;
    created_at: string;
    [key: string]: unknown;
  }

  export interface response {
    message: string;
    unpaidLabRequests: unpaidLabRequest[];
  }

  export interface error {
    message: string;
  }
}

export namespace getMedicalHistory {
  export interface query {
    search?: string;
    service_category?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    page?: string;
    limit?: string;
  }

  export interface record {
    record_type: "consultation" | "laboratory" | string;
    record_id: string;
    service_name: string;
    room: string;
    service_category: string;
    status: string;
    occurred_at: string | Date;
    [key: string]: unknown;
  }

  export interface pagination {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  }

  export interface response {
    message: string;
    records: record[];
    pagination: pagination;
  }

  export interface error {
    message: string;
    detail?: string;
  }
}

export namespace getMedicalHistoryDetails {
  export interface laboratoryResult {
    result_id?: number | string;
    results?: unknown;
    remarks?: string | null;
    verified_by?: string | null;
    verified_at?: string | null;
    image_url?: string | null;
    created_at?: string;
    [key: string]: unknown;
  }

  export interface laboratoryResponse {
    message: string;
    record_type: string;
    lab_item_id: string;
    status: string;
    updated_at: string;
    service_name: string;
    room: string | null;
    requested_by: string | null;
    requested_by_role: string | null;
    processed_by: string | null;
    processed_by_role: string | null;
    results: laboratoryResult[];
    [key: string]: unknown;
  }

  export interface prescription {
    prescription_id: string;
    prescription_items: unknown;
    notes: string | null;
    valid_until: string | null;
    prescribed_at: string;
    prescribed_by: string | null;
    [key: string]: unknown;
  }

  export interface consultationResponse {
    message: string;
    record_type: string;
    consultation_record_id: string;
    consultation_type: string;
    diagnosis: string | null;
    notes: string | null;
    consulted_at: string;
    service_name: string;
    room: string | null;
    consulted_by: string | null;
    prescription: prescription[];
    [key: string]: unknown;
  }

  export type response = laboratoryResponse | consultationResponse;

  export interface error {
    message: string;
  }
}

export namespace getMedicalHistoryFull {
  export interface laboratoryResponse {
    message: string;
    record_type: string;
    lab_item_id: string;
    status: string;
    updated_at: string;
    result_value: string | number | null;
    remarks: string | null;
    verified_by: string | null;
    verified_at: string | null;
    service_name: string;
    room: string | null;
    requested_by: string | null;
    requested_by_role: string | null;
    processed_by: string | null;
    processed_by_role: string | null;
    [key: string]: unknown;
  }

  export interface consultationResponse {
    message: string;
    record_type: string;
    consultation_record_id: string;
    consultation_type: string;
    diagnosis: string | null;
    notes: string | null;
    consulted_at: string;
    presenting_complaint: string | null;
    vital_signs: unknown;
    physical_examination: string | null;
    service_name: string;
    room: string | null;
    consulted_by: string | null;
    prescription: getMedicalHistoryDetails.prescription[];
    [key: string]: unknown;
  }

  export type response = laboratoryResponse | consultationResponse;

  export interface error {
    message: string;
  }
}

export namespace getPatientMedicalHistory {
  export interface summary {
    consultations: number;
    labRequests: number;
    labItems: number;
  }

  export interface response {
    patient: Record<string, unknown>;
    consultations: Record<string, unknown>[];
    labRequests: Record<string, unknown>[];
    summary: summary;
  }

  export interface error {
    message: string;
  }
}

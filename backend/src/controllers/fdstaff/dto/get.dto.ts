
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

export namespace getBills {
  export interface bill {
    bill_id: string;
    patient_id: string;
    patient_name: string;
    sex: string | null;
    birthdate: string | null;
    age: number | null;
    is_senior: boolean;
    is_pwd: boolean;
    status: "Pending" | "Paid";
    // NUMERIC columns arrive as strings
    subtotal: string;
    discount_type: string | null;
    discount_amount: string;
    total_amount: string;
    payment_method: string | null;
    reference_num: string | null;
    receipt_id: string | null;
    paid_at: string | null;
    created_at: string;
    services: string[];
    laboratory_status: "No laboratory tests" | "Waiting for payment" | "Needs forwarding" | "Forwarded";
    is_priority: boolean;
  }

  export interface response {
    bills: bill[];
  }

  export interface error {
    message: string;
  }
}

export namespace getBillDetails {
  export interface BillItem {
    line_type?: "consultation" | "laboratory";
    item_id?: string; // consultation_record_id or lab_item_id
    request_id?: string | null;
    service_id?: string;
    service_name: string;
    service_category?: string;
    price: string | number | null; // null: older paid bill with no recorded price
    quantity?: number;
    status?: string;
    created_at?: string;
  }

  export interface response {
    bill: getBills.bill;
    items: BillItem[];
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

  export interface doctor {
    user_id: string | null;
    full_name: string;
    department: string | null;
    role: string | null;
  }

  export interface service {
    service_id: string | null;
    service_name: string | null;
    service_type: string | null;
    room: string | null;
  }

  export interface consultation {
    consultation_record_id: string;
    queue_id: string | null;
    findings: unknown;
    status: string;
    consulted_at: string;
    updated_at: string;
    doctor: doctor;
    visit: {
      queue_id: string | null;
      queue_number: number | null;
      is_priority: boolean | null;
      status: string | null;
      service: service;
    };
  }

  export interface laboratoryResult {
    result_id: string;
    lab_item_id: string;
    result_value: string;
    unit: string | null;
    reference_range: string | null;
    flag: string | null;
    remarks: string | null;
    verified_by: string | null;
    image_url: string | null;
    verified_at: string | null;
    created_at: string;
  }

  export interface laboratoryItem {
    lab_item_id: string;
    request_id: string;
    service_id: string;
    queue_id?: string | null;
    status: string;
    created_at: string;
    updated_at: string;
    service_name: string | null;
    service_type: string | null;
    room: string | null;
    results: laboratoryResult[];
  }

  export interface laboratoryRequest {
    request_id: string;
    consultation_record_id: string | null;
    doctor_id: string | null;
    status: string;
    is_paid: boolean;
    requested_at: string;
    updated_at: string;
    doctor: doctor;
    items: laboratoryItem[];
  }

  export interface response {
    patient: Record<string, unknown>;
    consultations: consultation[];
    labRequests: laboratoryRequest[];
    summary: summary;
  }

  export interface error {
    message: string;
  }
}

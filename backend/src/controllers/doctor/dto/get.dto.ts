export namespace getConsultationRequests {
  export interface queue {
    id?: number;
    queue_id: string;
    patient_id?: string;
    queue_number?: number;
    service_id?: string;
    is_priority?: boolean;
    status?: string;
    created_at?: string;
    updated_at?: string;
    service_name?: string;
    service_type?: string;
    service_category?: string;
    room?: string;
    [key: string]: unknown;
  }

  export type response = queue[];

  export interface error {
    message: string;
    detail?: string;
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
    record_type: "consultation" | "laboratory";
    record_id: string;
    service_name: string;
    room: string | null;
    service_category: string;
    status: string;
    occurred_at: string;
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
    result_id: string;
    result_value: string | number | null;
    unit: string | null;
    reference_range: string | null;
    flag: string | null;
    remarks: string | null;
    verified_by: string | null;
    verified_at: string | null;
    image_url: string | null;
    created_at: string;
  }

  export interface laboratoryResponse {
    message: string;
    record_type: "laboratory";
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
  }

  export interface prescription {
    prescription_id: string;
    prescription_items: unknown;
    notes: string | null;
    valid_until: string | null;
    prescribed_at: string;
    prescribed_by: string | null;
  }

  export interface consultationResponse {
    message: string;
    record_type: "consultation";
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
    prescription: prescription[];
  }

  export type response = laboratoryResponse | consultationResponse;

  export interface error {
    message: string;
  }
}

export namespace getMedicalHistoryFull {
  export interface prescription {
    prescription_id: string;
    prescription_items: unknown;
    notes: string | null;
    valid_until: string | null;
    prescribed_at: string;
    prescribed_by: string | null;
  }

  export interface laboratoryResponse {
    message: string;
    record_type: "laboratory";
    lab_item_id: string;
    status: string;
    updated_at: string;
    results: getMedicalHistoryDetails.laboratoryResult[];
    service_name: string;
    room: string | null;
    requested_by: string | null;
    requested_by_role: string | null;
    processed_by: string | null;
    processed_by_role: string | null;
  }

  export interface consultationResponse {
    message: string;
    record_type: "consultation";
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
    prescription: prescription[];
  }

  export type response = laboratoryResponse | consultationResponse;

  export interface error {
    message: string;
  }
}

export namespace getRoomSpecificServices {
  export interface service {
    service_id: string;
    service_name: string;
    price?: number | string;
    service_type?: string;
    service_category?: string;
    room?: string;
    active?: boolean;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
  }

  export type response = service[] | { message: string };

  export interface error {
    message?: string;
    error?: string;
  }
}

export namespace getConsultationQueueDetails {
  export interface response {
    message: string;
    details: {
      queue_id: string;
      queue_number: number;
      is_priority: boolean;
      queue_status: string;
      queued_at: string;
      consultation_record_id: string;
      consultation_type: string;
      consultation_status: string;
      is_paid: boolean;
      requested_at: string;
      service_id: string;
      service_name: string;
      service_category: string;
      service_type: string;
      room: string;
      price: string; // DECIMAL arrives as a string
      patient_id: string;
      image_url: string | null;
      patient_name: string;
      sex: string;
      birthdate: string;
      age: number;
      is_pwd: boolean;
      is_senior: boolean;
      contact_number: string;
      blood_type: string | null;
      civil_status: string;
      allergies: string | null;
      existing_conditions: string | null;
      current_medications: string | null;
      guardian_name: string | null;
      guardian_relationship: string | null;
      guardian_contact: string | null;
    };
  }

  export interface error {
    message: string;
  }
}

export namespace getAllServices {
  export interface Service {
    id: number;
    service_id: string;
    service_type: string;
    service_name: string;
    service_category: string;
    price: number | string;
    room: string;
    active: boolean;
    created_at: string;
    updated_at: string;
  }

  export interface ServicePackage {
    id: number;
    service_id: string;
    service_name: string;
    service_type: "package";
    service_category: string;
    price: string;
    room: string;
    active: boolean;
    service_ids: string[];
    service_names: string[];
    created_at: string;
    updated_at: string;
  }

  export interface response {
    services: Service[];
    packages: ServicePackage[];
  }

  export interface error {
    message?: string;
    error?: string;
  }
}

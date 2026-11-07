export namespace addLaboratoryRequest {
  export interface body {
    patient_id: string;
    consultation_record_id?: string | null;
    service_ids: string[];
    priority?: string;
    request_date?: string;
    estimated_release_date?: string | null;
    [key: string]: unknown;
  }

  export interface response {
    message: string;
    request: Record<string, unknown>[];
    items: Record<string, unknown>[];
    bill: Record<string, unknown>;
    is_new_bill: boolean;
  }

  export interface error {
    message: string;
    errors?: Record<string, unknown>;
  }
}

export namespace addPrescriptions {
  export interface item {
    medication: string;
    dosage: string;
    frequency: string;
    duration?: string;
    quantity?: number;
    instructions?: string;
    [key: string]: unknown;
  }

  export interface body {
    items: item[];
    valid_until?: string | null;
    notes?: string | null;
  }

  export interface response {
    message: string;
    prescription: Record<string, unknown>;
  }

  export interface error {
    message: string;
  }
}

export namespace addConsultationFindings {
  export interface body {
    patient_id: string;
    service_id?: string;
    consultation_type?: string;
    doctor_id?: string;
    presenting_complaint?: unknown;
    diagnosis?: unknown;
    physical_examination?: unknown;
    [key: string]: unknown;
  }

  export interface response {
    message: string;
    consultation: Record<string, unknown>;
  }

  export interface error {
    message: string;
    errors?: Record<string, unknown>;
  }
}


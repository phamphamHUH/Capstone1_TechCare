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

// POST /api/doctor/test-requests (Test Request page: laboratory, imaging, packages)
export namespace addTestRequest {
  export interface body {
    patient_id: string;
    // The active consultation the tests are ordered from (optional).
    consultation_record_id?: string | null;
    // At least one service or one package.
    services?: { service_id: string }[];
    packages?: { package_id: string }[];
    doctor_id?: string; // outside production only (see resolveDoctorId)
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
  }
}

export namespace addPrescriptions {
  export interface item {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }

  export interface body {
    consultation_record_id: string;
    prescription_items: item[];
    notes?: string | null;
    valid_until?: string | null;
    prescriber_id?: string;
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

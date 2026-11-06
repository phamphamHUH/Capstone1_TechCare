export namespace addPatient {
  export interface body {
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
  }

  export interface patient {
    patient_id: string;
    username: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    suffix: string | null;
    sex: string;
    email: string;
    address: string;
    contact_number: string;
    civil_status: string | null;
    blood_type: string | null;
    birthdate: string;
    emergency_contact_name: string | null;
    emergency_contact: string | null;
    image_url: string | null;
    age?: number | string;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
  }

  export interface response {
    message: string;
    patient: patient;
  }

  export interface error {
    message: string;
  }
}

export namespace addBills {
  export interface customService {
    service_name: string;
    price: number;
  }

  export interface body {
    patient_id: string;
    services_ids?: string[];
    discount_pct?: number;
    discount_amount?: number;
    custom_service?: customService[];
    payment_method?: string;
    status?: string;
  }

  export interface bill {
    bill_id: number;
    patient_id: string;
      services_ids?: string[];
    discount_pct: number | string;
    total_amount: number | string;
    payment_method: string;
    status: string;
    services: Array<{ service_name: string; price: number }>;
    [key: string]: unknown;
  }

  export interface response {
    message: string;
    bill: bill;
  }

  export interface error {
    message: string;
  }
}

export namespace addToQueue {
  export interface body {
    record_type?: string;
    record_id?: string;
    is_priority?: boolean;
  }

  export interface queue {
    id: number;
    queue_id: string;
    patient_id: string;
    service_id: string;
    queue_number: number;
    is_priority: boolean;
    status: string;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
  }

  export interface response {
    message: string;
    queue: queue;
  }

  export interface error {
    message: string;
  }
}

export namespace addLaboratoryRequest {
  export interface serviceItem {
    service_id: string;
    [key: string]: unknown;
  }

  export interface body {
    patient_id: string;
    services: serviceItem[];
  }

  export interface response {
    message: string;
    request: Record<string, unknown>[];
    items: Record<string, unknown>[];
  }

  export interface error {
    message: string;
  }
}

export namespace addConsultationRecord {
  export interface body {
    patient_id: string;
    service_id: string;
    is_priority: boolean;
  }

  export interface response {
    message: string;
    consultation_record: Record<string, unknown>[];
    queue: Record<string, unknown>[];
  }

  export interface error {
    message: string;
  }
}

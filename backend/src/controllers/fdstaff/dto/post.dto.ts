export namespace addPatient {
  export interface body {
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    suffix?: string | null;
    sex: string;
    email: string;
    street: string;
    barangay: string | null;
    city: string | null;
    province: string | null;
    zip_code: string | null;
    contact_number: string;
    height_cm: number | null;
    weight_kg: number | null;
    civil_status: string | null;
    blood_type: string | null;
    birthdate: string;
    guardian_name?: string | null;
    guardian_relationship?: string | null;
    guardian_contact?: string | null;
    allergies?: string | null;
    existing_conditions?: string | null;
    current_medications?: string | null;
    previous_surgeries?: string | null;
    previous_hospitalizations?: string | null;
    family_medical_history?: string | null;
    smoking_status?: string | null;
    alcohol_consumption?: string | null;
  }

  export interface patient {
    patient_id: string;
    username: string;
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    suffix?: string | null;
    sex: string;
    email: string;
    street: string;
    barangay: string | null;
    city: string | null;
    province: string | null;
    zip_code: string | null;
    contact_number: string;
    height_cm: number | null;
    weight_kg: number | null;
    civil_status: string | null;
    blood_type: string | null;
    birthdate: string;
    guardian_name?: string | null;
    guardian_relationship?: string | null;
    guardian_contact?: string | null;
    allergies?: string | null;
    existing_conditions?: string | null;
    current_medications?: string | null;
    previous_surgeries?: string | null;
    previous_hospitalizations?: string | null;
    family_medical_history?: string | null;
    smoking_status?: string | null;
    alcohol_consumption?: string | null;
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
    discount_type?: "Not Eligible" | "Senior Citizen" | "PWD" | "Custom";
    custom_service?: customService[];
    payment_method?: string;
    reference_num?: string;
    status?: string;
  }

  export interface bill {
    bill_id: string;
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
    services?: { service_id: string }[];
    packages?: { package_id: string }[];
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

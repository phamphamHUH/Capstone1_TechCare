export namespace updatePatient {
  export interface body {
    username: string;
    password?: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    suffix?: string;
    sex: string;
    email: string;
    street: string;
    barangay: string;
    city: string;
    province: string;
    zip_code: string;
    contact_number: string;
    civil_status: string;
    blood_type?: string;
    birthdate: string;
    height_cm?: number | null;
    weight_kg?: number | null;
    allergies?: string | null;
    existing_conditions?: string | null;
    current_medications?: string | null;
    previous_surgeries?: string | null;
    previous_hospitalizations?: string | null;
    family_medical_history?: string | null;
    smoking_status?: string | null;
    alcohol_consumption?: string | null;
    guardian_name?: string;
    guardian_relationship?: string;
    guardian_contact?: string;
  }

  export interface patient {
    patient_id: string;
    username?: string;
    first_name?: string;
    middle_name?: string | null;
    last_name?: string;
    suffix?: string | null;
    sex?: string;
    email?: string;
    street?: string;
    barangay?: string;
    city?: string;
    province?: string;
    zip_code?: string;
    contact_number?: string;
    civil_status?: string | null;
    blood_type?: string | null;
    birthdate?: string;
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
    height_cm?: number | null;
    weight_kg?: number | null;
    image_url?: string | null;
    age?: number | string;
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

export namespace serveQueueEntry {
  export interface response {
    message: string;
    existingQueueEntry: Record<string, unknown>[];
    updateQueueBehind: Record<string, unknown>[];
  }

  export interface error {
    message: string;
  }
}

export namespace skipQueueEntry {
  export interface response {
    message: string;
    queue: Record<string, unknown>;
  }

  export interface error {
    message: string;
  }
}

export namespace confirmPayment {
  export interface body {
    payment_method?: "Cash" | "Instapay/QRpH";
    discount_type?: "Not Eligible" | "Senior Citizen" | "PWD";
    amount_received?: number | string | null;
    reference_num?: string | null;
    priority?: boolean;
  }

  export interface response {
    message: string;
    bill: Record<string, unknown>;
    change: number;
    already_paid: boolean;
    queued: boolean; // false: payment is safe, forwarding can be retried
    has_laboratory_items: boolean;
  }

  export interface error {
    message: string;
  }
}

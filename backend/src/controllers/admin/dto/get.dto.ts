export namespace getAllUsers {
  export interface user {
    id: number;
    user_id: string;
    username: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    suffix: string | null;
    sex: string;
    email: string;
    contact_number: string;
    emergency_contact_name: string | null;
    emergency_contact: string | null;
    address: string;
    birthdate: string;
    role: string;
    department: string | null;
    employment_status: string | null;
    date_hired: string;
    shift_start: string;
    shift_end: string;
    last_login: string | null;
    account_status: boolean;
    profile_photo: string | null;
    active: boolean;
    created_at: string;
    updated_at: string;
  }

  export interface response {
    users: user[];
  }

  export interface error {
    message?: string;
    error?: string;
  }
}

// =========================
// GET ALL ACTIVITIES
// =========================
export namespace getAllActivities {
  export interface activity {
    id: number;
    user_id: string;
    action_name: string;
    action_description: string | null;
    module: string;
    is_sensitive: boolean;
    status: string;
    target_type: string | null;
    target_id: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }

  export interface response {
    activities: activity[];
    message?: string;
  }

  export interface error {
    message?: string;
    error?: string;
  }
}

// =========================
// GET ALL SERVICES
// =========================
export namespace getAllservices {
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

// =========================
// GET MY ACTIVITIES
// =========================
export namespace getMyActivities {
  export interface activity {
    id: number;
    activity_id: string;
    user_id: string;
    service_name: string;
    details: Record<string, unknown>;
    created_at: string;
  }

  export interface response {
    activities: activity[];
    message?: string;
  }

  export interface error {
    message?: string;
    error?: string;
  }
}

// =========================
// GET ALL FORM TEMPLATES
// =========================
export namespace getAllFormTemplates {
  export interface query {
    service_id?: string;
    status?: string;
  }

  export interface template {
    id: number;
    form_id: string;
    form_name: string;
    form_description: string | null;
    service_id: string;
    status: string;
    created_by: string;
    version: number;
    created_at: string;
    updated_at: string;
  }

  export interface response {
    message: string;
    formTemplates: template[];
  }

  export interface error {
    message?: string;
    error?: string;
  }
}

// =========================
// GET FORM TEMPLATE BY ID
// =========================
export namespace getFormTemplateById {
  export interface template {
    id: number;
    form_id: string;
    form_name: string;
    form_description: string | null;
    service_id: string;
    status: string;
    created_by: string;
    version: number;
    created_at: string;
    updated_at: string;
  }

  export interface component {
    id: number;
    form_component_id: string;
    form_id: string;
    type_id: string;
    label: string;
    field_key: string;
    display_order: number;
    settings: Record<string, unknown> | null;
    validation: Record<string, unknown> | null;
  }

  export interface response {
    message: string;
    formTemplate: template;
    components: component[];
  }

  export interface error {
    message?: string;
    error?: string;
  }
}

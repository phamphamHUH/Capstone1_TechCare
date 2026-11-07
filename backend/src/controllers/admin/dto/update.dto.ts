export namespace updateUser {
  export interface body {
    username?: string;
    password?: string;
    first_name?: string;
    middle_name?: string | null;
    last_name?: string;
    suffix?: string | null;
    sex?: string;
    email?: string;
    contact_number?: string;
    emergency_contact_name?: string | null;
    emergency_contact?: string | null;
    address?: string;
    birthdate?: string;
    role?: string;
    department?: string | null;
    employment_status?: string | null;
    date_hired?: string;
    shift_start?: string;
    shift_end?: string;
  }

  export interface user {
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
    date_hired: string | null;
    shift_start: string | null;
    shift_end: string | null;
    profile_photo: string | null;
    account_status: boolean;
    created_at: string;
    updated_at: string;
  }

  export interface response {
    message: string;
    user: user;
  }

  export interface error {
    message: string;
  }
}

export namespace updateUserStatus {
  export interface body {
    account_status: boolean;
  }

  export interface updatedAccountStatus {
    user_id: string;
    first_name: string;
    last_name: string;
    middle_name: string | null;
    role: string;
    account_status: boolean;
  }

  export interface response {
    message: string;
    updatedAccountStatus: updatedAccountStatus[];
  }

  export interface error {
    message: string;
  }
}

export namespace updateFormTemplate {
  export interface component {
    form_component_id?: string;
    form_id?: string;
    type_id: string;
    label: string;
    field_key: string;
    display_order: number;
    settings?: Record<string, unknown> | null;
    validation?: Record<string, unknown> | null;
    [key: string]: unknown;
  }

  export interface body {
    form_name: string;
    form_description?: string | null;
    service_id?: string;
    status?: string;
    form_components: component[];
  }

  export interface template {
    form_id: string;
    form_name: string;
    form_description: string | null;
    service_id: string;
    status: string;
    version: number;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
  }

  export interface response {
    message: string;
    formUpdated: template;
    componentsUpdated: component[];
  }

  export interface error {
    message: string;
  }
}

export namespace updateService {
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
    message: string;
    service: Service | ServicePackage;
  }

  export interface error {
    message: string;
  }
}

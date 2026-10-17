export namespace updateUser {
  export interface params {
    user_id: string;
  }

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
    message: string;
    user: user;
  }

  export interface error {
    message: string;
  }
}

export namespace updateUserStatus {
  export interface params {
    user_id: string;
  }

  export interface body {
    account_status: boolean;
  }

  export interface updatedAccount {
    user_id: string;
    first_name: string;
    last_name: string;
    middle_name: string | null;
    role: string;
    account_status: boolean;
  }

  export interface response {
    message: string;
    updatedAccountStatus: updatedAccount[];
  }

  export interface error {
    message: string;
  }
}

export namespace updateFormTemplate {
  export interface params {
    form_id: string;
  }

  export interface componentBody {
    type_id: string;
    label: string;
    field_key: string;
    display_order: number;
    settings?: Record<string, unknown> | null;
    validation?: Record<string, unknown> | null;
  }

  export interface body {
    form_name: string;
    form_description?: string | null;
    service_id: string;
    status: string;
    form_components: componentBody[];
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
    formUpdated: template;
    componentsUpdated: component[];
  }

  export interface error {
    message: string;
  }
}
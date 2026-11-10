
export namespace login {
  export type accountType = "user" | "patient";

  export interface body {
    username: string;
    password: string;
  }

  export interface account {
    id?: number;
    user_id?: string;
    patient_id?: string;
    username: string;
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
    last_login?: string | null;
    account_status?: boolean;
    active?: boolean;
    profile_photo?: string | null;
    civil_status?: string | null;
    blood_type?: string | null;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
  }

  export interface response {
    message: string;
    accountType: accountType;
    user: Omit<account, "password_hash">;
    token: string;
    refreshToken: string;
  }

  export interface error {
    message?: string;
    error?: string;
  }
}

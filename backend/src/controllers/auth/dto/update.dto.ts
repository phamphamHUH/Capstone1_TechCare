
export namespace logout {
  export interface body {
    user_id?: string;
  }

  export interface response {
    message: string;
  }

  export interface error {
    message: string;
  }
}

export namespace updateMyAccount {
  export type theme = "light" | "dark" | "system";

  // multipart/form-data: optional "image" file + optional theme field.
  export interface body {
    theme?: theme;
  }

  export interface response {
    message: string;
    user: Record<string, unknown>;
  }

  export interface error {
    message: string;
  }
}


export namespace deleteTemplate {
  export interface params {
    form_id: string;
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
    template: template;
  }

  export interface error {
    message: string;
  }
}

export namespace saveLaboratoryResult {
  export interface resultItem {
    name?: string;
    result?: string | number;
    [key: string]: unknown;
  }

  export interface body {
    results: resultItem[];
    remarks?: string | null;
    image_url?: string | null;
    room: string;
  }

  export interface laboratoryResult {
    result_id: string;
    item_id: string;
    results: unknown;
    remarks: string | null;
    image_url: string | null;
    status?: string;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
  }

  export interface response {
    message: string;
    result: laboratoryResult;
  }

  export interface error {
    message: string;
  }
}

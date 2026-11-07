export interface Service {
  id: number;
  service_id: string;
  service_name: string;
  price: number;
  active: boolean;
  service_type: string;
  room: string;
  service_category: string;
  created_at: string;
  updated_at: string;
  service_ids?: string[];
}

export type SortOrder = "newest" | "oldest" | "a-z" | "z-a";

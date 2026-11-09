export type HistoryRecord = {
  record_type: "consultation" | "laboratory";
  record_id: string;
  service_name: string;
  room: string;
  service_category: string;
  status: string;
  occurred_at: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export type Result = {
  key: string;
  records: HistoryRecord[];
  pagination: Pagination | null;
  error: string | null;
};

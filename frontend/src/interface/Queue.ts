
export interface Queue {
  id: number;
  queue_id: string;
  patient_id: string;
  patient_name?: string;
  queue_number: number;
  service_id: string;
  is_priority: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface QueueEntry {
  id: number;
  queue_id: string;
  patient_id: string;
  patient_name: string;
  birthdate: string;
  queue_number: number;
  service_id: string;
  service_name: string;
  service_type: string;
  service_category: string;
  room: string;
  is_priority: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface QueueRequests {
  request_id?: string;
  is_paid?: boolean;
  request_status?: string;
  room?: string;
  record_type: "laboratory" | "consultation";
  record_id: string;
  patient_id: string;
  patient_name: string;
  service_id: string;
  service_name: string;
  created_by: string;
  created_at: string;
}

export type QueueStatistics = {
  totalQueue: number;
  priorityQueue: number;
  waiting: number;
  inService: number;
  completedToday: number;
};

export type QueueTab = "all" | "laboratory" | "consultation";
export type PriorityFilter = "all" | "yes" | "none";

// The state of the live connection to the backend.
export type QueueStreamStatus =
  | "connecting"
  | "live"
  | "reconnecting"
  | "unauthorized";

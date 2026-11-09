export interface Queue {
  id: number;
  queue_id: string;
  patient_id: string;
  patient_name?: string;
  queue_number: number;
  service_id: string;
  is_priority: boolean;
  skip_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface QueueEntry {
  id: number;
  queue_id: string;
  consultation_record_id: string;
  consultation_type: string;
  patient_id: string;
  patient_name: string;
  birthdate: string;
  contact_number: string;
  sex: string;
  image_url: string;
  is_pwd: boolean;
  queue_number: number;
  service_id: string;
  service_name: string;
  service_type: string;
  service_category: string;
  room: string;
  is_priority: boolean;
  skip_count: number;
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

// Which stat card is selected on the Queues page ("all" = none selected).
export type QueueStatFilter =
  | "all"
  | "active"
  | "priority"
  | "waiting"
  | "in-service"
  | "completed-today";

// The state of the live connection to the backend.
export type QueueStreamStatus =
  | "connecting"
  | "live"
  | "reconnecting"
  | "unauthorized";

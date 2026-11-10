// Queue notification for doctors, laboratory staff and patients.
// Staff: /api/notifications, patients: /api/patient/notifications.
// Each person keeps at most 10.
export type NotificationType =
  | "priority-patient" // staff: a priority patient joined their queue
  | "cancellation" // staff + patient: a queue entry was cancelled
  | "queued" // patient: added to a queue
  | "called" // patient: it's their turn
  | "skipped"; // patient: they were skipped

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  message: string | null;
  created_at: string;
  is_read: boolean;
}

// The state of the live connection to the backend (same as QueueStreamStatus).
export type NotificationStreamStatus =
  | "connecting"
  | "live"
  | "reconnecting"
  | "unauthorized";

export interface NotificationsResponse {
  notifications: AppNotification[];
  unread_count: number;
}

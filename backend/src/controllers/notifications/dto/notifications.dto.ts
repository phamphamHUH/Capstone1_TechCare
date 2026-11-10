// =========================
// NOTIFICATIONS (queue only; doctors, laboratory staff and patients)
// Staff:   /api/notifications/...          (authMiddleware)
// Patient: /api/patient/notifications/...  (patientMiddleware)
// Each person keeps at most 10; everyone only sees their own.
// =========================

export interface notification {
  id: number;
  type: "priority-patient" | "cancellation" | "queued" | "called" | "skipped";
  title: string;
  message: string | null;
  created_at: string;
  is_read: boolean;
}

// GET .../notifications
export namespace getNotifications {
  export interface response {
    notifications: notification[];
    unread_count: number;
  }

  export interface error {
    message: string;
  }
}

// PATCH .../notifications/:id/read
// PATCH .../notifications/read-all
export namespace markNotificationsRead {
  export interface response {
    message: string;
  }

  export interface error {
    message: string;
  }
}

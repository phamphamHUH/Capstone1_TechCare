export type Activity = {
  id: number | null;
  user_id: string;
  action_name: string;
  action_description: string;
  module: string;
  is_sensitive: boolean;
  status: string;
  target_type: string;
  target_id: string;
  // JSONB column: an object from the API (plain text on some older rows).
  metadata: Record<string, unknown> | string | null;
  created_at: string;
};

export type ActivityStatistics = {
  totalActivities: number;
  activeUsers: number;
  inactiveUsers: number;
  criticalActions: number;
  todayActivities: number;
};

export type ActivityTab = "all" | "user" | "patient";
export type SortOrder = "newest" | "oldest";
export type SeverityFilter = "all" | "critical" | "low";

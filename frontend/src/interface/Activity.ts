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
  metadata: string;
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

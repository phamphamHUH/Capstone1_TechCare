import LoadingScreen from "../../../components/LoadingScreen";
import ErrorMessage from "../../../components/ErrorMessage";
import { useEffect, useState } from "react";
import ActivityDetails from "../components/ActivityMonitoring/ActivityDetails";
import ActivityTable from "../components/ActivityMonitoring/ActivityTable";
import {
  type ActivityTab,
  type Activity,
  type ActivityStatistics,
  type SortOrder,
  type SeverityFilter,
} from "../../../interface/Activity";

import ActivityStats from "../components/ActivityMonitoring/ActivityStats";
import ActivityTabs from "../components/ActivityMonitoring/ActivityTabs";
import ActivityFilters from "../components/ActivityMonitoring/ActivityFilters";

type ActivityMonitoringModalProps = {
  activities: Activity[];
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadData: () => Promise<void>;
  loading: boolean;
  error?: string;
};

function ActivityMonitoring({
  activities,
  loadData,
  loading,
  error,
}: ActivityMonitoringModalProps) {
  useEffect(() => {
    loadData();
  }, [loadData]);

  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const [showActivityDetails, setShowActivityDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<ActivityTab>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [severity, setSeverity] = useState<SeverityFilter>("all");

  const selectedActivity = activities.find(
    (activity) => activity.id === selectedFormId,
  );

  const getActivityStats = (): ActivityStatistics => {
    const today = new Date();

    const todayActivities = activities.filter((activity) => {
      const activityDate = new Date(activity.created_at);

      return (
        activityDate.getFullYear() === today.getFullYear() &&
        activityDate.getMonth() === today.getMonth() &&
        activityDate.getDate() === today.getDate()
      );
    }).length;

    const activeUsers = 10;
    const inactiveUsers = 12;

    const criticalActions = activities.filter((activity) => {
      return activity.is_sensitive === true;
    }).length;

    return {
      totalActivities: activities.length,
      activeUsers: activeUsers,
      inactiveUsers: inactiveUsers,
      criticalActions,
      todayActivities,
    };
  };

  const stats = getActivityStats();

  const moduleOptions = Array.from(
    new Set(activities.map((activity) => activity.module)),
  ).filter(Boolean);

  const filteredActivities = activities
    .filter((activity) => {
      // Search
      const searchText = search.toLowerCase();

      const matchesSearch =
        activity.action_name.toLowerCase().includes(searchText) ||
        String(activity.user_id).includes(searchText) ||
        activity.module.toLowerCase().includes(searchText);

      // Module
      const matchesModule =
        moduleFilter === "all" || activity.module === moduleFilter;

      // Severity
      const matchesSeverity =
        severity === "all" ||
        (severity === "critical" && activity.is_sensitive === true) ||
        (severity === "low" && activity.is_sensitive === false);

      return matchesSearch && matchesModule && matchesSeverity;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();

      return sort === "newest" ? dateB - dateA : dateA - dateB;
    });

  if (loading && activities.length === 0) {
    return <LoadingScreen variant="page" message="Loading activity logs..." />;
  }

  return (
    <main className="flex-1 min-w-0">
      <div className="mx-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-bold text-3xl">Activity Logs</h1>
            <h3 className="font-light">Track Activities</h3>
          </div>
        </div>
        {error && <ErrorMessage className="mb-5">{error}</ErrorMessage>}
        <div>
          <ActivityStats stats={stats} />
        </div>
        <ActivityTabs activeTab={activeTab} onChange={setActiveTab} />
        <ActivityFilters
          search={search}
          setSearch={setSearch}
          sort={sort}
          setSort={setSort}
          moduleFilter={moduleFilter}
          setModuleFilter={setModuleFilter}
          moduleOptions={moduleOptions}
          severity={severity}
          setSeverity={setSeverity}
        />
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="min-w-0 flex-1">
            <ActivityTable
              activities={filteredActivities}
              error={error}
              selectedActivityId={selectedFormId}
              setSelectedForm={setSelectedFormId}
              setShowActivityDetails={setShowActivityDetails}
            />
          </div>
          <ActivityDetails activity={selectedActivity} />
        </div>
      </div>
    </main>
  );
}

export default ActivityMonitoring;

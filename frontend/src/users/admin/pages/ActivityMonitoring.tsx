import Header from "../../../components/Header";
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

type ActivityModalProps = {
  activities: Activity[];
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadData: () => Promise<void>;
  loading: boolean;
};

function ActivityMonitoring({
  activities,
  open,
  setOpen,
  loadData,
  loading,
}: ActivityModalProps) {
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

  return (
    <main className="flex-1 min-w-0">
      <Header
        loading={loading}
        open={open}
        setOpen={setOpen}
        loadData={loadData}
        page="Activity Monitoring"
      />
      <div className="mx-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-bold text-3xl">Activity Logs</h1>
            <h3 className="font-light">Track Activities</h3>
          </div>
        </div>
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

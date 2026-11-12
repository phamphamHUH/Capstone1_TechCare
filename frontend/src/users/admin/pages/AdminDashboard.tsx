import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, UserRound, Users } from "lucide-react";
import api from "../../../lib/axios";
import ErrorMessage from "../../../components/ErrorMessage";
import { connectQueueStream } from "../../../services/queue-sse/connectQueueStream";
import type { Activity } from "../../../interface/Activity";
import type { QueueEntry } from "../../../interface/Queue";
import type { Service } from "../../../interface/Service";
import type { User } from "../../../interface/User";
import StatTile from "../components/StatTile";
import DashboardCard from "../components/Dashboard/DashboardCard";
import RoomQueues from "../components/Dashboard/RoomQueues";
import RecentActivity from "../components/Dashboard/RecentActivity";
import StaffSummary from "../components/Dashboard/StaffSummary";
import ServiceSummary from "../components/Dashboard/ServiceSummary";
import {
  activeStaff,
  fullName,
  groupByRoom,
  isWaiting,
  statusOf,
} from "../components/Dashboard/utils/dashboardSummary";

type AdminDashboardProps = {
  users: User[];
  services: Service[];
  activities: Activity[];
  loading: boolean;
  errors: { users: boolean; services: boolean; activities: boolean };
  setPage: (page: string) => void;
};

const iconProps = { size: 20, strokeWidth: 1.5 };

// Admin home: what is happening in the clinic today and what needs attention.
// Money reports live on the Reports page.
function AdminDashboard({
  users,
  services,
  activities,
  loading,
  errors,
  setPage,
}: AdminDashboardProps) {
  const [queues, setQueues] = useState<QueueEntry[]>([]);
  const [queuesLoaded, setQueuesLoaded] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const loadQueues = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const response = await api.get("/api/admin/queues");
      if (request !== latestRequest.current) return;
      setQueues(Array.isArray(response.data?.queueEntries) ? response.data.queueEntries : []);
      setQueueError(null);
    } catch (error) {
      if (request !== latestRequest.current) return;
      console.error("Error loading queues:", error);
      setQueueError("Today's queues could not be loaded.");
    } finally {
      if (request === latestRequest.current) setQueuesLoaded(true);
    }
  }, []);

  // Load once, then refresh whenever the queue changes. The stream's first
  // ("initial") message right after connecting is skipped: we just loaded.
  useEffect(() => {
    async function loadFirst() {
      await loadQueues();
    }
    loadFirst();
    let skippedInitial = false;
    return connectQueueStream({
      onQueueChanged: () => {
        if (!skippedInitial) {
          skippedInitial = true;
          return;
        }
        return loadQueues();
      },
    });
  }, [loadQueues]);

  const waiting = queues.filter(isWaiting).length;
  const serving = queues.filter((entry) => statusOf(entry) === "serving").length;
  const completed = queues.filter((entry) => statusOf(entry) === "completed").length;
  const staff = activeStaff(users);
  const online = staff.filter((user) => user.active).length;

  const names = new Map(users.map((user) => [user.user_id, fullName(user)]));
  const nameOf = (userId: string) => names.get(userId) || userId || "System";

  // "…" until the first answer arrives, "—" if it failed.
  const queueValue = (value: number) =>
    !queuesLoaded ? "…" : queueError ? "—" : String(value);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6 px-4 sm:px-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Today at the Clinic</h1>
        <p className="mt-1 text-sm text-gray-500">{today}</p>
      </div>

      {queueError && <ErrorMessage>{queueError}</ErrorMessage>}

      {/* Need-to-know numbers: 2 columns on phones, 4 on large screens */}
      <section className="overflow-hidden rounded-md border border-gray-300 bg-white">
        <div className="grid grid-cols-2 gap-px bg-gray-300 lg:grid-cols-4">
          <StatTile
            icon={<Clock {...iconProps} />}
            label="Waiting Now"
            value={queueValue(waiting)}
            caption="Patients in line"
            onClick={() => setPage("queueing-monitor")}
          />
          <StatTile
            icon={<UserRound {...iconProps} />}
            label="Being Served"
            value={queueValue(serving)}
            caption="In a room right now"
            onClick={() => setPage("queueing-monitor")}
          />
          <StatTile
            icon={<CheckCircle2 {...iconProps} />}
            label="Done Today"
            value={queueValue(completed)}
            caption="Consultations and lab visits"
            onClick={() => setPage("queueing-monitor")}
          />
          <StatTile
            icon={<Users {...iconProps} />}
            label="Staff Online"
            value={loading && users.length === 0 ? "…" : String(online)}
            caption={`Of ${staff.length} active accounts`}
            onClick={() => setPage("user-management")}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardCard
          title="Queues Today"
          subtitle="Per room"
          actionLabel="Open monitor"
          onAction={() => setPage("queueing-monitor")}
        >
          <RoomQueues rooms={groupByRoom(queues)} loadFailed={Boolean(queueError)} />
        </DashboardCard>

        <DashboardCard
          title="Recent Activity"
          subtitle="What staff did last"
          actionLabel="View all"
          onAction={() => setPage("activity-monitoring")}
        >
          <RecentActivity
            activities={activities}
            nameOf={nameOf}
            loadFailed={errors.activities}
          />
        </DashboardCard>

        <DashboardCard
          title="Staff"
          subtitle="Signed in now, by role"
          actionLabel="Manage users"
          onAction={() => setPage("user-management")}
        >
          <StaffSummary users={users} loadFailed={errors.users} />
        </DashboardCard>

        <DashboardCard
          title="Services"
          subtitle="Offered by the clinic"
          actionLabel="Manage services"
          onAction={() => setPage("service-management")}
        >
          <ServiceSummary services={services} loadFailed={errors.services} />
        </DashboardCard>
      </div>
    </div>
  );
}

export default AdminDashboard;

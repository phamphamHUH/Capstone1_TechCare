import LoadingScreen from "../../../components/LoadingScreen";
import ErrorMessage from "../../../components/ErrorMessage";
import { Users, Clock, List, Receipt, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import type { Patient } from "../../../interface/Patient";
import type { Bill } from "../../../interface/Billing";
import type { QueueEntry } from "../../../interface/Queue";

type FrontdeskDashboardProps = {
  bills: Bill[];
  loading: boolean;
  patients: Patient[];
  queues: QueueEntry[];
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadData: () => Promise<void>;
  setPage: (page: string) => void;
  error?: string;
};

type StatCardProps = {
  label: string;
  value: number;
  caption: string;
  icon?: ReactNode;
  onClick: () => void;
};

// One clickable stat tile. Clicking it opens the related page.
function StatCard({ label, value, caption, icon, onClick }: StatCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group p-6 text-left cursor-pointer transition-colors hover:bg-sky-50 active:bg-sky-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky-500"
    >
      <div className="flex items-center gap-3">
        {icon}
        <p className="text-sm text-gray-500">{label}</p>
        <ChevronRight
          size={16}
          strokeWidth={1.5}
          className="ml-auto text-gray-400 opacity-0 transition-opacity group-hover:opacity-100"
        />
      </div>

      <p className={`text-3xl font-semibold ${icon ? "mt-4" : "mt-2"}`}>
        {value}
      </p>

      <p className={`text-sm text-gray-400 ${icon ? "mt-2" : "mt-3"}`}>
        {caption}
      </p>
    </button>
  );
}

function FrontdeskDashboard({
  bills,
  patients,
  queues,
  setPage,
  loading,
  error,
}: FrontdeskDashboardProps) {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  });

  const statusOf = (queue: QueueEntry) => queue.status.toLowerCase();

  const waitingCount = queues.filter(
    (queue) => statusOf(queue) === "waiting",
  ).length;

  const inProgressCount = queues.filter((queue) =>
    ["in progress", "in service", "serving"].includes(statusOf(queue)),
  ).length;

  const completedCount = queues.filter(
    (queue) => statusOf(queue) === "completed",
  ).length;

  const cancelledCount = queues.filter(
    (queue) => statusOf(queue) === "cancelled",
  ).length;

  const registeredToday = patients.filter(
    (patient) =>
      patient.created_at &&
      new Date(patient.created_at).toLocaleDateString("en-CA", {
        timeZone: "Asia/Manila",
      }) === today,
  ).length;

  const totalQueue = queues.length;

  const pendingBills = bills.filter((bill) => bill.status === "Pending").length;

  const goToQueues = () => setPage("queues");

  if (loading && !patients.length && !bills.length && !queues.length) {
    return <LoadingScreen variant="page" message="Loading dashboard..." />;
  }

  return (
    <main className="flex-1 min-w-0">
      <div className="space-y-6 px-6">
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {/* =========================
                    FRONTDESK SUMMARY
                ========================== */}
        <section className="bg-white border border-gray-300 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-300">
            <StatCard
              icon={<Clock size={20} strokeWidth={1.5} />}
              label="Patients in Queue"
              value={waitingCount}
              caption="Currently waiting"
              onClick={goToQueues}
            />
            <StatCard
              icon={<Users size={20} strokeWidth={1.5} />}
              label="Registered Today"
              value={registeredToday}
              caption="New patients today"
              onClick={() => setPage("patient-records")}
            />
            <StatCard
              icon={<List size={20} strokeWidth={1.5} />}
              label="Total Queue"
              value={totalQueue}
              caption="Today's queue records"
              onClick={goToQueues}
            />
            <StatCard
              icon={<Receipt size={20} strokeWidth={1.5} />}
              label="Pending Bills"
              value={pendingBills}
              caption="Unpaid bills"
              onClick={() => setPage("billing")}
            />
          </div>
        </section>

        {/* =========================
                    QUEUE STATUS OVERVIEW
                ========================== */}
        <section className="bg-white border border-gray-300 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-300">
            <div className="flex items-center gap-3">
              <List size={20} strokeWidth={1.5} />

              <div>
                <h2 className="text-lg font-semibold">Queue Status Overview</h2>

                <p className="text-sm text-gray-500 mt-1">
                  Current status of today's patient queue
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-300">
            <StatCard
              label="Waiting"
              value={waitingCount}
              caption="Patients waiting for service"
              onClick={goToQueues}
            />
            <StatCard
              label="In Progress"
              value={inProgressCount}
              caption="Currently being served"
              onClick={goToQueues}
            />
            <StatCard
              label="Completed"
              value={completedCount}
              caption="Completed queue records"
              onClick={goToQueues}
            />
            <StatCard
              label="Cancelled"
              value={cancelledCount}
              caption="Cancelled queue records"
              onClick={goToQueues}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

export default FrontdeskDashboard;

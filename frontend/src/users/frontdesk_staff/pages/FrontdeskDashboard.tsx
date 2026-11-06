import { Users, Clock, List, Receipt } from "lucide-react";
import type { Patient } from "../../../interface/Patient";
import type { BillingRecord } from "../../../interface/Billing";
import type { QueueEntry } from "../../../interface/Queue";

type FrontdeskDashboardProps = {
  billing: BillingRecord[];
  unpaidRequestCount?: number;
  loading: boolean;
  patients: Patient[];
  queues: QueueEntry[];
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadData: () => Promise<void>;
};

function FrontdeskDashboard({
  billing,
  unpaidRequestCount = 0,
  patients,
  queues,
  open,
  setOpen,
  loadData,
  loading,
}: FrontdeskDashboardProps) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

  const patientsInQueue = queues.filter(
    (queue) => queue.status.toLowerCase() === "waiting",
  ).length;

  const registeredToday = patients.filter(
    (patient) => patient.created_at && new Date(patient.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }) === today,
  ).length;

  const totalQueue = queues.length;

  const pendingBills = billing.filter(
    (bill) => ["unpaid", "pending"].includes(bill.status.toLowerCase()),
  ).length + unpaidRequestCount;

  return (
    <main className="flex-1 min-w-0">

      <div className="space-y-6 px-6">
        {/* =========================
                    FRONTDESK SUMMARY
                ========================== */}
        <section className="bg-white border border-gray-300 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-300">
            {/* Patients in Queue */}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock size={20} strokeWidth={1.5} />

                <p className="text-sm text-gray-500">Patients in Queue</p>
              </div>

              <p className="text-3xl font-semibold">{patientsInQueue}</p>

              <p className="text-sm text-gray-400 mt-2">Currently waiting</p>
            </div>

            {/* Registered Today */}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Users size={20} strokeWidth={1.5} />

                <p className="text-sm text-gray-500">Registered Today</p>
              </div>

              <p className="text-3xl font-semibold">{registeredToday}</p>

              <p className="text-sm text-gray-400 mt-2">New patients today</p>
            </div>

            {/* Total Queue */}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <List size={20} strokeWidth={1.5} />

                <p className="text-sm text-gray-500">Total Queue</p>
              </div>

              <p className="text-3xl font-semibold">{totalQueue}</p>

              <p className="text-sm text-gray-400 mt-2">
                Today's queue records
              </p>
            </div>

            {/* Pending Bills */}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Receipt size={20} strokeWidth={1.5} />

                <p className="text-sm text-gray-500">Pending Bills</p>
              </div>

              <p className="text-3xl font-semibold">{pendingBills}</p>

              <p className="text-sm text-gray-400 mt-2">Unpaid bills</p>
            </div>
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
            {/* Waiting */}
            <div className="p-6">
              <p className="text-sm text-gray-500">Waiting</p>

              <p className="text-3xl font-semibold mt-2">
                {
                  queues.filter(
                    (queue) => queue.status.toLowerCase() === "waiting",
                  ).length
                }
              </p>

              <p className="text-sm text-gray-400 mt-3">
                Patients waiting for service
              </p>
            </div>

            {/* In Progress */}
            <div className="p-6">
              <p className="text-sm text-gray-500">In Progress</p>

              <p className="text-3xl font-semibold mt-2">
                {
                  queues.filter(
                    (queue) => ["in progress", "in service", "serving"].includes(queue.status.toLowerCase()),
                  ).length
                }
              </p>

              <p className="text-sm text-gray-400 mt-3">
                Currently being served
              </p>
            </div>

            {/* Completed */}
            <div className="p-6">
              <p className="text-sm text-gray-500">Completed</p>

              <p className="text-3xl font-semibold mt-2">
                {
                  queues.filter(
                    (queue) => queue.status.toLowerCase() === "completed",
                  ).length
                }
              </p>

              <p className="text-sm text-gray-400 mt-3">
                Completed queue records
              </p>
            </div>

            {/* Cancelled */}
            <div className="p-6">
              <p className="text-sm text-gray-500">Cancelled</p>

              <p className="text-3xl font-semibold mt-2">
                {
                  queues.filter(
                    (queue) => queue.status.toLowerCase() === "cancelled",
                  ).length
                }
              </p>

              <p className="text-sm text-gray-400 mt-3">
                Cancelled queue records
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default FrontdeskDashboard;

import { useCallback } from "react";
import { ClipboardList, FileCheck } from "lucide-react";
import Header from "#components/Header";
import QueueDashboard from "../../../components/QueueDashboard";
import type { QueueEntry } from "../../../interface/Queue";

type LaboratoryDashboardProps = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadData: (background?: boolean) => Promise<void>;
  loading: boolean;
  error?: string | null;
  room: string;
  queues: QueueEntry[];
  serviceCount: number;
  queueLoadFailed: boolean;
  setPage: (page: string) => void;
};

const LINKS = [
  {
    page: "laboratory-requests",
    title: "Laboratory Requests",
    description: "Accept, complete or skip patients in the laboratory queue.",
    icon: <ClipboardList size={22} />,
  },
  {
    page: "laboratory-results",
    title: "Laboratory Results",
    description: "Enter, review, print and release laboratory results.",
    icon: <FileCheck size={22} />,
  },
];

function LabstaffDashboard({
  open,
  setOpen,
  loadData,
  loading,
  error,
  room,
  queues,
  serviceCount,
  queueLoadFailed,
  setPage,
}: LaboratoryDashboardProps) {
  // Live updates refresh quietly in the background.
  const refreshInBackground = useCallback(() => loadData(true), [loadData]);

  return (
    <main className="flex-1 min-w-0 border-gray-300">
      <QueueDashboard
        roomLabel={room}
        queueLabel="laboratory request"
        queues={queues}
        serviceCount={serviceCount}
        loading={loading}
        error={error}
        queueLoadFailed={queueLoadFailed}
        queuePage="laboratory-requests"
        links={LINKS}
        setPage={setPage}
        onQueueChanged={refreshInBackground}
      />
    </main>
  );
}
export default LabstaffDashboard;

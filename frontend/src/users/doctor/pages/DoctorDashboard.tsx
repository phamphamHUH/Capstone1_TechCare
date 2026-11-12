import { FileText, ListOrdered, Stethoscope } from "lucide-react";
import QueueDashboard from "../../../components/QueueDashboard";
import type { QueueEntry } from "../../../interface/Queue";

type DoctorDashboardProps = {
  room: string;
  queues: QueueEntry[];
  serviceCount: number;
  loading: boolean;
  error: string | null;
  queueLoadFailed: boolean;
  setPage: (page: string) => void;
  loadData: () => Promise<void>;
};

const LINKS = [
  {
    page: "consultation-queue",
    title: "Consultation Queue",
    description: "Accept, skip or cancel patients waiting for consultation.",
    icon: <ListOrdered size={22} />,
  },
  {
    page: "active-consultation",
    title: "Active Consultation",
    description: "Record findings, prescriptions and test requests.",
    icon: <Stethoscope size={22} />,
  },
  {
    page: "test-request",
    title: "Test Request",
    description: "Request laboratory and imaging services for a patient.",
    icon: <FileText size={22} />,
  },
];

function DoctorDashboard({
  room,
  queues,
  serviceCount,
  loading,
  error,
  queueLoadFailed,
  setPage,
  loadData,
}: DoctorDashboardProps) {
  return (
    <QueueDashboard
      roomLabel={room}
      queueLabel="consultation"
      queues={queues}
      serviceCount={serviceCount}
      loading={loading}
      error={error}
      queueLoadFailed={queueLoadFailed}
      queuePage="consultation-queue"
      links={LINKS}
      setPage={setPage}
      onQueueChanged={loadData}
    />
  );
}

export default DoctorDashboard;

import {
  ArrowUpRight,
  FileClock,
  FlaskConical,
  ListOrdered,
  Pill,
} from "lucide-react";
import PatientSummaryCard from "../components/PatientSummaryCard";
import type { PatientSessionUser } from "../../../interface/PatientPortal";

const links = [
  {
    page: "queue-tracking",
    title: "Queue Tracking",
    description:
      "Check your queue number and the service currently being served.",
    Icon: ListOrdered,
  },
  {
    page: "laboratory-results",
    title: "Laboratory Results",
    description: "Review laboratory results released by the clinic.",
    Icon: FlaskConical,
  },
  {
    page: "medical-history",
    title: "Medical History",
    description: "Browse your visits, clinical findings, and medical records.",
    Icon: FileClock,
  },
  {
    page: "prescriptions",
    title: "Prescriptions",
    description: "View your current prescriptions and medication instructions.",
    Icon: Pill,
  },
];

export default function PatientDashboard({
  patient,
  setPage,
}: {
  patient: PatientSessionUser;
  setPage: (page: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome, {patient.first_name || "Patient"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Your clinic services and medical records in one place.
        </p>
      </div>
      <PatientSummaryCard patient={patient} />
      <div className="grid gap-5 sm:grid-cols-2">
        {links.map((link) => (
          <button
            key={link.page}
            type="button"
            onClick={() => setPage(link.page)}
            className="flex cursor-pointer items-start gap-4 rounded-lg border border-gray-200 bg-white p-5 text-left transition hover:border-sky-300 hover:bg-sky-50/30 focus-visible:outline-2 focus-visible:outline-sky-500"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-500">
              <link.Icon size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{link.title}</span>
              <span className="mt-2 block text-sm leading-relaxed text-gray-500">
                {link.description}
              </span>
            </span>
            <ArrowUpRight size={18} className="shrink-0 text-gray-400" />
          </button>
        ))}
      </div>
    </div>
  );
}

import ErrorMessage from "../../components/ErrorMessage";
import { useMemo, useState } from "react";
import {
  FileClock,
  FlaskConical,
  LayoutGrid,
  ListOrdered,
  Pill,
} from "lucide-react";
import Header from "../../components/Header";
import SideBar from "../../components/SideBar";
import ConsultationsView from "./pages/ConsultationsView.tsx";
import PrescriptionsView from "./pages/PrescriptionsView.tsx";
import QueueTrackingView from "./pages/QueueTrackingView";
import PatientDashboard from "./pages/PatientDashboard";
import type { PatientSessionUser } from "./types.ts";

type PatientPage =
  | "dashboard"
  | "medical-history"
  | "queue-tracking"
  | "laboratory-results"
  | "prescriptions";

function readLoggedInPatient(): PatientSessionUser | null {
  const stored = sessionStorage.getItem("user");
  if (!stored) return null;

  try {
    return JSON.parse(stored) as PatientSessionUser;
  } catch {
    return null;
  }
}

function PatientInformation() {
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.innerWidth >= 1024,
  );
  const [activePage, setActivePage] = useState<PatientPage>("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [consultationId, setConsultationId] = useState<string | undefined>();

  const patient = useMemo(() => readLoggedInPatient(), []);
  const patientId = patient?.patient_id ?? patient?.user_id ?? "";

  const navItems = [
    { page: "dashboard", label: "Dashboard", icon: <LayoutGrid size={20} /> },
    {
      page: "queue-tracking",
      label: "Queue Tracking",
      icon: <ListOrdered size={20} />,
    },
    {
      page: "laboratory-results",
      label: "Laboratory Results",
      icon: <FlaskConical size={20} />,
    },
    {
      page: "medical-history",
      label: "Medical History",
      icon: <FileClock size={20} />,
    },
    { page: "prescriptions", label: "Prescriptions", icon: <Pill size={20} /> },
  ];

  function setPage(page: string) {
    if (!navItems.some((item) => item.page === page)) return;
    setActivePage(page as PatientPage);
    setConsultationId(undefined);
    setLoading(false);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }

  if (!patient || !patientId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <ErrorMessage className="max-w-md">
          Patient account not found. Please sign in again to access your
          records.
        </ErrorMessage>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-y-0 left-64 right-0 z-30 bg-black/30 lg:hidden"
        />
      )}
      <div
        className={`${sidebarOpen ? "" : "hidden lg:block"} fixed inset-y-0 left-0 z-40 lg:sticky lg:top-0 lg:h-screen lg:self-start`}
      >
        <SideBar
          open={sidebarOpen}
          page={activePage}
          setPage={setPage}
          navItems={navItems}
        />
      </div>

      <div className="min-w-0 flex-1">
        <Header
          page={
            navItems.find((item) => item.page === activePage)?.label ||
            "Dashboard"
          }
          loading={loading}
          open={sidebarOpen}
          setOpen={setSidebarOpen}
          loadData={() => setRefreshKey((current) => current + 1)}
        />
        <main className="space-y-6 px-4 pb-6 sm:px-6">
          {activePage === "dashboard" && (
            <PatientDashboard
              patient={patient}
              refreshKey={refreshKey}
              setPage={setPage}
            />
          )}
          {activePage === "queue-tracking" && (
            <QueueTrackingView
              refreshKey={refreshKey}
              onLoadingChange={setLoading}
            />
          )}
          {(activePage === "medical-history" ||
            activePage === "laboratory-results") && (
            <ConsultationsView
              key={activePage}
              patientId={patientId}
              refreshKey={refreshKey}
              onLoadingChange={setLoading}
              laboratoryOnly={activePage === "laboratory-results"}
              onPrescriptions={(id) => {
                setPage("prescriptions");
                setConsultationId(id);
              }}
            />
          )}
          {activePage === "prescriptions" && (
            <PrescriptionsView
              patient={patient}
              patientId={patientId}
              refreshKey={refreshKey}
              onLoadingChange={setLoading}
              consultationId={consultationId}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default PatientInformation;

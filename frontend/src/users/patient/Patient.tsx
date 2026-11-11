import ErrorMessage from "../../components/ErrorMessage";
import { useEffect, useMemo, useState } from "react";
import {
  FileClock,
  FlaskConical,
  LayoutGrid,
  ListOrdered,
  Pill,
} from "lucide-react";
import Header from "../../components/Header";
import SideBar from "../../components/SideBar";
import { SidebarNavContext } from "../../components/sidebar/sidebarNav";
import MedicalHistory from "./pages/MedicalHistory";
import Prescriptions from "./pages/Prescriptions";
import QueueTracking from "./pages/QueueTracking";
import PatientDashboard from "./pages/PatientDashboard";
import type { PatientSessionUser } from "../../interface/PatientPortal";

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

function Patient() {
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.innerWidth >= 1024,
  );
  const [activePage, setActivePage] = useState<PatientPage>("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [consultationId, setConsultationId] = useState<string | undefined>();

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (
        document.visibilityState === "visible" &&
        !document.querySelector('[role="dialog"]')
      ) {
        setRefreshKey((current) => current + 1);
      }
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 sm:p-6">
        <ErrorMessage className="max-w-md">
          Patient account not found. Please sign in again to access your
          records.
        </ErrorMessage>
      </div>
    );
  }

  return (
    <SidebarNavContext.Provider value={{ navItems, page: activePage, setPage }}>
      <div className="flex min-h-screen bg-gray-50 text-gray-900">
        <SideBar
          open={sidebarOpen}
          setOpen={setSidebarOpen}
          page={activePage}
          setPage={setPage}
          navItems={navItems}
        />

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
                setPage={setPage}
              />
            )}
            {activePage === "queue-tracking" && (
              <QueueTracking
                refreshKey={refreshKey}
                onLoadingChange={setLoading}
              />
            )}
            {(activePage === "medical-history" ||
              activePage === "laboratory-results") && (
              <MedicalHistory
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
              <Prescriptions
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
    </SidebarNavContext.Provider>
  );
}

export default Patient;

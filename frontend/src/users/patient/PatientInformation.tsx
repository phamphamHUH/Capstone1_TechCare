import { useMemo, useState } from "react";
import { FileClock, LogOut, Menu, Pill } from "lucide-react";
import { useNavigate } from "react-router";
import ConsultationsView from "./pages/ConsultationsView.tsx";
import PrescriptionsView from "./pages/PrescriptionsView.tsx";
import type { PatientSessionUser } from "./types.ts";

type PatientPage = "consultations" | "prescriptions";

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
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState<PatientPage>("consultations");

  const patient = useMemo(() => readLoggedInPatient(), []);
  const patientId = patient?.patient_id ?? patient?.user_id ?? "";

  function logout() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("role");
    navigate("/");
  }

  if (!patient || !patientId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">Patient account not found</h1>
          <p className="mt-2 text-sm text-slate-500">
            The frontend could not find a patient ID in the current login session.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-slate-900">
      <header className="fixed left-0 right-0 top-0 z-30 flex h-[70px] items-center border-b border-slate-200 bg-white">
        <div className={`flex h-full items-center border-r border-slate-200 px-4 transition-all ${sidebarOpen ? "w-[160px]" : "w-[72px]"}`}>
          <img
            src="/assets/reyna-g-logo.png"
            alt="Reyna G"
            className="h-11 w-11 object-contain"
          />
          {sidebarOpen && <span className="ml-2 text-lg font-extrabold text-black">Reyna G</span>}
        </div>

        <div className="flex flex-1 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((current) => !current)}
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Toggle sidebar"
            >
              <Menu size={18} />
            </button>
            <h1 className="text-sm font-bold">
              {activePage === "consultations" ? "Consultation" : "Prescriptions"}
            </h1>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </header>

      <aside
        className={`fixed bottom-0 left-0 top-[70px] z-20 border-r border-slate-200 bg-white p-3 transition-all ${
          sidebarOpen ? "w-[160px]" : "w-[72px]"
        }`}
      >
        <nav className="space-y-2">
          <button
            type="button"
            onClick={() => setActivePage("consultations")}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold transition ${
              activePage === "consultations"
                ? "bg-[#be0000] text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <FileClock size={17} className="shrink-0" />
            {sidebarOpen && <span>Consultation</span>}
          </button>

          <button
            type="button"
            onClick={() => setActivePage("prescriptions")}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold transition ${
              activePage === "prescriptions"
                ? "bg-[#be0000] text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Pill size={17} className="shrink-0" />
            {sidebarOpen && <span>Prescriptions</span>}
          </button>
        </nav>
      </aside>

      <main
        className={`min-h-screen pt-[70px] transition-all ${sidebarOpen ? "pl-[160px]" : "pl-[72px]"}`}
      >
        <div className="mx-auto max-w-[1500px] p-5 lg:p-7">
          {activePage === "consultations" ? (
            <ConsultationsView patient={patient} patientId={patientId} />
          ) : (
            <PrescriptionsView patient={patient} patientId={patientId} />
          )}
        </div>
      </main>
    </div>
  );
}

export default PatientInformation;

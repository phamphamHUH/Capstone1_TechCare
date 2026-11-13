import EmptyState from "../../../../components/EmptyState";
import ErrorMessage from "../../../../components/ErrorMessage";
import LoadingScreen from "../../../../components/LoadingScreen";
import { ChevronRight, MoveLeft } from "lucide-react";
import PatientHeader from "./MedicalHistory/PatientHeader";
import type { Patient } from "../../../../interface/Patient";
import { useState } from "react";
import MedicalHistoryTab from "./MedicalHistory/MedicalHistoryTab";
import { useSearchParams } from "react-router";
import Overview from "./MedicalHistory/OverviewTab"; // adjust to where you saved the new file
import PaymentHistory from "./MedicalHistory/PaymentHistoryTab";

type HistoryTab = "overview" | "medical-history" | "payment-history";

type MedicalHistoryProps = {
  open: boolean;
  patients: Patient[];
  selectedPatient: string | null;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadData: () => Promise<void>;
  loading: boolean;
  loadFailed?: boolean;
  error?: string;
};
function MedicalHistory({
  patients,
  selectedPatient,
  loading,
  loadFailed,
  error,
}: MedicalHistoryProps) {
  const [, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<HistoryTab>("overview");
  const patient = patients.find((p) => p.patient_id === selectedPatient);

  const TABS: { key: HistoryTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "medical-history", label: "Medical History" },
    { key: "payment-history", label: "Payment History" },
  ];

  return (
    <main className="flex-1 min-w-0">
      <button
        type="button"
        onClick={() => setSearchParams({ page: "patient-records" })}
        className="mb-5 ml-6 flex cursor-pointer items-center gap-2 rounded-md border border-sky-300 bg-sky-50 px-3 py-1 text-xs text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MoveLeft size={14} />
        Back to Patient Records
      </button>
      {error && (
        <ErrorMessage className="mx-4 sm:mx-6 mt-5">{error}</ErrorMessage>
      )}

      {patient ? (
        <>
          <PatientHeader patient={patient} />
          <div className="flex gap-2 border rounded-md px-3 py-1 bg-white shadow-sm border-gray-200 mt-5 mx-6">
            {TABS.map((tab) => {
              const isActive = tab.key === activeTab;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-2 px-3 text-sm border-b-2 -mb-px rounded-md transition-all cursor-pointer ${
                    isActive
                      ? "bg-sky-500 text-white"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === "overview" && (
            <Overview key={patient.patient_id} selectedPatient={patient} />
          )}

          {activeTab === "medical-history" && (
            <MedicalHistoryTab
              key={selectedPatient}
              patientId={selectedPatient}
            />
          )}

          {activeTab === "payment-history" && (
            <PaymentHistory key={selectedPatient} patientId={selectedPatient} />
          )}
        </>
      ) : loading ? (
        <LoadingScreen message="Loading patients..." />
      ) : (
        <EmptyState
          message={
            loadFailed
              ? "Patient details are unavailable."
              : "Patient not found."
          }
          description="Select a patient from Patient Records to view their history."
        />
      )}
    </main>
  );
}

export default MedicalHistory;

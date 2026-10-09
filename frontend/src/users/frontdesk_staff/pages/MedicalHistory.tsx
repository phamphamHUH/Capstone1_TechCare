import Header from "../../../components/Header";
import { ChevronRight, SquareChevronLeft } from "lucide-react";
import PatientHeader from "../components/MedicalHistory/PatientHeader";
import type { Patient } from "../../../interface/Patient";
import HistoryTabs from "../components/MedicalHistory/HistoryTabs";
import { useState } from "react";
import MedicalHistoryTab from "../components/MedicalHistory/MedicalHistoryTab";
import { useSearchParams } from "react-router";

type HistoryTab =
  | "overview"
  | "medical-history"
  | "laboratory-requests"
  | "laboratory-results"
  | "files-and-attachments";

type MedicalHistoryProps = {
  open: boolean;
  patients: Patient[];
  selectedPatient: string | null;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadData: () => Promise<void>;
  loading: boolean;
};
function MedicalHistory({
  open,
  patients,
  selectedPatient,
  setOpen,
  loadData,
  loading,
}: MedicalHistoryProps) {
  const [, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<HistoryTab>("overview");
  const patient = patients.find((p) => p.patient_id === selectedPatient);
  return (
    <main className="flex-1 min-w-0">
      <Header
        loading={loading}
        open={open}
        setOpen={setOpen}
        loadData={loadData}
        page="Patient Records"
      />

      <div className="flex gap-1 items-center px-6 text-sm text-gray-400">
        <h1
          className="hover:text-black hover:scale-101 cursor-pointer"
          onClick={() => setSearchParams({ page: "patient-records" })}
        >
          Patient Records
        </h1>
        <ChevronRight size={17} />
        <h1 className="text-black">View Medical History</h1>
      </div>

      {patient ? (
        <>
          <PatientHeader patient={patient} />
          <HistoryTabs activeTab={activeTab} onChange={setActiveTab} />

          {activeTab === "medical-history" && (
            <MedicalHistoryTab patientId={selectedPatient} />
          )}
        </>
      ) : loading ? (
        <p className="px-6 py-10 text-gray-400">Loading...</p>
      ) : (
        <p className="px-6 py-10 text-gray-400">Patient not found.</p>
      )}
    </main>
  );
}

export default MedicalHistory;

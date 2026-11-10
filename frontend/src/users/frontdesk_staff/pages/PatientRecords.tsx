import LoadingScreen from "../../../components/LoadingScreen";
import LoadingRegion from "../../../components/LoadingRegion";
import ErrorMessage from "../../../components/ErrorMessage";
import { useState } from "react";
import type { Patient } from "../../../interface/Patient";
import { Search } from "lucide-react";

import api from "../../../lib/axios";
import ResetPasswordModal from "../../../components/ResetPasswordModal";
// import { buildPatientRecordPrintHtml } from "../../../utils/patientRecordPrintTemplate";
// import PatientCardSquare from "../components/PatientRecords/PatientCardSquare";
import EditPatientRecord from "../components/PatientRecords/EditPatientRecord";
import PatientTable from "../components/PatientRecords/PatientTable";

type PatientRecordProps = {
  patients: Patient[];
  selectedPatient: Patient | null;
  setSelectedPatient: React.Dispatch<React.SetStateAction<Patient | null>>;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadData: () => Promise<void>;
  loading: boolean;
  loadFailed?: boolean;
  error?: string;
};

function PatientRecords({
  patients,
  selectedPatient,
  setSelectedPatient,
  loadData,
  loading,
  loadFailed,
  error,
}: PatientRecordProps) {
  const [showEditPatient, setShowEditPatient] = useState(false);
  const [resetPasswordPatient, setResetPasswordPatient] = useState<Patient | null>(null);
  const [search, setSearch] = useState("");

  // =========================
  // RESET PASSWORD (front desk types the new password)
  // =========================
  // The only way a patient's password is reset.
  async function resetPassword(password: string) {
    if (!resetPasswordPatient) return;

    try {
      const response = await api.patch(
        `/api/fdstaff/patients/${resetPasswordPatient.patient_id}/password`,
        { password },
      );
      alert(response.data.message);
      setResetPasswordPatient(null);
    } catch (error: unknown) {
      alert(
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Something went wrong",
      );
    }
  }

  const filteredPatients = patients.filter((patient) => {
    const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
    const q = search.toLowerCase();
    return (
      fullName.includes(q) ||
      patient.patient_id.toLowerCase().includes(q) ||
      patient.email.toLowerCase().includes(q)
    );
  });

  if (loading && patients.length === 0 && !showEditPatient) {
    return (
      <LoadingScreen variant="page" message="Loading patient records..." />
    );
  }

  return (
    <main className="flex-1 min-w-0">
      <h1 className="text-2xl font-bold px-6 mb-5">Patient Records</h1>
      {error && <ErrorMessage className="mx-6 mb-5">{error}</ErrorMessage>}
      <div className="mx-6 py-5 border rounded-xl border-gray-200">
        <div className="relative flex-1 basis-70 left-6 mb-3">
          <Search
            size={17}
            strokeWidth={1.5}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="h-9 rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-100"
          />
        </div>
        <LoadingRegion
          loading={loading && patients.length > 0}
          message="Refreshing patient records..."
        >
          <PatientTable
            patients={filteredPatients}
            loadFailed={loadFailed}
            onEdit={(p) => {
              setSelectedPatient(p);
              setShowEditPatient(true);
            }}
          />
        </LoadingRegion>
      </div>

      {resetPasswordPatient && (
        <ResetPasswordModal
          name={`${resetPasswordPatient.first_name} ${resetPasswordPatient.last_name}`}
          onClose={() => setResetPasswordPatient(null)}
          onSave={resetPassword}
        />
      )}

      {showEditPatient && (
        <EditPatientRecord
          selectedPatient={selectedPatient}
          onClose={() => setShowEditPatient(false)}
          loadData={loadData}
        />
      )}
    </main>
  );
}

export default PatientRecords;

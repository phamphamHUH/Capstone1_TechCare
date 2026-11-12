import LoadingScreen from "../../../components/LoadingScreen";
import LoadingRegion from "../../../components/LoadingRegion";
import ErrorMessage from "../../../components/ErrorMessage";
import UniversalModal from "../../../components/UniversalModal";
import { useState } from "react";
import type { Patient } from "../../../interface/Patient";
import { Search } from "lucide-react";

import api from "../../../lib/axios";
import ResetPasswordModal from "../../../components/ResetPasswordModal";
// import { buildPatientRecordPrintHtml } from "../components/PatientRecords/utils/patientRecordPrintTemplate";
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

type Notice = {
  type: "success" | "danger";
  title: string;
  message: string;
};

const errorMessage = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } }).response?.data
    ?.message || "Something went wrong. Please try again.";

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
  const [resetPasswordPatient, setResetPasswordPatient] =
    useState<Patient | null>(null);
  const [search, setSearch] = useState("");

  const [notice, setNotice] = useState<Notice | null>(null);
  // Holds the typed password until the person confirms
  const [pendingReset, setPendingReset] = useState<{
    patient: Patient;
    password: string;
  } | null>(null);

  // =========================
  // RESET PASSWORD (front desk types the new password, then confirms)
  // =========================
  // The only way a patient's password is reset.
  async function confirmResetPassword() {
    if (!pendingReset) return;
    const { patient, password } = pendingReset;

    try {
      const response = await api.patch(
        `/api/fdstaff/patients/${patient.patient_id}/password`,
        { password },
      );
      setPendingReset(null);
      setResetPasswordPatient(null);
      setNotice({
        type: "success",
        title: "Password reset",
        message: response.data.message,
      });
    } catch (error: unknown) {
      // Keep the password form open so they can try again
      setPendingReset(null);
      setNotice({
        type: "danger",
        title: "Couldn't reset password",
        message: errorMessage(error),
      });
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
      <h1 className="text-2xl font-bold px-4 sm:px-6 mb-5">Patient Records</h1>
      {error && <ErrorMessage className="mx-4 sm:mx-6 mb-5">{error}</ErrorMessage>}
      <div className="mx-4 sm:mx-6 py-5 border rounded-md border-gray-200">
        <div className="relative mx-4 mb-3 sm:mx-6 sm:max-w-sm">
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
            className="h-9 w-full min-w-0 rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-100"
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
            onResetPassword={setResetPasswordPatient}
          />
        </LoadingRegion>
      </div>

      {resetPasswordPatient && (
        <ResetPasswordModal
          name={`${resetPasswordPatient.first_name} ${resetPasswordPatient.last_name}`}
          onClose={() => setResetPasswordPatient(null)}
          onSave={async (password: string) => {
            // Don't call the API yet: ask for confirmation first
            setPendingReset({ patient: resetPasswordPatient, password });
          }}
        />
      )}

      {showEditPatient && (
        <EditPatientRecord
          selectedPatient={selectedPatient}
          onClose={() => setShowEditPatient(false)}
          loadData={loadData}
        />
      )}

      {/* Confirm: reset password */}
      <UniversalModal
        isOpen={pendingReset !== null}
        type="warning"
        title="Reset this password?"
        description={
          pendingReset
            ? `This replaces ${pendingReset.patient.first_name} ${pendingReset.patient.last_name}'s current password. They'll need the new one to sign in.`
            : undefined
        }
        onClose={() => setPendingReset(null)}
        actions={[
          { label: "Cancel", onClick: () => setPendingReset(null) },
          {
            label: "Reset password",
            pendingLabel: "Resetting...",
            onClick: confirmResetPassword,
          },
        ]}
      />

      {/* Result of the password reset */}
      <UniversalModal
        isOpen={notice !== null}
        type={notice?.type ?? "info"}
        title={notice?.title ?? ""}
        description={notice?.message}
        onClose={() => setNotice(null)}
        actions={[{ label: "OK", onClick: () => setNotice(null) }]}
      />
    </main>
  );
}

export default PatientRecords;

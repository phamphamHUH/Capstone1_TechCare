import { useState } from "react";
import type { Patient } from "../../../interface/Patient";
import { Search } from "lucide-react";

// import api from "../../../lib/axios";
// import { buildPatientRecordPrintHtml } from "../../../utils/patientRecordPrintTemplate";
// import PatientCardSquare from "../components/PatientRecords/PatientCardSquare";
import Header from "../../../components/Header";
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
};

function PatientRecords({
  patients,
  selectedPatient,
  setSelectedPatient,
  open,
  setOpen,
  loadData,
  loading,
}: PatientRecordProps) {
  const [showEditPatient, setShowEditPatient] = useState(false);
  const [search, setSearch] = useState("");
  const filteredPatients = patients.filter((patient) => {
    const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
    const q = search.toLowerCase();
    return (
      fullName.includes(q) ||
      patient.patient_id.toLowerCase().includes(q) ||
      patient.email.toLowerCase().includes(q)
    );
  });

  return (
    <main className="flex-1 min-w-0">
      <Header
        loading={loading}
        open={open}
        setOpen={setOpen}
        loadData={loadData}
        page="Patient Records"
      />

      <h1 className="text-2xl font-bold px-6 mb-5">Patient Records</h1>
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
        <PatientTable
          patients={filteredPatients}
          onEdit={(p) => {
            setSelectedPatient(p);
            setShowEditPatient(true);
          }}
        />
      </div>

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

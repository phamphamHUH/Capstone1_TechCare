import { useState } from "react";
import type { Patient } from "../../../interface/Patient";

import api from "../../../lib/axios";
import Header from "../../../components/Header";
import { buildPatientRecordPrintHtml } from "../../../utils/patientRecordPrintTemplate";
import EditPatientRecord from "../components/PatientRecords/EditPatientRecord";
import PatientCardSquare from "../components/PatientRecords/PatientCardSquare";

type PatientRecordProps = {
  patients: Patient[];
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadData: () => Promise<void>;
  loading: boolean;
};

function PatientRecords({
  patients,
  open,
  setOpen,
  loadData,
  loading,
}: PatientRecordProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
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

  async function handleDelete(patientId: string) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this patient record?",
    );

    if (confirmDelete) {
      try {
        const response = await api.delete(`/api/fdstaff/patients/${patientId}`);
        alert(response.data.message);
        loadData(); // Refresh the data after deletion
      } catch (error) {
        console.error("Error deleting patient record:", error);
      }
    }
  }

  async function handlePrint(patient: Patient) {
    try {
      const response = await api.get(
        `/api/fdstaff/patients/${patient.patient_id}/print`,
      );
      const record = response.data.patientRecord;

      const printWindow = window.open("", "_blank", "width=900,height=700");

      if (!printWindow) {
        window.alert("Please allow pop-ups to print the patient record.");
        return;
      }

      printWindow.document.write(buildPatientRecordPrintHtml(record));
      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
      }, 250);
    } catch (error) {
      console.error("Error printing patient record:", error);
      window.alert("Unable to generate the patient print preview right now.");
    }
  }

  return (
    <main className="flex-1 min-w-0">
      <Header
        loading={loading}
        open={open}
        setOpen={setOpen}
        loadData={loadData}
        page="Patient Records"
      />

      <h2 className="text-2xl font-bold mb-4 px-6">
        Total Patients: {filteredPatients.length}
      </h2>

      <div className="flex items-center gap-3 mb-6 px-6">
        <p className="p-2 text-4xl">🔎︎</p>

        <input
          placeholder="Search patients..."
          className="p-2 border w-100"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 px-6">
        {filteredPatients.map((patient) => (
          <PatientCardSquare
            key={patient.patient_id}
            patient={patient}
            onEdit={(p) => {
              setSelectedPatient(p);
              setShowEditPatient(true);
            }}
            onDelete={handleDelete}
            onPrint={handlePrint}
          />
        ))}

        {filteredPatients.length === 0 && (
          <p className="col-span-full py-6 text-center text-gray-500">
            No patient records found.
          </p>
        )}
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

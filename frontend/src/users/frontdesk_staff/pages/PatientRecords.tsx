import { useState } from "react";
import type { Patient } from "../../../interface/Patient";

import api from "../../../lib/axios";
import EditPatientRecord from "../components/PatientRecords/EditPatientRecord";
import PatientCardSquare from "../components/PatientRecords/PatientCardSquare";
import Header from "../../../components/Header";

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

      const formatDate = (value?: string) => {
        if (!value) return "N/A";
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
      };

      const visitas = (record.visits ?? [])
        .map(
          (visit: any) => `
            <tr>
              <td>${visit.queue_id ?? "N/A"}</td>
              <td>${visit.status ?? "N/A"}</td>
              <td>${formatDate(visit.created_at)}</td>
            </tr>
          `,
        )
        .join("");

      const labRows = (record.labRequests ?? [])
        .map(
          (item: any) => `
            <tr>
              <td>${item.request_id ?? "N/A"}</td>
              <td>${item.status ?? "N/A"}</td>
              <td>${item.is_paid ? "Paid" : "Unpaid"}</td>
              <td>${formatDate(item.requested_at)}</td>
            </tr>
          `,
        )
        .join("");

      const billingRows = (record.billing ?? [])
        .map(
          (item: any) => `
            <tr>
              <td>${item.bill_id ?? "N/A"}</td>
              <td>${item.status ?? "N/A"}</td>
              <td>₱${Number(item.total_amount ?? 0).toFixed(2)}</td>
              <td>${item.payment_method ?? "N/A"}</td>
            </tr>
          `,
        )
        .join("");

      printWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>Patient Record - ${record.patient.full_name}</title>
            <style>
              :root { color-scheme: light; }
              * { box-sizing: border-box; }
              body {
                margin: 0;
                font-family: Arial, Helvetica, sans-serif;
                color: #111827;
                background: #f8fafc;
                padding: 32px;
              }
              .report {
                max-width: 900px;
                margin: 0 auto;
                background: white;
                border: 1px solid #dbe3ef;
                border-radius: 18px;
                box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
                overflow: hidden;
              }
              .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 24px;
                padding: 24px 28px;
                background: linear-gradient(135deg, #eff6ff, #f8fafc);
                border-bottom: 1px solid #e5e7eb;
              }
              .brand h1 {
                margin: 0;
                font-size: 2rem;
                line-height: 1.2;
                letter-spacing: 0.04em;
                color: #0f172a;
              }
              .brand p {
                margin: 8px 0 0;
                color: #475569;
                font-size: 0.8rem;
              }
              .meta {
                text-align: right;
                font-size: 0.8rem;
                color: #475569;
              }
              .content { padding: 28px; }
              .summary-grid {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 16px;
                margin-bottom: 24px;
              }
              .summary-card {
                border: 1px solid #dbe3ef;
                background: #f8fafc;
                border-radius: 12px;
                padding: 12px 14px;
              }
              .label {
                color: #64748b;
                font-size: 0.72rem;
                text-transform: uppercase;
                letter-spacing: 0.06em;
                display: block;
                margin-bottom: 6px;
              }
              .value {
                font-size: 1rem;
                font-weight: 700;
                color: #0f172a;
              }
              .section { margin-top: 24px; }
              .section h2 {
                margin: 0 0 12px;
                font-size: 1rem;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                color: #2563eb;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                font-size: 0.85rem;
              }
              th, td {
                border: 1px solid #e2e8f0;
                padding: 10px 12px;
                text-align: left;
                vertical-align: top;
              }
              th {
                background: #eff6ff;
                color: #1e3a8a;
              }
              @media print {
                body { background: white; padding: 0; }
                .report { box-shadow: none; border: none; border-radius: 0; }
              }
            </style>
          </head>
          <body>
            <div class="report">
              <div class="header">
                <div class="brand">
                  <h1>TechCare</h1>
                  <p>Patient Record Summary</p>
                </div>
                <div class="meta">
                  <div><strong>Patient ID:</strong> ${record.patient.patient_id}</div>
                  <div><strong>Printed:</strong> ${new Date().toLocaleDateString()}</div>
                </div>
              </div>

              <div class="content">
                <div class="summary-grid">
                  <div class="summary-card">
                    <span class="label">Patient</span>
                    <span class="value">${record.patient.full_name}</span>
                  </div>
                  <div class="summary-card">
                    <span class="label">Age / Sex</span>
                    <span class="value">${record.summary.age} / ${record.summary.sex}</span>
                  </div>
                  <div class="summary-card">
                    <span class="label">Blood Type</span>
                    <span class="value">${record.summary.blood_type}</span>
                  </div>
                  <div class="summary-card">
                    <span class="label">Civil Status</span>
                    <span class="value">${record.summary.civil_status}</span>
                  </div>
                </div>

                <div class="summary-grid">
                  <div class="summary-card">
                    <span class="label">Email</span>
                    <span class="value">${record.patient.email}</span>
                  </div>
                  <div class="summary-card">
                    <span class="label">Contact</span>
                    <span class="value">${record.patient.contact_number}</span>
                  </div>
                  <div class="summary-card">
                    <span class="label">Visits</span>
                    <span class="value">${record.summary.total_visits}</span>
                  </div>
                  <div class="summary-card">
                    <span class="label">Balance</span>
                    <span class="value">₱${Number(record.summary.pending_balance ?? 0).toFixed(2)}</span>
                  </div>
                </div>

                <div class="section">
                  <h2>Contact Information</h2>
                  <table>
                    <tbody>
                      <tr>
                        <th style="width: 180px;">Address</th>
                        <td>${record.patient.address}</td>
                      </tr>
                      <tr>
                        <th>Birthdate</th>
                        <td>${formatDate(record.patient.birthdate)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="section">
                  <h2>Visit History</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>Queue ID</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>${visitas || '<tr><td colspan="3">No visit history found.</td></tr>'}</tbody>
                  </table>
                </div>

                <div class="section">
                  <h2>Laboratory Requests</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>Request ID</th>
                        <th>Status</th>
                        <th>Payment</th>
                        <th>Requested</th>
                      </tr>
                    </thead>
                    <tbody>${labRows || '<tr><td colspan="4">No laboratory requests found.</td></tr>'}</tbody>
                  </table>
                </div>

                <div class="section">
                  <h2>Billing Records</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>Bill ID</th>
                        <th>Status</th>
                        <th>Amount</th>
                        <th>Method</th>
                      </tr>
                    </thead>
                    <tbody>${billingRows || '<tr><td colspan="4">No billing records found.</td></tr>'}</tbody>
                  </table>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);

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

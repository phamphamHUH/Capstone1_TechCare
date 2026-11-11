import EmptyState from "../../../components/EmptyState";
import ErrorMessage from "../../../components/ErrorMessage";
import LoadingScreen from "../../../components/LoadingScreen";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import {
  ArrowLeft,
  ClipboardList,
  FlaskConical,
  ReceiptText,
} from "lucide-react";
import type { Patient } from "../../../interface/Patient";
import type { Bill } from "../../../interface/Billing";
import api from "../../../lib/axios";
import Header from "../../../components/Header";
import { formatPatientAddress } from "../../../utils/formats";

interface LaboratoryRequest {
  id: number;
  queue_id: string;
  test_name: string;
  status: string;
  price: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface QueueEntry {
  queue_id: string;
  patient_id: string;
  service_id: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface BillingRecord {
  id: string;
  patient_id: string;
  amount: number;
  status: string;
  description: string;
  created_at: string;
  updated_at: string;
}

type PatientMedicalHistoryProps = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadData: () => Promise<void>;
  loading: boolean;
};

function PatientMedicalHistory({
  open,
  setOpen,
  loading,
}: PatientMedicalHistoryProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const patientId = searchParams.get("patient_id");

  const [patient, setPatient] = useState<Patient | null>(null);
  const [queueHistory, setQueueHistory] = useState<QueueEntry[]>([]);
  const [labRequests, setLabRequests] = useState<LaboratoryRequest[]>([]);
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [pageLoading, setPageLoading] = useState(!!patientId);
  const [historyError, setHistoryError] = useState("");
  const [failedSections, setFailedSections] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<
    "overview" | "visits" | "labs" | "billing"
  >("overview");

  async function fetchPatientHistory() {
    const failed: string[] = [];
    setHistoryError("");
    setFailedSections([]);
    try {
      setPageLoading(true);

      // Fetch patient info using the API - you may need to adjust this endpoint
      const patientResponse = await api.get(`/api/fdstaff/patients`);
      const patients = patientResponse.data.patients;
      const selectedPatient = patients.find(
        (p: Patient) => p.patient_id === patientId,
      );

      setPatient(selectedPatient ?? null);
      if (!selectedPatient) return;

      // Fetch laboratory requests for the patient
      try {
        const labResponse = await api.get(
          `/api/fdstaff/patients/${patientId}/laboratory-requests`,
        );
        setLabRequests(labResponse.data.laboratoryRequests || []);
      } catch (error) {
        console.log("Lab requests not available:", error);
        failed.push("laboratory requests");
      }

      // Fetch all queue entries and filter for this patient
      try {
        const queueResponse = await api.get(`/api/fdstaff/queues`);
        const patientQueues = queueResponse.data.queueEntries.filter(
          (queue: QueueEntry) => queue.patient_id === patientId,
        );
        setQueueHistory(patientQueues);
      } catch (error) {
        console.log("Queue history not available:", error);
        failed.push("visit history");
      }

      // Fetch all billing records and filter for this patient
      try {
        const billingResponse = await api.get(`/api/fdstaff/billings`);
        const patientBilling = (billingResponse.data.bills as Bill[])
          .filter((bill) => bill.patient_id === patientId)
          .map((bill) => ({
            id: bill.bill_id,
            patient_id: bill.patient_id,
            amount: Number(bill.total_amount ?? 0),
            status: bill.status.toLowerCase(),
            description: bill.services.join(", "),
            created_at: bill.created_at,
            updated_at: bill.paid_at ?? bill.created_at,
          }));
        setBillingRecords(patientBilling);
      } catch (error) {
        console.log("Billing records not available:", error);
        failed.push("billing records");
      }
    } catch (error) {
      console.error("Error fetching patient history:", error);
      setHistoryError("Unable to load patient history. Please try again.");
    } finally {
      setFailedSections(failed);
      setPageLoading(false);
    }
  }
  useEffect(() => {
    if (patientId) {
      async function action() {
        await fetchPatientHistory();
      }
      action();
    }
  }, [patientId]);
  function handleGoBack() {
    setSearchParams({ page: "patient-records" });
  }

  if (!patient) {
    return (
      <main className="flex-1 min-w-0">
        <Header
          loading={pageLoading}
          open={open}
          setOpen={setOpen}
          loadData={fetchPatientHistory}
          page="Patient Medical History"
        />
        <div className="flex items-center justify-center h-96">
          {pageLoading ? (
            <LoadingScreen message="Loading patient data..." />
          ) : historyError ? (
            <ErrorMessage>{historyError}</ErrorMessage>
          ) : (
            <EmptyState
              message="Patient not found."
              description="Select a patient from Patient Records to view their history."
            />
          )}
        </div>
      </main>
    );
  }

  const fullName = [
    patient.first_name,
    patient.middle_name,
    patient.last_name,
    patient.suffix,
  ]
    .filter(Boolean)
    .join(" ");

  const calculateAge = (birthdate: string): number => {
    const birthDate = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const hasHadBirthdayThisYear =
      today.getMonth() > birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() &&
        today.getDate() >= birthDate.getDate());
    if (!hasHadBirthdayThisYear) age--;
    return age;
  };

  const age = calculateAge(patient.birthdate);

  return (
    <main className="flex-1 min-w-0">
      <Header
        loading={pageLoading}
        open={open}
        setOpen={setOpen}
        loadData={fetchPatientHistory}
        page="Patient Medical History"
      />
      {!pageLoading && historyError && (
        <ErrorMessage className="mx-4 sm:mx-6 mb-4">{historyError}</ErrorMessage>
      )}
      {!pageLoading && failedSections.length > 0 && (
        <ErrorMessage className="mx-4 sm:mx-6 mb-4">
          Unable to load {failedSections.join(", ")}. Please try again.
        </ErrorMessage>
      )}

      {/* Go Back Button */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
        <button
          onClick={handleGoBack}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
        >
          <ArrowLeft size={20} />
          Back to Patient Records
        </button>
      </div>

      {/* Patient Header Card */}
      <div className="px-4 sm:px-6 py-6 sm:py-8 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          {/* Patient Image */}
          <div className="flex-shrink-0">
            <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-4xl font-semibold text-gray-500">
              {patient.image_url ? (
                <img
                  src={patient.image_url}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                `${patient.first_name?.charAt(0) || ""}${patient.last_name?.charAt(0) || ""}`
              )}
            </div>
          </div>

          {/* Patient Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{fullName}</h1>
            <p className="mt-2 text-gray-600">
              Patient ID:{" "}
              <span className="font-semibold">{patient.patient_id}</span>
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Age</p>
                <p className="text-lg font-semibold text-gray-900">
                  {age} years
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Sex</p>
                <p className="text-lg font-semibold text-gray-900">
                  {patient.sex}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Blood Type</p>
                <p className="text-lg font-semibold text-gray-900">
                  {patient.blood_type || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Civil Status</p>
                <p className="text-lg font-semibold text-gray-900">
                  {patient.civil_status}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900 break-all">
                  {patient.email}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contact Number</p>
                <p className="text-sm font-medium text-gray-900">
                  {patient.contact_number}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm text-gray-500">Address</p>
              <p className="text-sm font-medium text-gray-900">
                {formatPatientAddress(patient)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-6 mt-8">
        <div className="flex gap-4 overflow-x-auto overflow-y-hidden border-b border-gray-200">
          <button
            onClick={() => setActiveTab("overview")}
            className={`shrink-0 whitespace-nowrap pb-4 px-2 font-medium border-b-2 transition-colors ${
              activeTab === "overview"
                ? "text-blue-600 border-blue-600"
                : "text-gray-600 border-transparent hover:text-gray-900"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("visits")}
            className={`shrink-0 whitespace-nowrap pb-4 px-2 font-medium border-b-2 transition-colors ${
              activeTab === "visits"
                ? "text-blue-600 border-blue-600"
                : "text-gray-600 border-transparent hover:text-gray-900"
            }`}
          >
            Visit History ({queueHistory.length})
          </button>
          <button
            onClick={() => setActiveTab("labs")}
            className={`shrink-0 whitespace-nowrap pb-4 px-2 font-medium border-b-2 transition-colors ${
              activeTab === "labs"
                ? "text-blue-600 border-blue-600"
                : "text-gray-600 border-transparent hover:text-gray-900"
            }`}
          >
            Lab Requests ({labRequests.length})
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            className={`shrink-0 whitespace-nowrap pb-4 px-2 font-medium border-b-2 transition-colors ${
              activeTab === "billing"
                ? "text-blue-600 border-blue-600"
                : "text-gray-600 border-transparent hover:text-gray-900"
            }`}
          >
            Billing ({billingRecords.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 sm:px-6 py-8">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <section className="overflow-hidden rounded-md border border-gray-300 bg-gray-300">
            <div className="grid grid-cols-1 gap-px md:grid-cols-3">
              {[
                {
                  label: "Total Visits",
                  subLabel: "Queue records",
                  value: queueHistory.length,
                  icon: ClipboardList,
                },
                {
                  label: "Lab Requests",
                  subLabel: "Laboratory requests",
                  value: labRequests.length,
                  icon: FlaskConical,
                },
                {
                  label: "Billing Records",
                  subLabel: "Bills on record",
                  value: billingRecords.length,
                  icon: ReceiptText,
                },
              ].map(({ label, subLabel, value, icon: Icon }) => (
                <div key={label} className="bg-white p-4 sm:p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <Icon size={20} strokeWidth={1.5} className="shrink-0" />
                    <p className="text-sm text-gray-500">{label}</p>
                  </div>
                  <p className="text-3xl font-semibold">{value}</p>
                  <p className="mt-2 text-sm text-gray-400">{subLabel}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Visit History Tab */}
        {activeTab === "visits" && (
          <div>
            {queueHistory.length > 0 ? (
              <div className="space-y-4">
                {queueHistory
                  .sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime(),
                  )
                  .map((queue) => (
                    <div
                      key={queue.queue_id}
                      className="p-4 border border-gray-200 rounded-md hover:bg-gray-50"
                    >
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">
                            Queue ID: {queue.queue_id}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Date:{" "}
                            {new Date(queue.created_at).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              },
                            )}
                          </p>
                          <p className="text-sm text-gray-600">
                            Time:{" "}
                            {new Date(queue.created_at).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                              queue.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : queue.status === "served"
                                  ? "bg-blue-100 text-blue-800"
                                  : queue.status === "skipped"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {queue.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                {failedSections.includes("visit history") ? (
                  <ErrorMessage>
                    Unable to load visit history. Please try again.
                  </ErrorMessage>
                ) : (
                  <EmptyState message="No visit history found." />
                )}
              </div>
            )}
          </div>
        )}

        {/* Lab Requests Tab */}
        {activeTab === "labs" && (
          <div>
            {labRequests.length > 0 ? (
              <div className="space-y-4">
                {labRequests
                  .sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime(),
                  )
                  .map((lab) => (
                    <div
                      key={lab.id}
                      className="p-4 border border-gray-200 rounded-md hover:bg-gray-50"
                    >
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {lab.test_name}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Request ID: {lab.id}
                          </p>
                          <p className="text-sm text-gray-600">
                            Date:{" "}
                            {new Date(lab.created_at).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              },
                            )}
                          </p>
                          {lab.notes && (
                            <p className="text-sm text-gray-600 mt-2">
                              Notes: {lab.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">
                            ₱{lab.price.toFixed(2)}
                          </p>
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-3 ${
                              lab.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : lab.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : lab.status === "paid"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {lab.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                {failedSections.includes("laboratory requests") ? (
                  <ErrorMessage>
                    Unable to load laboratory requests. Please try again.
                  </ErrorMessage>
                ) : (
                  <EmptyState message="No laboratory requests found." />
                )}
              </div>
            )}
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === "billing" && (
          <div>
            {billingRecords.length > 0 ? (
              <div className="space-y-4">
                {billingRecords
                  .sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime(),
                  )
                  .map((bill) => (
                    <div
                      key={bill.id}
                      className="p-4 border border-gray-200 rounded-md hover:bg-gray-50"
                    >
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {bill.description}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Bill ID: {bill.id}
                          </p>
                          <p className="text-sm text-gray-600">
                            Date:{" "}
                            {new Date(bill.created_at).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              },
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            ₱{bill.amount.toFixed(2)}
                          </p>
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-3 ${
                              bill.status === "paid"
                                ? "bg-green-100 text-green-800"
                                : bill.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {bill.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                {failedSections.includes("billing records") ? (
                  <ErrorMessage>
                    Unable to load billing records. Please try again.
                  </ErrorMessage>
                ) : (
                  <EmptyState message="No billing records found." />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default PatientMedicalHistory;

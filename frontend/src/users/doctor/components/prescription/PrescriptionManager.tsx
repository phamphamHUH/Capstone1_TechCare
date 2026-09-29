import React, { useState } from "react";
import {
  FilePlus2,
  FileText,
  Plus,
  CheckCircle,
  Eye,
  Pill,
} from "lucide-react";
import type {
  Medication,
  PatientInfo,
  Prescription,
  DoctorInfo,
} from "./types";
import {
  SAMPLE_PATIENTS,
  DEFAULT_DOCTOR,
} from "./mockData";
import PatientPrescriptionCard from "./PatientPrescriptionCard";
import CreatePrescriptionView from "./CreatePrescriptionView";
import PrescriptionPreviewView from "./PrescriptionPreviewView";
import PrescriptionSavedModal from "./PrescriptionSavedModal";
import PatientSwitcherModal from "./PatientSwitcherModal";
import PatientHistoryModal from "./PatientHistoryModal";

export interface PrescriptionManagerProps {
  initialPatient?: PatientInfo;
  consultationId?: string;
  onSaveSuccess?: (prescription: Prescription) => void;
  onClose?: () => void;
  showConsultationTabs?: boolean;
}

function getInitialDoctorInfo(): DoctorInfo {
  try {
    const stored = sessionStorage.getItem("user");
    if (stored) {
      const u = JSON.parse(stored);
      if (u.first_name && u.last_name) {
        return {
          name: `Dr. ${u.first_name} ${u.last_name}`,
          title: u.department || DEFAULT_DOCTOR.title,
          licenseNumber: DEFAULT_DOCTOR.licenseNumber,
          department: u.department || DEFAULT_DOCTOR.department,
        };
      }
    }
  } catch {
    // Use fallback
  }
  return DEFAULT_DOCTOR;
}

function getInitialFormattedDate(): string {
  const d = new Date();
  const month = d.toLocaleString("default", { month: "short" });
  return `${month} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function PrescriptionManager({
  initialPatient,
  consultationId = "C-2026-00128",
  onSaveSuccess,
  onClose,
  showConsultationTabs = true,
}: PrescriptionManagerProps) {
  // Active patient
  const [currentPatient, setCurrentPatient] = useState<PatientInfo>(
    initialPatient || SAMPLE_PATIENTS[0]
  );

  // Active view: 'overview' | 'create' | 'preview'
  const [viewMode, setViewMode] = useState<"overview" | "create" | "preview">(
    "overview"
  );

  // Active consultation tab (for visual reference tabs)
  const [activeTab, setActiveTab] = useState<
    "notes" | "medical-history" | "diagnosis" | "prescription" | "attachments"
  >("prescription");

  // Medication list being drafted
  const [medications, setMedications] = useState<Medication[]>([
    {
      id: "med-sample-1",
      name: "Paracetamol 500 mg",
      dosage: "1 tablet",
      frequency: "3x a day",
      duration: "5 days",
      route: "Oral",
      instructions: "After meals",
    },
    {
      id: "med-sample-2",
      name: "Amoxicillin 500 mg",
      dosage: "1 capsule",
      frequency: "3x a day",
      duration: "7 days",
      route: "Oral",
      instructions: "After meals",
    },
  ]);

  const [additionalNotes, setAdditionalNotes] = useState(
    "Take medication regularly and complete the full course. Drink plenty of water and rest. Return for follow-up consultation in 7 days if symptoms persist."
  );

  // Saved prescriptions in this session
  const [savedPrescriptions, setSavedPrescriptions] = useState<Prescription[]>([]);

  // Modals state
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [showPatientSwitcher, setShowPatientSwitcher] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Stable Doctor Info & Date
  const [doctorInfo] = useState<DoctorInfo>(getInitialDoctorInfo);
  const [formattedDate] = useState<string>(getInitialFormattedDate);
  const [draftId] = useState<string>("rx-draft-00125");
  const [prescriptionNumber] = useState<string>("PR-2026-00125");

  // Current active prescription draft
  const currentPrescriptionDraft: Prescription = {
    id: draftId,
    prescriptionNumber,
    date: formattedDate,
    consultationId,
    patient: currentPatient,
    doctor: doctorInfo,
    medications,
    additionalNotes,
    createdAt: formattedDate,
    status: "completed",
  };

  // Medication manipulation handlers
  const handleAddMedication = (newMed: Omit<Medication, "id">) => {
    const medWithId: Medication = {
      ...newMed,
      id: `med-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setMedications((prev) => [...prev, medWithId]);
  };

  const handleUpdateMedication = (updated: Medication) => {
    setMedications((prev) =>
      prev.map((m) => (m.id === updated.id ? updated : m))
    );
  };

  const handleDeleteMedication = (id: string) => {
    setMedications((prev) => prev.filter((m) => m.id !== id));
  };

  const handleClearAll = () => {
    setMedications([]);
  };

  const handleSaveToRecord = () => {
    const finalPrescription = { ...currentPrescriptionDraft };
    setSavedPrescriptions((prev) => [finalPrescription, ...prev]);
    setShowSavedModal(true);
    if (onSaveSuccess) {
      onSaveSuccess(finalPrescription);
    }
  };

  const handleCreateAnother = () => {
    setShowSavedModal(false);
    setMedications([]);
    setAdditionalNotes(
      "Take medication regularly and complete the full course. Drink plenty of water and rest."
    );
    setViewMode("create");
  };

  const handleViewPatientRecord = () => {
    setShowSavedModal(false);
    setViewMode("overview");
  };

  const handleSelectFromHistory = (p: Prescription) => {
    setMedications(p.medications);
    if (p.additionalNotes) {
      setAdditionalNotes(p.additionalNotes);
    }
    setViewMode("preview");
  };

  // If in Create Mode
  if (viewMode === "create") {
    return (
      <>
        <CreatePrescriptionView
          patient={currentPatient}
          medications={medications}
          onAddMedication={handleAddMedication}
          onUpdateMedication={handleUpdateMedication}
          onDeleteMedication={handleDeleteMedication}
          onClearAll={handleClearAll}
          additionalNotes={additionalNotes}
          onChangeAdditionalNotes={setAdditionalNotes}
          onCancel={() => setViewMode("overview")}
          onProceedToPreview={() => setViewMode("preview")}
          onSelectPatient={() => setShowPatientSwitcher(true)}
        />

        <PatientSwitcherModal
          isOpen={showPatientSwitcher}
          onClose={() => setShowPatientSwitcher(false)}
          onSelectPatient={setCurrentPatient}
          currentPatientId={currentPatient.patientId}
        />

        <PatientHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          patient={currentPatient}
          prescriptions={savedPrescriptions}
          onSelectPrescription={handleSelectFromHistory}
        />
      </>
    );
  }

  // If in Preview Mode
  if (viewMode === "preview") {
    return (
      <>
        <PrescriptionPreviewView
          prescription={currentPrescriptionDraft}
          onBack={() => setViewMode("create")}
          onSaveToRecord={handleSaveToRecord}
        />

        <PrescriptionSavedModal
          isOpen={showSavedModal}
          onViewPatientRecord={handleViewPatientRecord}
          onCreateAnother={handleCreateAnother}
        />

        <PatientSwitcherModal
          isOpen={showPatientSwitcher}
          onClose={() => setShowPatientSwitcher(false)}
          onSelectPatient={setCurrentPatient}
          currentPatientId={currentPatient.patientId}
        />

        <PatientHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          patient={currentPatient}
          prescriptions={savedPrescriptions}
          onSelectPrescription={handleSelectFromHistory}
        />
      </>
    );
  }

  // Default: Overview Mode (matches Screen 1)
  return (
    <div className="flex flex-col gap-6 w-full pb-12">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Patient Consultation
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Review patient information and create consultation records.
        </p>
      </div>

      {/* Patient Banner */}
      <PatientPrescriptionCard
        patient={currentPatient}
        onSelectPatient={() => setShowPatientSwitcher(true)}
      />

      {/* Consultation Section Tabs (matching attached Screen 1 reference) */}
      {showConsultationTabs && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
          {/* Tabs Bar */}
          <div className="flex items-center gap-1 border-b border-gray-200 px-6 pt-3 bg-gray-50/50 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("notes")}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "notes"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              Consultation Notes
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("medical-history")}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "medical-history"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              Medical History
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("diagnosis")}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "diagnosis"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              Diagnosis
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("prescription")}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "prescription"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              Prescription
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("attachments")}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "attachments"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              Attachments
            </button>
          </div>

          {/* Active Tab Body */}
          <div className="p-8">
            {activeTab === "prescription" ? (
              savedPrescriptions.length === 0 ? (
                /* No Prescription Yet Empty State */
                <div className="py-16 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                    <FilePlus2 size={32} strokeWidth={1.5} />
                  </div>

                  <h3 className="text-base font-bold text-gray-900">
                    No Prescription Yet
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 mb-6 max-w-sm">
                    Add prescribed medications for this consultation.
                  </p>

                  <button
                    type="button"
                    onClick={() => setViewMode("create")}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>Create Prescription</span>
                  </button>
                </div>
              ) : (
                /* Active / Saved Prescriptions for this Consultation */
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">
                        Prescription On File ({savedPrescriptions.length})
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Active prescription recorded for this patient.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setViewMode("create")}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      <Plus size={15} />
                      <span>Add Another Prescription</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {savedPrescriptions.map((rx) => (
                      <div
                        key={rx.id}
                        className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all"
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="font-mono font-bold text-gray-900">
                              {rx.prescriptionNumber}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle size={11} />
                              <span>{rx.status.toUpperCase()}</span>
                            </span>
                          </div>

                          <div className="text-xs text-gray-500 mb-3">
                            Date: {rx.date} • Dr. {rx.doctor.name}
                          </div>

                          <div className="flex flex-col gap-1.5 border-t border-b border-gray-100 py-3 mb-4">
                            {rx.medications.map((m) => (
                              <div
                                key={m.id}
                                className="flex items-center justify-between text-xs"
                              >
                                <span className="font-medium text-gray-800 flex items-center gap-1.5">
                                  <Pill size={12} className="text-blue-500" />
                                  <span>{m.name}</span>
                                </span>
                                <span className="text-gray-500 text-[11px]">
                                  {m.dosage} • {m.frequency}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setMedications(rx.medications);
                              if (rx.additionalNotes) {
                                setAdditionalNotes(rx.additionalNotes);
                              }
                              setViewMode("preview");
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                          >
                            <Eye size={14} />
                            <span>Preview Slip</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setMedications(rx.medications);
                              if (rx.additionalNotes) {
                                setAdditionalNotes(rx.additionalNotes);
                              }
                              setViewMode("create");
                            }}
                            className="py-2 px-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : (
              /* Non-prescription tabs placeholder (Reference UI) */
              <div className="py-14 text-center text-gray-400">
                <FileText size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-semibold text-gray-600 capitalize">
                  {activeTab.replace("-", " ")} Section
                </p>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  This section is part of the consultation records workflow. Click on the <strong>Prescription</strong> tab above to manage patient prescriptions.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Consultation Navigation Bar */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
        >
          Back
        </button>

        <button
          type="button"
          disabled
          className="px-6 py-2.5 bg-gray-200 text-gray-400 text-xs font-semibold rounded-xl cursor-not-allowed select-none"
        >
          Save Consultation
        </button>
      </div>

      {/* Modals */}
      <PatientSwitcherModal
        isOpen={showPatientSwitcher}
        onClose={() => setShowPatientSwitcher(false)}
        onSelectPatient={setCurrentPatient}
        currentPatientId={currentPatient.patientId}
      />

      <PatientHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        patient={currentPatient}
        prescriptions={savedPrescriptions}
        onSelectPrescription={handleSelectFromHistory}
      />

      <PrescriptionSavedModal
        isOpen={showSavedModal}
        onViewPatientRecord={handleViewPatientRecord}
        onCreateAnother={handleCreateAnother}
      />
    </div>
  );
}

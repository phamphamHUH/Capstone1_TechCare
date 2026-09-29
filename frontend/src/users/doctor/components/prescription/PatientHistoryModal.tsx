import React from "react";
import { X, Clock, FileText, Pill } from "lucide-react";
import type { PatientInfo, Prescription } from "./types";

interface PatientHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientInfo;
  prescriptions: Prescription[];
  onSelectPrescription?: (prescription: Prescription) => void;
}

export default function PatientHistoryModal({
  isOpen,
  onClose,
  patient,
  prescriptions,
  onSelectPrescription,
}: PatientHistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
              {patient.avatarInitials}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Prescription History: {patient.name}
              </h3>
              <p className="text-xs text-gray-500 font-mono">
                {patient.patientId} • {patient.sex} • {patient.age}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content list */}
        <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1">
          {prescriptions.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-gray-400">
              <Clock size={28} className="mb-2 text-gray-300" />
              <p className="text-xs font-semibold text-gray-600">
                No past prescriptions on file
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Saved prescriptions for this patient will be recorded here.
              </p>
            </div>
          ) : (
            prescriptions.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-2xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-xs transition-all flex flex-col gap-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-gray-900">
                      {p.prescriptionNumber}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500">{p.date}</span>
                  </div>

                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {p.status.toUpperCase()}
                  </span>
                </div>

                <div className="text-xs text-gray-700 font-medium">
                  Doctor: {p.doctor.name} ({p.doctor.title})
                </div>

                {/* Medication badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {p.medications.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-lg"
                    >
                      <Pill size={11} />
                      <span>
                        {m.name} ({m.dosage})
                      </span>
                    </span>
                  ))}
                </div>

                {onSelectPrescription && (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectPrescription(p);
                        onClose();
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <FileText size={13} />
                      <span>View Prescription Slip</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { Check } from "lucide-react";

interface PrescriptionSavedModalProps {
  isOpen: boolean;
  onViewPatientRecord: () => void;
  onCreateAnother: () => void;
}

export default function PrescriptionSavedModal({
  isOpen,
  onViewPatientRecord,
  onCreateAnother,
}: PrescriptionSavedModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-gray-100 flex flex-col items-center text-center transform transition-all scale-100">
        {/* Green Circle Checkmark Icon */}
        <div className="w-16 h-16 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center text-emerald-600 mb-5 shadow-xs">
          <Check size={32} strokeWidth={3} />
        </div>

        {/* Title & Description */}
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">
          Prescription Saved!
        </h3>
        <p className="text-xs text-gray-500 mt-2 mb-8 max-w-xs leading-relaxed">
          The prescription has been saved to the patient's consultation record.
        </p>

        {/* Buttons */}
        <div className="flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={onViewPatientRecord}
            className="flex-1 py-2.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            View Patient Record
          </button>

          <button
            type="button"
            onClick={onCreateAnother}
            className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Create Another
          </button>
        </div>
      </div>
    </div>
  );
}

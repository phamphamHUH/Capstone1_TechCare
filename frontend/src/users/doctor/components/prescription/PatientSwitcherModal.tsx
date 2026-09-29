import React from "react";
import { ListOrdered, X } from "lucide-react";
import type { PatientInfo } from "./types";

interface PatientSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient?: (patient: PatientInfo) => void;
  currentPatientId?: string;
}

export default function PatientSwitcherModal({
  isOpen,
  onClose,
}: PatientSwitcherModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 flex flex-col animate-in fade-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Consultation Queue
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Select next patient from consultation queue.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Queue in-progress placeholder */}
        <div className="py-10 px-4 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mb-4">
            <ListOrdered size={28} />
          </div>

          <h4 className="text-sm font-bold text-gray-800">
            Available when queue list is done
          </h4>
          <p className="text-xs text-gray-400 mt-1.5 max-w-xs leading-relaxed">
            Queue selection will be connected once the doctor consultation queue workflow is completed.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="mt-6 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { User, Phone, ChevronDown } from "lucide-react";
import type { PatientInfo } from "./types";

interface PatientPrescriptionCardProps {
  patient: PatientInfo;
  onSelectPatient?: () => void;
  allowSwitchPatient?: boolean;
}

export default function PatientPrescriptionCard({
  patient,
  onSelectPatient,
  allowSwitchPatient = true,
}: PatientPrescriptionCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs mb-6 transition-all w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Avatar & Details */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl tracking-wider select-none shrink-0 shadow-inner">
            {patient.avatarInitials}
          </div>

          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                {patient.name}
              </h2>

              {patient.isSeniorCitizen && (
                <span className="bg-amber-100/90 text-amber-800 border border-amber-300/80 text-[11px] font-semibold px-2.5 py-0.5 rounded-full select-none">
                  Senior Citizen
                </span>
              )}

              {patient.isPwd && (
                <span className="bg-pink-100/90 text-pink-800 border border-pink-300/80 text-[11px] font-semibold px-2.5 py-0.5 rounded-full select-none">
                  PWD
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
              <span className="font-mono text-gray-500 font-medium">
                {patient.patientId}
              </span>
              <span>•</span>
              <span>{patient.sex}</span>
              <span>•</span>
              <span>{patient.age}</span>
              {patient.birthdate && (
                <>
                  <span>•</span>
                  <span>DOB: {patient.birthdate}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
              <Phone size={13} className="text-gray-400" />
              <span>{patient.contactNumber}</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {allowSwitchPatient && onSelectPatient && (
            <button
              type="button"
              onClick={onSelectPatient}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-300 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <User size={14} className="text-gray-500" />
              <span>Change Patient</span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

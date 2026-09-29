import React, { useState } from "react";
import {
  Printer,
  Download,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import type { Prescription, PrintOptions } from "./types";
import { CLINIC_INFO } from "./mockData";

interface PrescriptionPreviewViewProps {
  prescription: Prescription;
  onBack: () => void;
  onSaveToRecord: () => void;
}

export default function PrescriptionPreviewView({
  prescription,
  onBack,
  onSaveToRecord,
}: PrescriptionPreviewViewProps) {
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    paperSize: "A4",
    includeClinicLogo: true,
    includeDoctorSignature: true,
    includeClinicInfo: true,
    includeNotes: true,
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Triggers standard print dialog configured for Save as PDF
    window.print();
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-12">
      {/* Header section */}
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Prescription Preview
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Review the prescription details before saving or printing.
        </p>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left / Main Column: Digital Prescription Document Card (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-gray-200 rounded-3xl p-8 sm:p-10 shadow-sm print:shadow-none print:border-none print:p-0 print:m-0 print:w-full">
          {/* Document Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-gray-900 pb-5">
            {/* Clinic Info */}
            <div className="flex items-start gap-4">
              {printOptions.includeClinicLogo && (
                <img
                  src={CLINIC_INFO.logoUrl}
                  alt="Clinic Logo"
                  className="w-16 h-16 object-contain shrink-0"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              )}

              {printOptions.includeClinicInfo && (
                <div className="flex flex-col">
                  <h2 className="text-base font-black text-gray-900 tracking-tight uppercase">
                    {CLINIC_INFO.name}
                  </h2>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {CLINIC_INFO.address}
                  </p>
                  <p className="text-xs text-gray-500">
                    {CLINIC_INFO.phone} • {CLINIC_INFO.email}
                  </p>
                </div>
              )}
            </div>

            {/* Document Metadata (Right) */}
            <div className="text-right flex flex-col text-xs text-gray-600 shrink-0">
              <div className="flex items-center justify-between sm:justify-end gap-3">
                <span className="text-gray-400 font-medium">Date:</span>
                <span className="font-bold text-gray-900">{prescription.date}</span>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 mt-0.5">
                <span className="text-gray-400 font-medium">PR No:</span>
                <span className="font-mono font-bold text-gray-900">
                  {prescription.prescriptionNumber}
                </span>
              </div>
              {prescription.consultationId && (
                <div className="flex items-center justify-between sm:justify-end gap-3 mt-0.5">
                  <span className="text-gray-400 font-medium">Consultation ID:</span>
                  <span className="font-mono font-semibold text-gray-700">
                    {prescription.consultationId}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Rx Symbol & Title Banner */}
          <div className="my-5 flex items-center justify-between">
            <div className="font-serif italic font-black text-4xl text-blue-900 select-none tracking-tighter">
              ℞
            </div>
            <div className="text-center">
              <h3 className="font-extrabold text-base tracking-[0.25em] text-gray-900 uppercase">
                PRESCRIPTION
              </h3>
            </div>
            <div className="w-8" />
          </div>

          {/* Patient Information Section */}
          <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-4 mb-6 text-xs text-gray-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
              <div className="flex items-baseline gap-2">
                <span className="text-gray-400 font-semibold w-24 shrink-0">
                  Patient Name:
                </span>
                <span className="font-bold text-gray-900">
                  {prescription.patient.name}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-gray-400 font-semibold w-24 shrink-0">
                  Age / Sex:
                </span>
                <span className="font-medium text-gray-800">
                  {prescription.patient.age} / {prescription.patient.sex}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-gray-400 font-semibold w-24 shrink-0">
                  Patient ID:
                </span>
                <span className="font-mono font-medium text-gray-800">
                  {prescription.patient.patientId}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-gray-400 font-semibold w-24 shrink-0">
                  Date of Birth:
                </span>
                <span className="font-medium text-gray-800">
                  {prescription.patient.birthdate || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Medications Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-xl mb-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-100 text-gray-800 font-bold border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Medication</th>
                  <th className="py-2.5 px-3">Dosage</th>
                  <th className="py-2.5 px-3">Frequency</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Instructions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {prescription.medications.map((med, index) => (
                  <tr key={med.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-3 text-center text-gray-400 font-mono">
                      {index + 1}
                    </td>
                    <td className="py-3 px-3 font-bold text-gray-900">
                      {med.name}
                    </td>
                    <td className="py-3 px-3 text-gray-700">{med.dosage}</td>
                    <td className="py-3 px-3 text-gray-700">{med.frequency}</td>
                    <td className="py-3 px-3 text-gray-700">{med.duration}</td>
                    <td className="py-3 px-3 text-gray-600 italic">
                      {med.instructions || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Additional Notes */}
          {printOptions.includeNotes && prescription.additionalNotes && (
            <div className="mb-8 p-3.5 bg-gray-50 rounded-xl border border-gray-100 text-xs">
              <span className="font-bold text-gray-800 block mb-1">
                Additional Notes:
              </span>
              <p className="text-gray-600 leading-relaxed italic">
                {prescription.additionalNotes}
              </p>
            </div>
          )}

          {/* Doctor Signature Block */}
          {printOptions.includeDoctorSignature && (
            <div className="pt-6 flex justify-end">
              <div className="flex flex-col items-center text-center w-60">
                {/* Stylized Doctor Signature Graphic */}
                <div className="h-12 flex items-center justify-center select-none">
                  <svg
                    className="w-40 h-10 text-blue-900 stroke-current opacity-80"
                    viewBox="0 0 200 60"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 40 Q 30 10, 60 30 T 110 20 T 160 35 T 190 15"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M35 15 Q 45 45, 55 25"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div className="w-full border-t border-gray-900 pt-1.5">
                  <span className="font-bold text-xs text-gray-900 block">
                    {prescription.doctor.name}
                  </span>
                  <span className="text-[11px] text-gray-500 block">
                    License No. {prescription.doctor.licenseNumber}
                  </span>
                  <span className="text-[10px] text-gray-400 block">
                    {prescription.doctor.title}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Print Options & Actions (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6 print:hidden">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4">
              Print Options
            </h3>

            {/* Paper Size */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Paper Size
              </label>
              <select
                value={printOptions.paperSize}
                onChange={(e) =>
                  setPrintOptions({
                    ...printOptions,
                    paperSize: e.target.value as PrintOptions["paperSize"],
                  })
                }
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="A4">A4 (Recommended)</option>
                <option value="Letter">Letter (8.5 x 11 in)</option>
                <option value="Legal">Legal (8.5 x 14 in)</option>
              </select>
            </div>

            {/* Checkbox Options */}
            <div className="flex flex-col gap-3 py-2 border-t border-b border-gray-100 my-4">
              <label className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={printOptions.includeClinicLogo}
                  onChange={(e) =>
                    setPrintOptions({
                      ...printOptions,
                      includeClinicLogo: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Include Clinic Logo</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={printOptions.includeDoctorSignature}
                  onChange={(e) =>
                    setPrintOptions({
                      ...printOptions,
                      includeDoctorSignature: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Include Doctor Signature</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={printOptions.includeClinicInfo}
                  onChange={(e) =>
                    setPrintOptions({
                      ...printOptions,
                      includeClinicInfo: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Include Clinic Info</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={printOptions.includeNotes}
                  onChange={(e) =>
                    setPrintOptions({
                      ...printOptions,
                      includeNotes: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Include Notes</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={handlePrint}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Printer size={15} />
                <span>Print Prescription</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <Download size={15} />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 print:hidden">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Edit</span>
        </button>

        <button
          type="button"
          onClick={onSaveToRecord}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <CheckCircle2 size={16} />
          <span>Save to Record</span>
        </button>
      </div>
    </div>
  );
}

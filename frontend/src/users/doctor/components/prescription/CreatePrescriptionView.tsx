import React, { useState } from "react";
import {
  Search,
  Plus,
  Pill,
  Pencil,
  Trash2,
  AlertCircle,
  FileCheck2,
  X,
} from "lucide-react";
import type { Medication, PatientInfo } from "./types";
import { COMMON_MEDICATIONS } from "./mockData";
import PatientPrescriptionCard from "./PatientPrescriptionCard";

interface CreatePrescriptionViewProps {
  patient: PatientInfo;
  medications: Medication[];
  onAddMedication: (med: Omit<Medication, "id">) => void;
  onUpdateMedication: (med: Medication) => void;
  onDeleteMedication: (id: string) => void;
  onClearAll: () => void;
  additionalNotes: string;
  onChangeAdditionalNotes: (notes: string) => void;
  onCancel: () => void;
  onProceedToPreview: () => void;
  onSelectPatient?: () => void;
}

export default function CreatePrescriptionView({
  patient,
  medications,
  onAddMedication,
  onUpdateMedication,
  onDeleteMedication,
  onClearAll,
  additionalNotes,
  onChangeAdditionalNotes,
  onCancel,
  onProceedToPreview,
  onSelectPatient,
}: CreatePrescriptionViewProps) {
  // Medication form state
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editingMedicationId, setEditingMedicationId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("3x a day");
  const [duration, setDuration] = useState("5 days");
  const [instructions, setInstructions] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Filter common medications based on search query
  const filteredSuggestions = searchQuery.trim()
    ? COMMON_MEDICATIONS.filter(
        (m) =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.instructions.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSelectSuggestion = (suggestion: (typeof COMMON_MEDICATIONS)[0]) => {
    setName(suggestion.name);
    setDosage(suggestion.dosage);
    setFrequency(suggestion.frequency);
    setDuration(suggestion.duration);
    setInstructions(suggestion.instructions);
    setSearchQuery("");
    setShowSuggestions(false);
    setFormError(null);
  };

  const handleSaveMedication = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setFormError("Medication Name is required.");
      return;
    }
    if (!dosage.trim()) {
      setFormError("Dosage is required.");
      return;
    }
    if (!frequency.trim()) {
      setFormError("Frequency is required.");
      return;
    }
    if (!duration.trim()) {
      setFormError("Duration is required.");
      return;
    }

    if (editingMedicationId) {
      onUpdateMedication({
        id: editingMedicationId,
        name: name.trim(),
        dosage: dosage.trim(),
        frequency: frequency.trim(),
        duration: duration.trim(),
        instructions: instructions.trim(),
      });
      setEditingMedicationId(null);
    } else {
      onAddMedication({
        name: name.trim(),
        dosage: dosage.trim(),
        frequency: frequency.trim(),
        duration: duration.trim(),
        instructions: instructions.trim(),
      });
    }

    // Reset form
    setName("");
    setDosage("");
    setFrequency("3x a day");
    setDuration("5 days");
    setInstructions("");
    setFormError(null);
  };

  const handleStartEdit = (med: Medication) => {
    setEditingMedicationId(med.id);
    setName(med.name);
    setDosage(med.dosage);
    setFrequency(med.frequency);
    setDuration(med.duration);
    setInstructions(med.instructions);
    setFormError(null);
  };

  const handleCancelEdit = () => {
    setEditingMedicationId(null);
    setName("");
    setDosage("");
    setFrequency("3x a day");
    setDuration("5 days");
    setInstructions("");
    setFormError(null);
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-12">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Create Prescription
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Add and manage prescribed medications.
        </p>
      </div>

      {/* Patient Card Banner */}
      <PatientPrescriptionCard
        patient={patient}
        onSelectPatient={onSelectPatient}
      />

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Add Medication Form (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-5">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Pill size={18} className="text-blue-600" />
              <span>{editingMedicationId ? "Edit Medication" : "Add Medication"}</span>
            </h2>

            {editingMedicationId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <X size={14} />
                <span>Cancel Editing</span>
              </button>
            )}
          </div>

          {/* Quick Search bar */}
          <div className="relative mb-5">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Quick Medication Search
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search medication (e.g. Paracetamol, Amoxicillin)..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-gray-100">
                {filteredSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(s)}
                    className="w-full text-left p-3 hover:bg-blue-50/70 flex flex-col transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-bold text-gray-900">
                      {s.name}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {s.dosage} • {s.frequency} • {s.duration}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Validation error */}
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle size={15} className="shrink-0 text-red-500" />
              <span>{formError}</span>
            </div>
          )}

          {/* Medication Input Fields Form */}
          <form onSubmit={handleSaveMedication} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Medication Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Medication Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="e.g. Paracetamol 500 mg"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                />
              </div>

              {/* Dosage */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Dosage <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={dosage}
                  onChange={(e) => {
                    setDosage(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="e.g. 500 mg, 1 tablet"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Frequency */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Frequency <span className="text-red-500">*</span>
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                >
                  <option value="Once daily">Once daily (OD)</option>
                  <option value="Twice daily">Twice daily (BID)</option>
                  <option value="3x a day">3x a day (TID)</option>
                  <option value="4x a day">4x a day (QID)</option>
                  <option value="Every 4 hours">Every 4 hours</option>
                  <option value="Every 6 hours">Every 6 hours</option>
                  <option value="Every 8 hours">Every 8 hours</option>
                  <option value="Every 12 hours">Every 12 hours</option>
                  <option value="Before bedtime">Before bedtime (QHS)</option>
                  <option value="As needed">As needed (PRN)</option>
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Duration <span className="text-red-500">*</span>
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                >
                  <option value="3 days">3 days</option>
                  <option value="5 days">5 days</option>
                  <option value="7 days">7 days (1 week)</option>
                  <option value="10 days">10 days</option>
                  <option value="14 days">14 days (2 weeks)</option>
                  <option value="21 days">21 days (3 weeks)</option>
                  <option value="30 days">30 days (1 month)</option>
                  <option value="60 days">60 days (2 months)</option>
                  <option value="90 days">90 days (3 months)</option>
                  <option value="As needed">As needed</option>
                </select>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Instructions
              </label>
              <textarea
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. After meals, as needed for fever or pain, complete full course, etc."
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white resize-none"
              />
            </div>

            {/* Submit button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus size={15} />
                <span>
                  {editingMedicationId ? "Update Medication" : "Add to Prescription"}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Prescription List (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between min-h-[420px]">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileCheck2 size={18} className="text-blue-600" />
                <h2 className="text-base font-bold text-gray-900">
                  Prescription List ({medications.length})
                </h2>
              </div>

              {medications.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Medication Cards List */}
            {medications.length === 0 ? (
              <div className="py-14 flex flex-col items-center justify-center text-center text-gray-400 px-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
                  <Pill size={26} />
                </div>
                <p className="text-xs font-bold text-gray-700">
                  No medications added yet
                </p>
                <p className="text-[11px] text-gray-400 mt-1 max-w-xs leading-relaxed">
                  Fill in the medication details on the left form and click "Add to Prescription".
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
                {medications.map((med) => {
                  const isBeingEdited = editingMedicationId === med.id;

                  return (
                    <div
                      key={med.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isBeingEdited
                          ? "border-blue-500 bg-blue-50/30 ring-1 ring-blue-300"
                          : "border-gray-200 bg-white hover:border-blue-200 hover:shadow-2xs"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                            <Pill size={16} />
                          </div>

                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-900 leading-snug">
                              {med.name}
                            </span>
                            <span className="text-[11px] text-gray-600 mt-0.5 font-medium">
                              {med.dosage} • {med.frequency} • {med.duration}
                            </span>
                            {med.instructions && (
                              <span className="text-[11px] text-gray-400 italic mt-0.5">
                                {med.instructions}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(med)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Medication"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteMedication(med.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Medication"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick status summary badge */}
          {medications.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Total Prescribed:</span>
              <span className="font-bold text-gray-900">
                {medications.length} {medications.length === 1 ? "medicine" : "medicines"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Additional Instructions & Recommendations Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
        <label className="block text-xs font-bold text-gray-900 mb-1.5">
          Additional Instructions, Recommendations & Follow-Up
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Notes written here will appear directly on the patient's formal printed prescription document.
        </p>
        <textarea
          rows={3}
          value={additionalNotes}
          onChange={(e) => onChangeAdditionalNotes(e.target.value)}
          placeholder="e.g. Take medication regularly and complete the full course. Drink plenty of water. Return for follow-up consultation in 7 days if symptoms persist."
          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
        />
      </div>

      {/* Bottom Actions Bar */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={medications.length === 0}
          onClick={onProceedToPreview}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
        >
          <span>Proceed to Preview</span>
        </button>
      </div>
    </div>
  );
}

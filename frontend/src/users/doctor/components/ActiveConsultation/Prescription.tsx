import { useState } from "react";
import {
  FileCheckCorner,
  Pencil,
  Pill,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import api from "#lib/axios";
import ConfirmDialog from "../../../../components/ConfirmDialog";
import ErrorMessage from "../../../../components/ErrorMessage";
import type { QueueEntry } from "../../../../interface/Queue";
import { usePersistentState } from "../../../../utils/persistentState";
import AddMedication, {
  type PrescriptionItem,
} from "./Prescription/AddMedication";
import UniversalModal from "#components/UniversalModal";

type PrescriptionProps = {
  selectedQueue: QueueEntry;
  onBack: () => void;
  onPreview: () => void;
};

const shortFrequency = (f: string) => f.replace(/\s*\(.*\)/, "");

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function Prescription({ selectedQueue, onBack, onPreview }: PrescriptionProps) {
  const draftKey = `prescription-draft:${selectedQueue.consultation_record_id}`;

  const [prescriptionItems, setPrescriptionItems] = usePersistentState<
    PrescriptionItem[]
  >(`${draftKey}:prescriptionItems`, []);
  const [notes, setNotes] = usePersistentState(`${draftKey}:notes`, "");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user] = useState(() => {
    try {
      const stored = sessionStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const handleAdd = (item: PrescriptionItem) => {
    const duplicate = prescriptionItems.some(
      (p, i) =>
        i !== editingIndex && normalize(p.name) === normalize(item.name),
    );
    if (duplicate) {
      setError(`"${item.name}" is already in the prescription.`);
      return;
    }

    setError(null);
    setPrescriptionItems((prev) =>
      editingIndex === null
        ? [...prev, item]
        : prev.map((p, i) => (i === editingIndex ? item : p)),
    );
    setEditingIndex(null);
  };

  const handleRemove = (index: number) => {
    setPrescriptionItems((prev) => prev.filter((_, i) => i !== index));
    setEditingIndex(null);
  };

  const handleSave = async () => {
    if (saving) return;
    if (prescriptionItems.length === 0)
      return setError("Add at least one medication.");

    try {
      setSaving(true);
      setError(null);
      await api.post("/api/doctor/prescriptions", {
        consultation_record_id: selectedQueue.consultation_record_id,
        prescription_items: prescriptionItems,
        notes,
        prescriber_id: user?.user_id != null ? String(user.user_id) : undefined,
      });
      setSaved(true);
      setShowSuccess(true);
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Failed to save the prescription.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex gap-3 border px-5 py-3 mb-5 rounded-md border-gray-200 items-center">
        <h1 className="text-xl font-semibold">Prescription</h1>
        <p className="text-xs font-light">(* indicates required fields)</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-5 mb-5 items-start">
        {/* ADD / EDIT MEDICATION */}
        <AddMedication
          key={editingIndex ?? "new"}
          editing={
            editingIndex === null ? null : prescriptionItems[editingIndex]
          }
          onAdd={handleAdd}
          onCancelEdit={() => setEditingIndex(null)}
        />

        {/* PRESCRIPTION LIST */}
        <section className="min-w-0 lg:col-span-4 flex flex-col rounded-md border border-gray-200 bg-white px-4 sm:px-5 py-6">
          <div className="flex prescriptionItems-center gap-3 border-b border-gray-200 pb-3 font-semibold">
            <FileCheckCorner size={20} className="text-sky-600" />
            <h1>Prescription List ({prescriptionItems.length})</h1>
            {prescriptionItems.length > 0 && (
              <button
                type="button"
                onClick={() => setClearing(true)}
                className="ml-auto cursor-pointer text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Clear All
              </button>
            )}
          </div>

          <ul className="mt-4 flex min-h-48 flex-col gap-3">
            {prescriptionItems.length === 0 ? (
              <li className="flex flex-1 flex-col prescriptionItems-center justify-center gap-1 py-8 text-center">
                <p className="text-sm font-bold">No medications added yet.</p>
                <p className="text-xs text-gray-500">
                  Medications you add will appear here.
                </p>
              </li>
            ) : (
              prescriptionItems.map((item, index) => (
                <li
                  key={`${item.name}-${index}`}
                  className={`flex prescriptionItems-center gap-3 rounded-md border px-4 py-3 ${
                    editingIndex === index
                      ? "border-sky-400 bg-sky-50"
                      : "border-gray-200"
                  }`}
                >
                  <div className="rounded-md bg-sky-50 p-2.5 text-sky-600">
                    <Pill size={18} />
                  </div>

                  <div className="min-w-0 flex-1 text-xs">
                    <p className="truncate font-bold">{item.name}</p>
                    <p className="text-gray-600">
                      {item.dosage} • {shortFrequency(item.frequency)} •{" "}
                      {item.duration}
                    </p>
                    {item.instructions && (
                      <p className="italic text-gray-400">
                        {item.instructions}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditingIndex(index)}
                    aria-label={`Edit ${item.name}`}
                    className="cursor-pointer rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-sky-600"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    aria-label={`Remove ${item.name}`}
                    className="cursor-pointer rounded-md p-1 text-gray-400 hover:bg-pink-100 hover:text-red-500"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))
            )}
          </ul>

          <div className="mt-auto flex prescriptionItems-center justify-between border-t border-gray-200 pt-4 text-xs text-gray-500">
            <span>Total Prescribed:</span>
            <span className="font-bold text-gray-900">
              {prescriptionItems.length}{" "}
              {prescriptionItems.length === 1 ? "medicine" : "medicines"}
            </span>
          </div>
        </section>
      </div>

      {/* NOTES */}
      <section className="mb-5 rounded-md border border-gray-200 bg-white px-5 py-6">
        <label htmlFor="rx-notes" className="text-xs font-bold">
          Additional Instructions, Recommendations &amp; Follow-Up
        </label>
        <p className="mb-3 mt-1 text-xs text-gray-500">
          Notes written here will appear directly on the patient's formal
          printed prescription document.
        </p>
        <textarea
          id="rx-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Take medication regularly and complete the full course..."
          className="w-full resize-y rounded-md border border-gray-200 p-3 text-xs text-gray-700 outline-none placeholder:text-gray-300 focus:border-sky-400"
        />
      </section>

      {error && <ErrorMessage className="mb-4">{error}</ErrorMessage>}

      <div className="flex flex-wrap prescriptionItems-center justify-between gap-3">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border cursor-pointer border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Return to Findings
          </button>
        </div>
        <div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || saved || prescriptionItems.length === 0}
            className="rounded-md bg-blue-600 cursor-pointer px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {saving ? "Saving..." : "Save Prescription"}
          </button>
        </div>
      </div>

      {clearing && (
        <ConfirmDialog
          tone="warning"
          title="Clear Prescription?"
          confirmLabel="Clear All"
          cancelLabel="Keep Editing"
          description="Remove all medications from this prescription?"
          onCancel={() => setClearing(false)}
          onConfirm={() => {
            setPrescriptionItems([]);
            setEditingIndex(null);
            setClearing(false);
          }}
        />
      )}
      {showSuccess && (
        <UniversalModal
          isOpen
          type="success"
          title="Prescription Saved"
          description="The prescription was saved successfully. You can now review and print the prescription."
          icon={<CheckCircle2 size={36} />}
          onClose={() => {
            setShowSuccess(false);
            onPreview();
          }}
          actions={[
            {
              label: "Preview Prescription",
              onClick: () => {
                setShowSuccess(false);
                onPreview();
              },
            },
          ]}
        />
      )}
    </div>
  );
}

export default Prescription;

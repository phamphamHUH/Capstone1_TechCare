import { useState } from "react";
import { Pill, Plus, Search } from "lucide-react";

export type PrescriptionItem = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
};

export type CatalogMedication = {
  generic_name: string;
  brand_name?: string;
  strength: string;
  dosage_form: string;
};

const FREQUENCIES = [
  "Once a day (OD)",
  "2x a day (BID)",
  "3x a day (TID)",
  "4x a day (QID)",
  "Every 4 hours",
  "Every 6 hours",
  "Every 8 hours",
  "At bedtime",
  "As needed (PRN)",
];

const DURATIONS = [
  "1 day",
  "3 days",
  "5 days",
  "7 days",
  "10 days",
  "14 days",
  "30 days",
  "Until finished",
];

const inputClass =
  "h-10 w-full rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20";

const EMPTY: PrescriptionItem = {
  name: "",
  dosage: "",
  frequency: "3x a day (TID)",
  duration: "5 days",
  instructions: "",
};

type AddMedicationProps = {
  catalog?: CatalogMedication[];
  editing?: PrescriptionItem | null;
  onAdd: (item: PrescriptionItem) => void;
  onCancelEdit?: () => void;
};

function AddMedication({
  catalog = [],
  editing = null,
  onAdd,
  onCancelEdit,
}: AddMedicationProps) {
  const [form, setForm] = useState<PrescriptionItem>(editing ?? EMPTY);
  const [query, setQuery] = useState("");
  const [errors, setErrors] = useState<{ name?: string; dosage?: string }>({});

  const set = (key: keyof PrescriptionItem, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "name" || key === "dosage")
      setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const q = query.trim().toLowerCase();
  const results = q
    ? catalog
        .filter((m) =>
          [m.generic_name, m.brand_name ?? ""].some((v) =>
            v.toLowerCase().includes(q),
          ),
        )
        .slice(0, 6)
    : [];

  const pick = (m: CatalogMedication) => {
    setForm((prev) => ({
      ...prev,
      name: `${m.generic_name} ${m.strength}`,
      dosage: `${m.strength}, 1 ${m.dosage_form.toLowerCase()}`,
    }));
    setErrors({});
    setQuery("");
  };

  const handleAdd = () => {
    const next = {
      name: form.name.trim() ? undefined : "Medication name is required.",
      dosage: form.dosage.trim() ? undefined : "Dosage is required.",
    };
    setErrors(next);
    if (next.name || next.dosage) return;

    onAdd({
      ...form,
      name: form.name.trim(),
      dosage: form.dosage.trim(),
      instructions: form.instructions.trim(),
    });
    setForm(EMPTY);
  };

  return (
    <section className="col-span-6 rounded-md border border-gray-200 bg-white px-5 py-6">
      <div className="flex items-center gap-3 border-b border-gray-200 pb-3 font-semibold">
        <Pill size={20} className="text-sky-600" />
        <h1>{editing ? "Edit Medication" : "Add Medication"}</h1>
      </div>

      <div className="mt-5 space-y-4">
        {/* Name + dosage */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="med-name" className="text-xs font-semibold">
              Medication Name <span className="text-red-500">*</span>
            </label>
            <input
              id="med-name"
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Paracetamol 500 mg"
              className={`${inputClass} ${errors.name ? "border-red-400" : ""}`}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && (
              <p className="text-[11px] text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="med-dosage" className="text-xs font-semibold">
              Dosage <span className="text-red-500">*</span>
            </label>
            <input
              id="med-dosage"
              type="text"
              value={form.dosage}
              onChange={(e) => set("dosage", e.target.value)}
              placeholder="e.g. 500 mg, 1 tablet"
              className={`${inputClass} ${errors.dosage ? "border-red-400" : ""}`}
              aria-invalid={Boolean(errors.dosage)}
            />
            {errors.dosage && (
              <p className="text-[11px] text-red-500">{errors.dosage}</p>
            )}
          </div>
        </div>

        {/* Frequency + duration */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="med-frequency" className="text-xs font-semibold">
              Frequency <span className="text-red-500">*</span>
            </label>
            <select
              id="med-frequency"
              value={form.frequency}
              onChange={(e) => set("frequency", e.target.value)}
              className={inputClass}
            >
              {FREQUENCIES.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="med-duration" className="text-xs font-semibold">
              Duration <span className="text-red-500">*</span>
            </label>
            <select
              id="med-duration"
              value={form.duration}
              onChange={(e) => set("duration", e.target.value)}
              className={inputClass}
            >
              {DURATIONS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-1.5">
          <label htmlFor="med-instructions" className="text-xs font-semibold">
            Instructions
          </label>
          <textarea
            id="med-instructions"
            rows={3}
            value={form.instructions}
            onChange={(e) => set("instructions", e.target.value)}
            placeholder="e.g. After meals, as needed for fever or pain, complete full course, etc."
            className="w-full resize-none rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20"
          />
        </div>

        <div className="flex justify-end gap-2">
          {editing && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="cursor-pointer rounded-md border border-gray-300 px-5 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleAdd}
            className="flex cursor-pointer items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 active:scale-99"
          >
            <Plus size={15} />
            {editing ? "Save Changes" : "Add to Prescription"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default AddMedication;

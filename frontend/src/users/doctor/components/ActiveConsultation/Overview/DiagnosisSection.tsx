import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import type {
  Diagnosis,
  DiagnosisType,
  NewDiagnosis,
} from "../../../../../interface/Overview";
import { Section } from "./FormParts";

const cellInputClass =
  "w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-sky-400";
const skyBtnClass =
  "bg-sky-500 text-xs font-medium text-white hover:bg-sky-600";

// A diagnosis is a name + Primary/Secondary (the clinic doesn't use ICD-10).
type Draft = { name: string; type: DiagnosisType };
const EMPTY_DRAFT: Draft = { name: "", type: "Primary" };

type DiagnosisSectionProps = {
  diagnoses: Diagnosis[];
  onAdd: (diagnosis: NewDiagnosis) => void;
  onUpdate: (id: number, diagnosis: NewDiagnosis) => void;
  onRemove: (id: number) => void;
  errors?: Record<string, string>;
};

function DiagnosisSection({
  diagnoses,
  onAdd,
  onUpdate,
  onRemove,
  errors = {},
}: DiagnosisSectionProps) {
  // "new" = the add row is open, a number = that row is being edited
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const canSave = !!draft.name.trim();

  const startAdd = () => {
    setDraft(EMPTY_DRAFT);
    setEditingId("new");
  };

  const startEdit = (d: Diagnosis) => {
    setDraft({ name: d.name, type: d.type });
    setEditingId(d.id);
  };

  const cancel = () => setEditingId(null);

  const save = () => {
    if (!canSave) return;
    const dx: NewDiagnosis = {
      name: draft.name.trim(),
      type: draft.type,
    };
    if (editingId === "new") onAdd(dx);
    else if (editingId !== null) onUpdate(editingId, dx);
    setEditingId(null);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") cancel();
  };

  // Server error text shown inside a cell
  const errorText = (msg?: string) =>
    msg && (
      <p data-field-error className="mt-1 text-[10px] text-red-500">
        {msg}
      </p>
    );

  const renderEditRow = (key: string | number) => (
    <tr key={key} className="border-t border-gray-100 bg-sky-50/50 align-top">
      <td className="p-2">
        <input
          autoFocus
          type="text"
          value={draft.name}
          onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
          onKeyDown={onKeyDown}
          placeholder="Diagnosis"
          className={cellInputClass}
        />
      </td>
      <td className="p-2">
        <select
          value={draft.type}
          onChange={(e) =>
            setDraft((p) => ({ ...p, type: e.target.value as DiagnosisType }))
          }
          className={cellInputClass}
        >
          <option>Primary</option>
          <option>Secondary</option>
        </select>
      </td>
      <td className="p-2">
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            aria-label="Save diagnosis"
            className="text-green-600 hover:text-green-800 disabled:cursor-not-allowed disabled:text-gray-300"
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            onClick={cancel}
            aria-label="Cancel"
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={16} />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <Section
      title="Assessment / Diagnosis *"
      action={
        <button
          type="button"
          onClick={editingId === "new" ? cancel : startAdd}
          className={`rounded-md px-3 py-1.5 ${skyBtnClass}`}
        >
          {editingId === "new" ? "Cancel" : "Add"}
        </button>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              {["Diagnosis", "Type"].map((h) => (
                <th key={h} className="p-2">
                  {h}
                </th>
              ))}
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {editingId === "new" && renderEditRow("new")}

            {diagnoses.map((d, i) =>
              editingId === d.id ? (
                renderEditRow(d.id)
              ) : (
                <tr
                  key={d.id}
                  className={`border-t border-gray-100 align-top ${
                    Object.keys(errors).some((k) =>
                      k.startsWith(`diagnosis.${i}.`),
                    )
                      ? "bg-red-50"
                      : ""
                  }`}
                >
                  <td className="p-2">
                    {d.name}
                    {errorText(errors[`diagnosis.${i}.diagnosis`])}
                  </td>
                  <td className="p-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        d.type === "Primary"
                          ? "bg-sky-100 text-sky-600"
                          : "bg-orange-100 text-orange-600"
                      }`}
                    >
                      {d.type}
                    </span>
                    {errorText(errors[`diagnosis.${i}.type`])}
                  </td>
                  <td className="p-2">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(d)}
                        aria-label={`Edit ${d.name}`}
                        className="cursor-pointer text-gray-500 hover:text-sky-600"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(d.id)}
                        aria-label={`Remove ${d.name}`}
                        className="cursor-pointer text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ),
            )}

            {diagnoses.length === 0 && editingId !== "new" && (
              <tr>
                <td colSpan={3} className="p-4 text-center text-gray-400">
                  No diagnosis added.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {errorText(errors.diagnosis)}
    </Section>
  );
}

export default DiagnosisSection;

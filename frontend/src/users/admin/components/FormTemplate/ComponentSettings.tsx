import { useState } from "react";
import { Trash2, Plus, X } from "lucide-react";
import type {
  BuilderComponent,
  ComponentType,
  FieldWidth,
  TextAlignment,
} from "../../../../interface/FormTemplate";

interface ComponentSettingsProps {
  component: BuilderComponent | null;
  onUpdateComponent: (updated: BuilderComponent) => void;
  onDeleteComponent: (id: string) => void;
  allFieldKeys: string[];
}

export default function ComponentSettings({
  component,
  onUpdateComponent,
  onDeleteComponent,
  allFieldKeys,
}: ComponentSettingsProps) {
  const [activeTab, setActiveTab] = useState<"properties" | "validation">(
    "properties"
  );
  const [newOption, setNewOption] = useState("");
  const [newColHeader, setNewColHeader] = useState("");

  if (!component) {
    return (
      <aside className="w-80 flex-shrink-0 bg-white border border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-sm text-gray-400">
        <p className="text-xs">Select a component on the canvas to configure its properties and validation.</p>
      </aside>
    );
  }

  const updateSettings = (key: string, value: unknown) => {
    onUpdateComponent({
      ...component,
      settings: {
        ...component.settings,
        [key]: value,
      },
    });
  };

  const updateValidation = (key: string, value: unknown) => {
    onUpdateComponent({
      ...component,
      validation: {
        ...component.validation,
        [key]: value,
      },
    });
  };

  const updateFlagLabels = (key: string, value: string) => {
    onUpdateComponent({
      ...component,
      validation: {
        ...component.validation,
        flagLabels: {
          ...component.validation.flagLabels,
          [key]: value,
        },
      },
    });
  };

  const isDuplicateKey =
    allFieldKeys.filter((k) => k === component.fieldKey).length > 1;

  const isMinMaxInvalid =
    component.validation.minValue !== undefined &&
    component.validation.maxValue !== undefined &&
    component.validation.minValue !== "" &&
    component.validation.maxValue !== "" &&
    Number(component.validation.minValue) >
      Number(component.validation.maxValue);

  const getComponentBadge = (type: ComponentType) => {
    switch (type) {
      case "number_field":
        return "123";
      case "section_header":
        return "H";
      case "static_text":
        return "A";
      case "table":
        return "TBL";
      default:
        return "T";
    }
  };

  const isNumeric =
    component.type === "number_field" ||
    component.validation.inputType === "Number";

  return (
    <aside className="w-80 flex-shrink-0 bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-4 shadow-sm overflow-y-auto max-h-[calc(100vh-140px)]">
      {/* Selected Component Header */}
      <div>
        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Selected Component
        </div>
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-200/80 flex items-center justify-center font-bold text-xs text-gray-700">
              {getComponentBadge(component.type)}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-gray-900 capitalize">
                {component.type.replace("_", " ")}
              </span>
              <span className="text-[11px] text-gray-500 truncate max-w-[140px]">
                {component.label || "Untitled"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDeleteComponent(component.id)}
            className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Delete component"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab("properties")}
          className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "properties"
              ? "bg-white text-sky-600 shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Properties
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("validation")}
          className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "validation"
              ? "bg-white text-sky-600 shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Validation
        </button>
      </div>

      {/* PROPERTIES TAB */}
      {activeTab === "properties" && (
        <div className="flex flex-col gap-3.5 text-xs">
          {/* Field Text / Label */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Field Text
            </label>
            <input
              type="text"
              value={component.label}
              onChange={(e) =>
                onUpdateComponent({ ...component, label: e.target.value })
              }
              placeholder="e.g. Hemoglobin"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-400"
            />
          </div>

          {/* Field Key */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Field Key
            </label>
            <input
              type="text"
              value={component.fieldKey}
              onChange={(e) =>
                onUpdateComponent({
                  ...component,
                  fieldKey: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                })
              }
              placeholder="e.g. hemoglobin"
              className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 ${
                isDuplicateKey
                  ? "border-red-400 focus:ring-red-400 bg-red-50/30"
                  : "border-gray-300 focus:ring-sky-400"
              }`}
            />
            {isDuplicateKey && (
              <span className="text-[10px] text-red-500 mt-0.5 block">
                Field key must be unique across the template.
              </span>
            )}
          </div>

          {/* Placeholder */}
          {["text_field", "number_field", "date_field"].includes(
            component.type
          ) && (
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Placeholder (Optional)
              </label>
              <input
                type="text"
                value={component.settings.placeholder || ""}
                onChange={(e) => updateSettings("placeholder", e.target.value)}
                placeholder="Placeholder text"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-400"
              />
            </div>
          )}

          {/* Default Value */}
          {["text_field", "number_field", "static_text"].includes(
            component.type
          ) && (
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Default Value (Optional)
              </label>
              <input
                type="text"
                value={component.settings.defaultValue || ""}
                onChange={(e) => updateSettings("defaultValue", e.target.value)}
                placeholder="Default value"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-400"
              />
            </div>
          )}

          {/* Unit */}
          {["text_field", "number_field"].includes(component.type) && (
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Unit
              </label>
              <input
                type="text"
                value={component.settings.unit || ""}
                onChange={(e) => updateSettings("unit", e.target.value)}
                placeholder="e.g. g/dL, %"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-400"
              />
            </div>
          )}

          {/* Reference Range */}
          {["text_field", "number_field"].includes(component.type) && (
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Reference Range
              </label>
              <input
                type="text"
                value={component.settings.referenceRange || ""}
                onChange={(e) =>
                  updateSettings("referenceRange", e.target.value)
                }
                placeholder="e.g. 12.0 - 16.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-400"
              />
            </div>
          )}

          {/* Checkbox Options */}
          {component.type === "checkbox" && (
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Options
              </label>
              <div className="flex gap-1.5 mb-2">
                <input
                  type="text"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="New option"
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-xl text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newOption.trim()) {
                      const opts = component.settings.checkboxOptions || [];
                      updateSettings("checkboxOptions", [
                        ...opts,
                        newOption.trim(),
                      ]);
                      setNewOption("");
                    }
                  }}
                  className="px-2.5 py-1.5 bg-sky-500 text-white rounded-xl text-xs hover:bg-sky-600"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="flex flex-col gap-1 max-h-28 overflow-y-auto">
                {(component.settings.checkboxOptions || []).map((opt, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  >
                    <span>{opt}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const opts = (
                          component.settings.checkboxOptions || []
                        ).filter((_, i) => i !== idx);
                        updateSettings("checkboxOptions", opts);
                      }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table Columns */}
          {component.type === "table" && (
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Columns
              </label>
              <div className="flex gap-1.5 mb-2">
                <input
                  type="text"
                  value={newColHeader}
                  onChange={(e) => setNewColHeader(e.target.value)}
                  placeholder="Column header"
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-xl text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newColHeader.trim()) {
                      const cols = component.settings.tableColumns || [];
                      updateSettings("tableColumns", [
                        ...cols,
                        {
                          id: `col_${Date.now()}`,
                          header: newColHeader.trim(),
                          type: "text",
                        },
                      ]);
                      setNewColHeader("");
                    }
                  }}
                  className="px-2.5 py-1.5 bg-sky-500 text-white rounded-xl text-xs hover:bg-sky-600"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                {(component.settings.tableColumns || []).map((col, idx) => (
                  <div
                    key={col.id}
                    className="flex items-center justify-between px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  >
                    <span className="font-medium">{col.header}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const cols = (
                          component.settings.tableColumns || []
                        ).filter((_, i) => i !== idx);
                        updateSettings("tableColumns", cols);
                      }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section Header Text */}
          {component.type === "section_header" && (
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Header Text
              </label>
              <input
                type="text"
                value={component.settings.sectionHeader || component.label}
                onChange={(e) => {
                  updateSettings("sectionHeader", e.target.value);
                  onUpdateComponent({ ...component, label: e.target.value });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-400"
              />
            </div>
          )}

          {/* Static Text Content */}
          {component.type === "static_text" && (
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Static Text
              </label>
              <textarea
                rows={3}
                value={component.settings.staticText || ""}
                onChange={(e) => updateSettings("staticText", e.target.value)}
                placeholder="Informational or instructional notice..."
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-400"
              />
            </div>
          )}

          {/* Required & Preview Toggles */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={component.settings.required || false}
                onChange={(e) => updateSettings("required", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-sky-500 focus:ring-sky-400"
              />
              <span className="text-gray-700 font-medium">Required Field</span>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={component.settings.showInPreview !== false}
                onChange={(e) =>
                  updateSettings("showInPreview", e.target.checked)
                }
                className="w-4 h-4 rounded border-gray-300 text-sky-500 focus:ring-sky-400"
              />
              <span className="text-gray-700 font-medium">Show in Preview</span>
            </label>
          </div>

          {/* Field Width */}
          <div>
            <label className="block text-gray-700 font-medium mb-1.5">
              Field Width
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["1/4", "1/3", "1/2", "FULL"] as FieldWidth[]).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => updateSettings("width", w)}
                  className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    (component.settings.width || "FULL") === w
                      ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {/* Text Alignment */}
          <div>
            <label className="block text-gray-700 font-medium mb-1.5">
              Text Alignment
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["left", "center", "right"] as TextAlignment[]).map((align) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => updateSettings("alignment", align)}
                  className={`py-1.5 text-xs font-semibold rounded-lg border capitalize transition-all ${
                    (component.settings.alignment || "left") === align
                      ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VALIDATION TAB */}
      {activeTab === "validation" && (
        <div className="flex flex-col gap-3.5 text-xs">
          {/* Validation Rules Header */}
          <div className="border-b border-gray-100 pb-2">
            <span className="font-semibold text-gray-800">
              Validation Rules
            </span>
            <div className="flex items-center justify-between mt-2">
              <span className="text-gray-600">Required Field</span>
              <input
                type="checkbox"
                checked={component.validation.required || false}
                onChange={(e) => updateValidation("required", e.target.checked)}
                className="w-4 h-4 rounded text-sky-500"
              />
            </div>
            <div className="mt-2">
              <label className="block text-gray-600 font-medium mb-1">
                Input Type
              </label>
              <select
                value={component.validation.inputType || "Text"}
                onChange={(e) =>
                  updateValidation("inputType", e.target.value)
                }
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-xl bg-white"
              >
                <option value="Text">Text</option>
                <option value="Number">Number</option>
                <option value="Date">Date</option>
                <option value="Email">Email</option>
              </select>
            </div>
          </div>

          {/* Value Rules (min / max / decimal) */}
          <div className="border-b border-gray-100 pb-2">
            <span className="font-semibold text-gray-800">Value Rules</span>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="block text-[11px] text-gray-500 mb-0.5">
                  Minimum Value
                </label>
                <input
                  type="number"
                  value={component.validation.minValue ?? ""}
                  onChange={(e) =>
                    updateValidation("minValue", e.target.value)
                  }
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-0.5">
                  Maximum Value
                </label>
                <input
                  type="number"
                  value={component.validation.maxValue ?? ""}
                  onChange={(e) =>
                    updateValidation("maxValue", e.target.value)
                  }
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-xl text-xs"
                />
              </div>
            </div>

            {isMinMaxInvalid && (
              <span className="text-[10px] text-red-500 mt-1 block">
                Minimum value cannot be greater than maximum value.
              </span>
            )}

            {isNumeric && (
              <div className="mt-2">
                <label className="block text-[11px] text-gray-500 mb-0.5">
                  Decimal Places
                </label>
                <select
                  value={component.validation.decimalPlaces ?? "1"}
                  onChange={(e) =>
                    updateValidation("decimalPlaces", Number(e.target.value))
                  }
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-xl bg-white text-xs"
                >
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </div>
            )}
          </div>

          {/* Reference Range (Low, Normal, High) */}
          {isNumeric && (
            <div className="border-b border-gray-100 pb-2">
              <span className="font-semibold text-gray-800">
                Reference Range
              </span>
              <div className="grid grid-cols-3 gap-1.5 mt-2">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-0.5">
                    Low
                  </label>
                  <input
                    type="number"
                    value={component.validation.refLow ?? ""}
                    onChange={(e) => updateValidation("refLow", e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-0.5">
                    Normal
                  </label>
                  <input
                    type="number"
                    value={component.validation.refNormal ?? ""}
                    onChange={(e) =>
                      updateValidation("refNormal", e.target.value)
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-0.5">
                    High
                  </label>
                  <input
                    type="number"
                    value={component.validation.refHigh ?? ""}
                    onChange={(e) =>
                      updateValidation("refHigh", e.target.value)
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Flag Labels */}
              <div className="mt-2.5">
                <span className="text-[11px] font-medium text-gray-700">
                  Flag Labels
                </span>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">
                      Low
                    </label>
                    <input
                      type="text"
                      value={component.validation.flagLabels?.low ?? "Good"}
                      onChange={(e) => updateFlagLabels("low", e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">
                      Normal
                    </label>
                    <input
                      type="text"
                      value={
                        component.validation.flagLabels?.normal ?? "Normal"
                      }
                      onChange={(e) =>
                        updateFlagLabels("normal", e.target.value)
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">
                      High
                    </label>
                    <input
                      type="text"
                      value={component.validation.flagLabels?.high ?? "Bad"}
                      onChange={(e) => updateFlagLabels("high", e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Validation Message */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Validation Message
            </label>
            <textarea
              rows={2}
              value={component.validation.customMessage || ""}
              onChange={(e) => updateValidation("customMessage", e.target.value)}
              placeholder="This message will show if input is invalid"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-400"
            />
          </div>
        </div>
      )}
    </aside>
  );
}

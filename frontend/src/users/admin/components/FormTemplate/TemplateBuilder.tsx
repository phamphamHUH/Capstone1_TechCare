import { useState } from "react";
import { Eye, CheckCircle2, AlertCircle } from "lucide-react";
import type {
  BuilderComponent,
  ComponentType,
  FormTemplate,
} from "../../../../interface/FormTemplate";
import ComponentPalette from "./ComponentPalette";
import BuilderCanvas from "./BuilderCanvas";
import ComponentSettings from "./ComponentSettings";
import TemplatePreview from "./TemplatePreview";

interface TemplateBuilderProps {
  initialTemplate?: FormTemplate | null;
  onBackToLibrary: () => void;
}

const DEFAULT_NEW_COMPONENTS: BuilderComponent[] = [
  {
    id: "comp_header_hematology",
    type: "section_header",
    label: "HEMATOLOGY",
    fieldKey: "hematology_section",
    order: 1,
    settings: {
      sectionHeader: "HEMATOLOGY",
      width: "FULL",
      alignment: "left",
      showInPreview: true,
    },
    validation: {},
  },
];

export default function TemplateBuilder({
  initialTemplate,
  onBackToLibrary,
}: TemplateBuilderProps) {
  const [templateName, setTemplateName] = useState(
    initialTemplate?.form_name || ""
  );
  const [category, setCategory] = useState(
    initialTemplate?.service_id || "Hematology"
  );
  const [components, setComponents] = useState<BuilderComponent[]>(
    initialTemplate?.components
      ? [...initialTemplate.components]
      : DEFAULT_NEW_COMPONENTS
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    initialTemplate?.components?.[0]?.id || DEFAULT_NEW_COMPONENTS[0].id
  );
  const [showPreview, setShowPreview] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const isEditMode = Boolean(initialTemplate);

  const handleAddComponent = (type: ComponentType, targetIndex?: number) => {
    const tempId = `comp_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 6)}`;

    const defaultLabels: Record<ComponentType, string> = {
      text_field: "Text Field",
      number_field: "Number Field",
      checkbox: "Checkbox",
      date_field: "Date Field",
      table: "Table",
      section_header: "SECTION HEADER",
      static_text: "Informational notice text.",
      line_divider: "Divider",
      image: "Image",
    };

    const newComponent: BuilderComponent = {
      id: tempId,
      type,
      label: defaultLabels[type] || "New Component",
      fieldKey: `field_${Date.now().toString().slice(-4)}`,
      order: components.length + 1,
      settings: {
        width: type === "section_header" || type === "line_divider" || type === "table" ? "FULL" : "1/2",
        alignment: "left",
        showInPreview: true,
        required: false,
        placeholder: type === "number_field" ? "0.00" : "Enter value",
        checkboxOptions: type === "checkbox" ? ["Option 1", "Option 2"] : undefined,
        tableColumns:
          type === "table"
            ? [
                { id: "col_1", header: "Parameter", type: "text" },
                { id: "col_2", header: "Result", type: "text" },
                { id: "col_3", header: "Reference", type: "text" },
              ]
            : undefined,
      },
      validation: {
        inputType: type === "number_field" ? "Number" : "Text",
      },
    };

    if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= components.length) {
      const updated = [...components];
      updated.splice(targetIndex, 0, newComponent);
      setComponents(updated.map((c, i) => ({ ...c, order: i + 1 })));
    } else {
      setComponents([...components, newComponent]);
    }

    setSelectedId(tempId);
  };

  const handleUpdateComponent = (updated: BuilderComponent) => {
    setComponents(
      components.map((c) => (c.id === updated.id ? updated : c))
    );
  };

  const handleDeleteComponent = (id: string) => {
    const filtered = components.filter((c) => c.id !== id);
    setComponents(filtered.map((c, i) => ({ ...c, order: i + 1 })));
    if (selectedId === id) {
      setSelectedId(filtered[0]?.id || null);
    }
  };

  const handleDuplicateComponent = (id: string) => {
    const index = components.findIndex((c) => c.id === id);
    if (index === -1) return;

    const source = components[index];
    const newId = `comp_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 6)}`;

    const duplicate: BuilderComponent = {
      ...source,
      id: newId,
      label: `${source.label} (Copy)`,
      fieldKey: `${source.fieldKey}_copy`,
      settings: { ...source.settings },
      validation: { ...source.validation },
    };

    const updated = [...components];
    updated.splice(index + 1, 0, duplicate);
    setComponents(updated.map((c, i) => ({ ...c, order: i + 1 })));
    setSelectedId(newId);
  };

  const handleReorderComponent = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex < 0 ||
      fromIndex >= components.length ||
      toIndex < 0 ||
      toIndex > components.length
    ) {
      return;
    }

    const updated = [...components];
    const [moved] = updated.splice(fromIndex, 1);
    const destination = toIndex > fromIndex ? toIndex - 1 : toIndex;
    updated.splice(destination, 0, moved);
    setComponents(updated.map((c, i) => ({ ...c, order: i + 1 })));
  };

  const triggerPrototypeNotice = (action: string) => {
    setNoticeMessage(
      `Prototype only — ${action} is not connected to the database yet.`
    );
    setTimeout(() => setNoticeMessage(null), 4000);
  };

  const selectedComponent =
    components.find((c) => c.id === selectedId) || null;

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Notice Banner */}
      {noticeMessage && (
        <div className="bg-sky-50 border border-sky-200 text-sky-800 text-xs px-4 py-3 rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle size={16} className="text-sky-600 flex-shrink-0" />
            <span>{noticeMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setNoticeMessage(null)}
            className="text-sky-600 hover:text-sky-800 font-bold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Breadcrumbs & Preview Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
          <button
            type="button"
            onClick={onBackToLibrary}
            className="hover:text-gray-900 transition-colors cursor-pointer"
          >
            Templates
          </button>
          <span>&gt;</span>
          <span className="text-gray-900">
            {isEditMode ? initialTemplate?.form_name || "Edit Template" : "New Template"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Eye size={14} />
          <span>Preview</span>
        </button>
      </div>

      {/* Top Header Card */}
      <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Blue placeholder square */}
          <div className="w-12 h-12 rounded-2xl bg-sky-400 flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">
              Template Name
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Complete Blood Count"
              className="w-full px-4 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-sky-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-400"
            >
              <option value="Hematology">Hematology</option>
              <option value="Consultations">Consultations</option>
              <option value="Urinalysis">Urinalysis</option>
              <option value="Fecalysis">Fecalysis</option>
              <option value="Radiology">Radiology</option>
              <option value="Others">Others</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">
              Status
            </label>
            <span className="inline-block px-3 py-1.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold uppercase tracking-wider">
              {initialTemplate?.status || "Draft"}
            </span>
          </div>

          <div className="hidden sm:block">
            <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">
              Template ID
            </label>
            <input
              type="text"
              disabled
              value={
                initialTemplate?.form_id || "Generated after saving"
              }
              className="w-44 px-3 py-2 border border-gray-200 bg-gray-50 text-gray-400 rounded-xl text-xs font-mono select-none"
            />
          </div>
        </div>
      </div>

      {/* THREE COLUMN BUILDER WORKSPACE */}
      <div className="flex flex-col lg:flex-row items-stretch gap-5">
        {/* LEFT PALETTE */}
        <ComponentPalette onAddComponent={handleAddComponent} />

        {/* CENTER CANVAS */}
        <BuilderCanvas
          components={components}
          selectedId={selectedId}
          onSelectComponent={setSelectedId}
          onDeleteComponent={handleDeleteComponent}
          onDuplicateComponent={handleDuplicateComponent}
          onReorderComponent={handleReorderComponent}
          onDropFromPalette={handleAddComponent}
        />

        {/* RIGHT SETTINGS PANEL */}
        <ComponentSettings
          component={selectedComponent}
          onUpdateComponent={handleUpdateComponent}
          onDeleteComponent={handleDeleteComponent}
          allFieldKeys={components.map((c) => c.fieldKey)}
        />
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="bg-white border border-gray-200 rounded-3xl px-6 py-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
          <CheckCircle2 size={16} className="text-emerald-500" />
          <span>In-Memory Prototype Session</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToLibrary}
            className="px-5 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => triggerPrototypeNotice("template saving")}
            className="px-5 py-2.5 rounded-xl border border-sky-300 hover:bg-sky-50 text-sky-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => triggerPrototypeNotice("publishing template")}
            className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            Publish Template
          </button>
        </div>
      </div>

      {/* LIVE REPORT PREVIEW MODAL */}
      {showPreview && (
        <TemplatePreview
          templateName={templateName}
          category={category}
          components={components}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}


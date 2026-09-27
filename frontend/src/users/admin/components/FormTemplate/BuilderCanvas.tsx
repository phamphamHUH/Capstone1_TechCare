import { useState } from "react";
import {
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from "lucide-react";
import type { BuilderComponent, ComponentType } from "../../../../interface/FormTemplate";

interface BuilderCanvasProps {
  components: BuilderComponent[];
  selectedId: string | null;
  onSelectComponent: (id: string) => void;
  onDeleteComponent: (id: string) => void;
  onDuplicateComponent: (id: string) => void;
  onReorderComponent: (fromIndex: number, toIndex: number) => void;
  onDropFromPalette: (type: ComponentType, targetIndex?: number) => void;
}

export default function BuilderCanvas({
  components,
  selectedId,
  onSelectComponent,
  onDeleteComponent,
  onDuplicateComponent,
  onReorderComponent,
  onDropFromPalette,
}: BuilderCanvasProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    index: number;
    side: "left" | "right" | "top" | "bottom";
  } | null>(null);
  const [isPaletteOverCanvas, setIsPaletteOverCanvas] = useState(false);

  const handleDragOverCanvas = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsPaletteOverCanvas(true);
  };

  const handleDragLeaveCanvas = () => {
    setIsPaletteOverCanvas(false);
  };

  const handleDropOnCanvas = (e: React.DragEvent, targetIndex?: number) => {
    e.preventDefault();
    setIsPaletteOverCanvas(false);
    setDropTarget(null);

    const rawData = e.dataTransfer.getData("application/json");
    if (rawData) {
      try {
        const parsed = JSON.parse(rawData);
        if (parsed.fromPalette && parsed.type) {
          onDropFromPalette(parsed.type, targetIndex);
          return;
        }
      } catch {
        // Continue
      }
    }

    if (draggedIndex !== null && targetIndex !== undefined) {
      if (draggedIndex !== targetIndex) {
        onReorderComponent(draggedIndex, targetIndex);
      }
      setDraggedIndex(null);
    }
  };

  const handleDragOverComponent = (
    e: React.DragEvent,
    index: number,
    comp: BuilderComponent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";

    const rect = e.currentTarget.getBoundingClientRect();
    const isHalfOrLess = comp.settings.width && comp.settings.width !== "FULL";

    if (isHalfOrLess) {
      const isRight = e.clientX > rect.left + rect.width / 2;
      setDropTarget({
        index: isRight ? index + 1 : index,
        side: isRight ? "right" : "left",
      });
    } else {
      const isBottom = e.clientY > rect.top + rect.height / 2;
      setDropTarget({
        index: isBottom ? index + 1 : index,
        side: isBottom ? "bottom" : "top",
      });
    }
  };

  const getDropIndicatorClass = (index: number) => {
    if (!dropTarget) return "";
    if (dropTarget.side === "left" && dropTarget.index === index) {
      return "border-l-4 border-l-sky-500 ring-2 ring-sky-300";
    }
    if (dropTarget.side === "right" && dropTarget.index === index + 1) {
      return "border-r-4 border-r-sky-500 ring-2 ring-sky-300";
    }
    if (dropTarget.side === "top" && dropTarget.index === index) {
      return "border-t-4 border-t-sky-500 ring-2 ring-sky-300";
    }
    if (dropTarget.side === "bottom" && dropTarget.index === index + 1) {
      return "border-b-4 border-b-sky-500 ring-2 ring-sky-300";
    }
    return "";
  };

  const getWidthClass = (width?: string) => {
    switch (width) {
      case "1/4":
        return "w-full sm:w-[calc(25%-0.75rem)] flex-shrink-0";
      case "1/3":
        return "w-full sm:w-[calc((100%-2rem)/3)] flex-shrink-0";
      case "1/2":
        return "w-full sm:w-[calc(50%-0.5rem)] flex-shrink-0";
      case "FULL":
      default:
        return "w-full flex-shrink-0";
    }
  };

  return (
    <div className="flex-1 min-w-0 bg-white border border-dashed border-sky-300 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-sm overflow-y-auto max-h-[calc(100vh-140px)]">
      {/* Clinic Header */}
      <div className="relative border-b border-gray-100 pb-5">
        <div className="flex flex-col items-center text-center">
          <img
            src="/assets/reyna-g-logo.png"
            alt="Reyna G Logo"
            className="w-16 h-16 object-contain mb-1"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
          <h2 className="text-base font-bold text-gray-900">
            Reyna G Diagnostic Medical Clinic
          </h2>
          <p className="text-xs text-gray-500">
            Address St. Address 1234 chu chu
          </p>
          <p className="text-xs text-gray-500">0912-345-6789</p>
        </div>

        <div className="absolute right-0 top-0 text-[11px] text-gray-400 text-right leading-relaxed select-none hidden sm:block">
          <div>REPORT ID : &nbsp;[PENDING]</div>
          <div>LAB RESULT ID: [PENDING]</div>
          <div>REQUEST ID: &nbsp;&nbsp;[PENDING]</div>
        </div>
      </div>

      {/* Patient Information Placeholder Header */}
      <div className="bg-sky-100/70 border border-sky-200 text-sky-800 text-xs font-bold px-4 py-2 rounded-lg tracking-wider uppercase select-none">
        Patient Information
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-500 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100 select-none">
        <div>
          <span className="text-gray-400 block text-[10px]">Patient Name:</span>
          <span className="font-medium text-gray-700">Sample Patient</span>
        </div>
        <div>
          <span className="text-gray-400 block text-[10px]">Age / Sex:</span>
          <span className="font-medium text-gray-700">32 / Male</span>
        </div>
        <div>
          <span className="text-gray-400 block text-[10px]">Date of Birth:</span>
          <span className="font-medium text-gray-700">1994-05-12</span>
        </div>
        <div>
          <span className="text-gray-400 block text-[10px]">Physician:</span>
          <span className="font-medium text-gray-700">Dr. LeBron R. James</span>
        </div>
      </div>

      {/* DYNAMIC CANVAS COMPONENTS */}
      <div
        onDragOver={handleDragOverCanvas}
        onDragLeave={handleDragLeaveCanvas}
        onDrop={(e) => handleDropOnCanvas(e, components.length)}
        className={`flex flex-wrap gap-4 w-full p-1 rounded-2xl transition-all ${
          isPaletteOverCanvas ? "bg-sky-50/40 border-2 border-dashed border-sky-400" : ""
        }`}
      >
        {components.map((comp, index) => {
          const isSelected = comp.id === selectedId;
          const dropIndicator = getDropIndicatorClass(index);

          return (
            <div
              key={comp.id}
              draggable
              onDragStart={(e) => {
                setDraggedIndex(index);
                e.dataTransfer.setData("text/plain", index.toString());
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => handleDragOverComponent(e, index, comp)}
              onDrop={(e) => {
                e.stopPropagation();
                const targetIdx = dropTarget ? dropTarget.index : index;
                setDropTarget(null);
                handleDropOnCanvas(e, targetIdx);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectComponent(comp.id);
              }}
              className={`${getWidthClass(
                comp.settings.width
              )} group relative p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                isSelected
                  ? "border-sky-500 bg-sky-50/20 ring-2 ring-sky-200 shadow-sm"
                  : "border-gray-200 hover:border-sky-300 bg-white"
              } ${dropIndicator}`}
            >
              {/* Floating Component Action Bar */}
              <div
                className={`absolute right-2 top-2 z-10 flex items-center gap-1 bg-white/95 border border-gray-200 rounded-lg p-0.5 shadow-sm transition-opacity ${
                  isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => onReorderComponent(index, index - 1)}
                  className="p-1 text-gray-500 hover:text-sky-600 disabled:opacity-30 cursor-pointer"
                  title="Move up"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  disabled={index === components.length - 1}
                  onClick={() => onReorderComponent(index, index + 1)}
                  className="p-1 text-gray-500 hover:text-sky-600 disabled:opacity-30 cursor-pointer"
                  title="Move down"
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onDuplicateComponent(comp.id)}
                  className="p-1 text-gray-500 hover:text-sky-600 cursor-pointer"
                  title="Duplicate component"
                >
                  <Copy size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteComponent(comp.id)}
                  className="p-1 text-gray-500 hover:text-red-500 cursor-pointer"
                  title="Delete component"
                >
                  <Trash2 size={13} />
                </button>
                <div className="text-gray-300 cursor-grab px-0.5">
                  <GripVertical size={14} />
                </div>
              </div>

              {/* COMPONENT RENDER PREVIEW */}
              {comp.type === "section_header" && (
                <div className="bg-sky-100/70 border border-sky-200 text-sky-800 text-xs font-bold px-3.5 py-1.5 rounded-lg tracking-wider uppercase">
                  {comp.settings.sectionHeader || comp.label}
                </div>
              )}

              {comp.type === "static_text" && (
                <p className="text-xs text-gray-600 leading-relaxed">
                  {comp.settings.staticText || comp.label}
                </p>
              )}

              {comp.type === "line_divider" && (
                <hr
                  className={`my-1 ${
                    comp.settings.dividerStyle === "dashed"
                      ? "border-dashed"
                      : comp.settings.dividerStyle === "dotted"
                      ? "border-dotted"
                      : "border-solid"
                  } border-gray-300`}
                />
              )}

              {comp.type === "text_field" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {comp.label}
                    {comp.settings.required && (
                      <span className="text-red-500 ml-0.5">*</span>
                    )}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      disabled
                      placeholder={comp.settings.placeholder || "Enter text"}
                      className="flex-1 px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
                    />
                    {comp.settings.unit && (
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                        {comp.settings.unit}
                      </span>
                    )}
                  </div>
                  {comp.settings.referenceRange && (
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      Ref: {comp.settings.referenceRange}
                    </span>
                  )}
                </div>
              )}

              {comp.type === "number_field" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {comp.label}
                    {comp.settings.required && (
                      <span className="text-red-500 ml-0.5">*</span>
                    )}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      disabled
                      placeholder={comp.settings.placeholder || "0.00"}
                      className="flex-1 px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
                    />
                    {comp.settings.unit && (
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                        {comp.settings.unit}
                      </span>
                    )}
                  </div>
                  {comp.settings.referenceRange && (
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      Ref: {comp.settings.referenceRange}
                    </span>
                  )}
                </div>
              )}

              {comp.type === "checkbox" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    {comp.label}
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {(comp.settings.checkboxOptions || ["Option 1", "Option 2"]).map(
                      (opt, i) => (
                        <label
                          key={i}
                          className="flex items-center gap-1.5 text-xs text-gray-600"
                        >
                          <input
                            type="checkbox"
                            disabled
                            className="rounded border-gray-300 text-sky-500"
                          />
                          <span>{opt}</span>
                        </label>
                      )
                    )}
                  </div>
                </div>
              )}

              {comp.type === "date_field" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {comp.label}
                  </label>
                  <input
                    type="date"
                    disabled
                    className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-500"
                  />
                </div>
              )}

              {comp.type === "table" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    {comp.label}
                  </label>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                        <tr>
                          {(
                            comp.settings.tableColumns || [
                              { id: "1", header: "Parameter" },
                              { id: "2", header: "Result" },
                              { id: "3", header: "Unit" },
                              { id: "4", header: "Normal Range" },
                            ]
                          ).map((col) => (
                            <th key={col.id} className="p-2">
                              {col.header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-100 text-gray-400">
                          {(comp.settings.tableColumns || [1, 2, 3, 4]).map(
                            (_, i) => (
                              <td key={i} className="p-2 italic">
                                Sample entry
                              </td>
                            )
                          )}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {comp.type === "image" && (
                <div className="border border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-center text-gray-400 bg-gray-50">
                  <span className="text-xs font-medium">Image Component</span>
                  <span className="text-[10px] text-gray-400">
                    Placeholder for diagnostic scans or signatures
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* DROP ZONE ABOVE REMARKS */}
      <div
        onDragOver={handleDragOverCanvas}
        onDragLeave={handleDragLeaveCanvas}
        onDrop={(e) => handleDropOnCanvas(e, components.length)}
        className={`w-full py-4 border-2 border-dashed rounded-2xl flex items-center justify-center text-xs font-bold transition-all select-none cursor-pointer ${
          isPaletteOverCanvas
            ? "border-sky-500 bg-sky-100/70 text-sky-700 scale-[1.01]"
            : "border-sky-300 bg-sky-50/60 hover:bg-sky-50 text-sky-600"
        }`}
      >
        + DRAG COMPONENTS HERE
      </div>

      {/* Remarks Section */}
      <div className="flex flex-col gap-2 pt-2 transition-all">
        <div className="bg-sky-100/70 border border-sky-200 text-sky-800 text-xs font-bold px-4 py-2 rounded-lg tracking-wider uppercase select-none">
          Remarks
        </div>

        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 select-none">
          <textarea
            disabled
            rows={2}
            placeholder="Pathologist or Medical Technologist remarks and findings..."
            className="w-full bg-transparent border-0 text-xs text-gray-400 focus:outline-none resize-none"
          />
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import {
  Type,
  CheckSquare,
  Calendar,
  Table as TableIcon,
  Heading,
  AlignLeft,
  Minus,
  Image as ImageIcon,
} from "lucide-react";
import type { ComponentType } from "../../../../interface/FormTemplate";

interface PaletteItem {
  type: ComponentType;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

interface ComponentPaletteProps {
  onAddComponent: (type: ComponentType) => void;
}

const FIELD_ITEMS: PaletteItem[] = [
  {
    type: "text_field",
    title: "Text Field",
    subtitle: "Text Output",
    icon: <Type size={22} className="text-gray-600" />,
  },
  {
    type: "number_field",
    title: "Number Field",
    subtitle: "Numeric Output",
    icon: <span className="font-bold text-lg text-gray-600">123</span>,
  },
  {
    type: "checkbox",
    title: "Checkbox",
    subtitle: "Multiple Selections",
    icon: <CheckSquare size={22} className="text-gray-600" />,
  },
  {
    type: "date_field",
    title: "Date Field",
    subtitle: "Date Selection",
    icon: <Calendar size={22} className="text-gray-600" />,
  },
  {
    type: "table",
    title: "Table",
    subtitle: "Tabular Data Input",
    icon: <TableIcon size={22} className="text-gray-600" />,
  },
];

const LAYOUT_ITEMS: PaletteItem[] = [
  {
    type: "section_header",
    title: "Section Header",
    subtitle: "Group Sections",
    icon: <Heading size={22} className="text-gray-600" />,
  },
  {
    type: "static_text",
    title: "Static Text",
    subtitle: "Display text/Labels",
    icon: <AlignLeft size={22} className="text-gray-600" />,
  },
  {
    type: "line_divider",
    title: "Line Divider",
    subtitle: "Visual Seperator",
    icon: <Minus size={22} className="text-gray-600" />,
  },
  {
    type: "image",
    title: "Image",
    subtitle: "Insert Images",
    icon: <ImageIcon size={22} className="text-gray-600" />,
  },
];

export default function ComponentPalette({
  onAddComponent,
}: ComponentPaletteProps) {
  const [activeTab, setActiveTab] = useState<"fields" | "layout">("fields");

  const items = activeTab === "fields" ? FIELD_ITEMS : LAYOUT_ITEMS;

  const handleDragStart = (e: React.DragEvent, type: ComponentType) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ fromPalette: true, type })
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <aside className="w-72 flex-shrink-0 bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-4 shadow-sm">
      <div>
        <h3 className="font-semibold text-gray-900 text-sm">Add Components</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Drag and drop components to design your template.
        </p>
      </div>

      <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab("fields")}
          className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "fields"
              ? "bg-white text-sky-600 shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Fields
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("layout")}
          className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "layout"
              ? "bg-white text-sky-600 shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Layout
        </button>
      </div>

      <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
        {items.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => handleDragStart(e, item.type)}
            onClick={() => onAddComponent(item.type)}
            className="flex items-center gap-3.5 p-3 rounded-xl border border-gray-200 bg-white hover:border-sky-400 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all select-none group"
          >
            <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:bg-sky-50 group-hover:border-sky-200 transition-colors">
              {item.icon}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-gray-800 group-hover:text-sky-600">
                {item.title}
              </span>
              <span className="text-[11px] text-gray-400">
                {item.subtitle}
              </span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

import { useState } from "react";
import type { FormTemplate } from "../../../../interface/FormTemplate";
import {
  Search,
  Clock,
  Eye,
  Edit,
  Trash2,
  X,
  Plus,
} from "lucide-react";
import TemplatePreview from "./TemplatePreview";

interface TemplateLibraryProps {
  templates: FormTemplate[];
  onCreateNew: () => void;
  onEditTemplate: (template: FormTemplate) => void;
  onDeleteTemplate: (fixtureId: string) => void;
}

const CATEGORIES = [
  "All Templates",
  "Hematology",
  "Consultations",
  "Urinalysis",
  "Fecalysis",
  "Radiology",
  "Others",
];

export default function TemplateLibrary({
  templates,
  onCreateNew,
  onEditTemplate,
  onDeleteTemplate,
}: TemplateLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState("All Templates");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("most_used");
  const [selectedTemplate, setSelectedTemplate] =
    useState<FormTemplate | null>(templates[0] || null);
  const [previewTemplate, setPreviewTemplate] =
    useState<FormTemplate | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Filter templates
  const filteredTemplates = templates.filter((tpl) => {
    const matchesCat =
      selectedCategory === "All Templates" ||
      tpl.service_id.toLowerCase() === selectedCategory.toLowerCase();

    const matchesSearch =
      tpl.form_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.service_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tpl.form_description &&
        tpl.form_description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCat && matchesSearch;
  });

  // Sort templates
  // const sortedTemplates = [...filteredTemplates].sort((a, b) => {
  //   if (sortBy === "name_asc") return a.form_name.localeCompare(b.form_name);
  //   if (sortBy === "name_desc") return b.form_name.localeCompare(a.form_name);
  //  if (sortBy === "recently_updated") return 0;
  //  return (b.usageCount || 0) - (a.usageCount || 0);
  //});

  const getCategoryCount = (cat: string) => {
    if (cat === "All Templates") return templates.length;
    return templates.filter(
      (t) => t.service_id.toLowerCase() === cat.toLowerCase()
    ).length;
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Breadcrumbs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
          <span className="text-gray-900">Templates</span>
        </div>
      </div>

      {/* Top Header Card */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-200/80 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Form Template Library
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Add, Edit, or Preview Templates
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-64">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Template.."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-sky-400 bg-white"
            />
          </div>

          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-400"
          >
            <option value="most_used">Sort by: Most Used</option>
            <option value="recently_updated">Sort by: Recently Updated</option>
            <option value="name_asc">Sort by: Name: A–Z</option>
            <option value="name_desc">Sort by: Name: Z–A</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Categories Sidebar */}
        <div className="w-full lg:w-56 flex-shrink-0 flex flex-col gap-3">
          <div className="text-xs font-bold text-sky-600 uppercase tracking-wider px-2">
            Categories
          </div>

          <div className="flex flex-col gap-1.5">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-sky-100/80 text-sky-700 shadow-xs"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <span className="capitalize">{cat}</span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full ${
                      isActive
                        ? "bg-sky-200/80 text-sky-800"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {getCategoryCount(cat)}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onCreateNew}
            className="mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-sky-400 text-sky-600 hover:bg-sky-50 text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus size={16} />
            <span>Create New Template</span>
          </button>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 min-w-0">
          <div
            className={`grid gap-4 ${
              selectedTemplate
                ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
            }`}
          >
            {filteredTemplates.map((tpl) => {
              const isSelected = selectedTemplate?.form_id === tpl.form_id;
              return (
                <div
                  key={tpl.form_id}
                  onClick={() => setSelectedTemplate(tpl)}
                  className={`bg-white border rounded-2xl p-4 flex flex-col justify-between h-44 transition-all cursor-pointer shadow-xs hover:shadow-sm ${
                    isSelected
                      ? "border-sky-500 ring-2 ring-sky-200 bg-sky-50/20"
                      : "border-gray-200 hover:border-sky-300"
                  }`}
                >
                  <div>
                    {/* Blue circle placeholder */}
                    <div className="w-10 h-10 rounded-full bg-sky-300/80 mb-3" />
                    <h4 className="font-bold text-gray-900 text-xs truncate">
                      {tpl.form_name}
                    </h4>
                    <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                      S-123-456-789
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-gray-400" />
                      {/* <span>{tpl.usageCount || 0} times</span> */}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTemplate(tpl);
                      }}
                      className="px-2.5 py-1 text-sky-600 hover:bg-sky-50 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Details
                    </button>
                  </div>
                </div>
              );
            })}

      
            {Array.from({
              length: Math.max(0, 11 - filteredTemplates.length),
            }).map((_, i) => (
              <div
                key={`placeholder-${i}`}
                className="border border-gray-200/80 rounded-2xl p-4 h-44 flex items-center justify-center bg-gray-50/40 select-none"
              />
            ))}
          </div>

          {/* PAALIS LANG NG LINE 231 TO 239 PAG GUSTO ALISIN YUNG PLACEHOLDERS */}
        

  
          <div className="flex items-center justify-between mt-8 text-xs text-gray-500">
            <span>
              Showing 1 - {filteredTemplates.length} of {templates.length} templates
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 cursor-pointer"
              >
                &lt;
              </button>
              <button
                type="button"
                className="w-7 h-7 rounded-lg bg-sky-500 text-white font-bold flex items-center justify-center shadow-xs"
              >
                1
              </button>
              <button
                type="button"
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 cursor-pointer"
              >
                2
              </button>
              <button
                type="button"
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 cursor-pointer"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>

        {/* Right Details Drawer */}
        {selectedTemplate && (
          <aside className="w-full lg:w-80 flex-shrink-0 bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm animate-fade-in">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-bold text-gray-900 text-sm">
                  Template Details
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(null)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-sky-200/80 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">
                    {selectedTemplate.form_name}
                  </h4>
                  <span className="text-xs text-gray-500">
                    {selectedTemplate.service_id || "No Service ID"}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                {selectedTemplate.form_description ||
                  "No description provided for this template."}
              </p>

              <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Category:</span>
                  <span className="font-medium text-gray-800">
                    {selectedTemplate.service_id || "Uncategorized"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Components:</span>
                  <span className="font-medium text-gray-800">
                    {/* {selectedTemplate.components.length} Fields */}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Last Updated:</span>
                  <span className="font-medium text-gray-800">
                    {selectedTemplate.updated_at || "Recently"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Created By:</span>
                  <span className="font-medium text-gray-800">
                    {selectedTemplate.created_by || "Administrator"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Usage:</span>
                  <span className="font-medium text-gray-800">
                    {/* {selectedTemplate.usageCount || 0} times */}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-6">
              <button
                type="button"
                onClick={() => setPreviewTemplate(selectedTemplate)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-sky-300 text-sky-600 hover:bg-sky-50 text-xs font-bold transition-colors cursor-pointer"
              >
                <Eye size={14} />
                <span>Preview Template</span>
              </button>

              <button
                type="button"
                onClick={() => onEditTemplate(selectedTemplate)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-sky-300 text-sky-600 hover:bg-sky-50 text-xs font-bold transition-colors cursor-pointer"
              >
                <Edit size={14} />
                <span>Edit Template</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Delete Template</span>
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedTemplate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-200 text-center">
            <h4 className="font-bold text-gray-900 text-sm mb-1">
              Delete Template?
            </h4>
            <p className="text-xs text-gray-500 mb-6">
              Are you sure you want to delete{" "}
              <span className="font-bold text-gray-700">
                "{selectedTemplate.form_name}"
              </span>
              ? This action will remove it from the library during this session.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 text-xs font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTemplate(selectedTemplate.form_id);
                  setShowDeleteConfirm(false);
                  setSelectedTemplate(null);
                }}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {previewTemplate && (
        <TemplatePreview
          templateName={previewTemplate.form_name}
          category={previewTemplate.service_id || "Uncategorized"}
          components={previewTemplate.components}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </div>
  );
}


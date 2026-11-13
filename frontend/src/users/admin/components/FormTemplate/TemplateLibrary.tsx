import EmptyState from "../../../../components/EmptyState";
import { LoadingSpinner } from "../../../../components/LoadingScreen";
import ServiceCategoryIcon from "../../../../components/ServiceCategoryIcon";
import { useMemo, useState } from "react";
import api from "#lib/axios";
import type { FormTemplate } from "../../../../interface/FormTemplate";
import { dbComponentToBuilderComponent } from "../../../../interface/FormTemplate";
import type { ServiceOption } from "../../pages/FormTemplate";
import { Search, Clock, Eye, Edit, Trash2, X, Plus } from "lucide-react";
import TemplatePreview from "./TemplatePreview";
import {
  PAPER_LABELS,
  templatePaperSize,
} from "../../../../utils/templatePaper";

interface TemplateLibraryProps {
  templates: FormTemplate[];
  services: ServiceOption[];
  onCreateNew: () => void;
  onEditTemplate: (template: FormTemplate) => void;
  onDeleteTemplate: (formId: string) => void;
}

type SortOption = "recently_updated" | "name_asc" | "name_desc";
type StatusFilter = "Current" | "Published" | "Draft" | "Archived";

const UNCATEGORIZED = "Others";

const STATUS_STYLES: Record<string, string> = {
  Published: "bg-emerald-50 text-emerald-700",
  Draft: "bg-amber-50 text-amber-700",
  Archived: "bg-gray-100 text-gray-500",
};

const SELECT_CLASS =
  "px-3.5 py-2 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-400";

export default function TemplateLibrary({
  templates,
  services,
  onCreateNew,
  onEditTemplate,
  onDeleteTemplate,
}: TemplateLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState("All Templates");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recently_updated");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Current");

  // Selection is stored as an id and derived from the list, so the drawer
  // never shows stale data after a refetch.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedTemplate =
    templates.find((t) => t.form_id === selectedId) ?? null;

  const [previewTemplate, setPreviewTemplate] = useState<FormTemplate | null>(
    null,
  );
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const serviceIdToName = useMemo(() => {
    const map: Record<string, string> = {};
    services.forEach((s) => {
      map[s.service_id] = s.service_name;
    });
    return map;
  }, [services]);

  const serviceIdToService = useMemo(() => {
    const map: Record<string, ServiceOption> = {};
    services.forEach((s) => {
      map[s.service_id] = s;
    });
    return map;
  }, [services]);

  const serviceIdToCategory = useMemo(() => {
    const map: Record<string, string> = {};
    services.forEach((s) => {
      map[s.service_id] = s.service_category || s.service_type || UNCATEGORIZED;
    });
    return map;
  }, [services]);

  const getServiceName = (serviceId: string) =>
    serviceIdToName[serviceId] || UNCATEGORIZED;

  const getCategoryName = (serviceId: string) =>
    serviceIdToCategory[serviceId] || UNCATEGORIZED;

  const categories = useMemo(() => {
    const names = new Set(
      services
        .map((s) => s.service_category || s.service_type)
        .filter((name): name is string => Boolean(name)),
    );
    return ["All Templates", ...Array.from(names).sort(), UNCATEGORIZED];
  }, [services]);

  const statusVisible = useMemo(
    () =>
      templates.filter((t) =>
        statusFilter === "Current"
          ? t.status !== "Archived"
          : t.status === statusFilter,
      ),
    [templates, statusFilter],
  );

  const sortedTemplates = useMemo(() => {
    const q = searchQuery.toLowerCase();

    const filtered = statusVisible.filter((tpl) => {
      const tplCategory = serviceIdToCategory[tpl.service_id] || UNCATEGORIZED;
      const serviceName = serviceIdToName[tpl.service_id] || UNCATEGORIZED;

      const matchesCat =
        selectedCategory === "All Templates" ||
        tplCategory === selectedCategory;

      const matchesSearch =
        tpl.form_name.toLowerCase().includes(q) ||
        serviceName.toLowerCase().includes(q) ||
        tplCategory.toLowerCase().includes(q) ||
        (tpl.form_description?.toLowerCase().includes(q) ?? false);

      return matchesCat && matchesSearch;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "name_asc") return a.form_name.localeCompare(b.form_name);
      if (sortBy === "name_desc") return b.form_name.localeCompare(a.form_name);
      return (
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });
  }, [
    statusVisible,
    serviceIdToCategory,
    serviceIdToName,
    selectedCategory,
    searchQuery,
    sortBy,
  ]);

  const getCategoryCount = (cat: string) => {
    if (cat === "All Templates") return statusVisible.length;
    return statusVisible.filter(
      (t) => (serviceIdToCategory[t.service_id] || UNCATEGORIZED) === cat,
    ).length;
  };

  const versionHistory =
    selectedTemplate && selectedTemplate.template_key
      ? templates
          .filter((t) => t.template_key === selectedTemplate.template_key)
          .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))
      : [];

  const handlePreviewClick = async (tpl: FormTemplate) => {
    setPreviewLoadingId(tpl.form_id);
    try {
      const response = await api.get(
        `/api/admin/form-templates/${tpl.form_id}`,
      );

      const fullTemplate: FormTemplate = {
        ...response.data.formTemplate,
        components: (response.data.components ?? []).map(
          dbComponentToBuilderComponent,
        ),
      };

      setPreviewTemplate(fullTemplate);
    } catch (error) {
      console.error("Error fetching template for preview:", error);
      setPreviewTemplate(tpl);
    } finally {
      setPreviewLoadingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Breadcrumbs */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col items-centertext-xs font-semibold text-gray-500">
          <span className="text-2xl text-gray-900">Form Templates</span>
          <span className="text-sm text-gray-600 font-light">
            Create, edit, and delete form templates
          </span>
        </div>
      </div>

      {/* Top Header Card */}
      <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-md bg-sky-200/80 shrink-0" />
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-sky-400 bg-white"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setSelectedId(null);
            }}
            className={SELECT_CLASS}
          >
            <option value="Current">Show: Current</option>
            <option value="Published">Published</option>
            <option value="Draft">Drafts</option>
            <option value="Archived">Archived versions</option>
          </select>

          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className={SELECT_CLASS}
          >
            <option value="recently_updated">Sort by: Recently Updated</option>
            <option value="name_asc">Sort by: Name: A–Z</option>
            <option value="name_desc">Sort by: Name: Z–A</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Categories Sidebar */}
        <div className="w-full lg:w-56 shrink-0 flex flex-col gap-3">
          <div className="text-xs font-bold text-sky-600 uppercase tracking-wider px-2">
            Categories
          </div>

          <div className="flex flex-col gap-1.5">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
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
            className="mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-md border border-sky-400 text-sky-600 hover:bg-sky-50 text-xs font-bold transition-all shadow-xs cursor-pointer"
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
            {sortedTemplates.length === 0 && (
              <EmptyState
                className="col-span-full"
                message="No templates found."
                description={
                  searchQuery.trim()
                    ? "Try changing or clearing your search."
                    : "Create a template to get started."
                }
              />
            )}
            {sortedTemplates.map((tpl) => {
              const isSelected = selectedTemplate?.form_id === tpl.form_id;
              return (
                <div
                  key={tpl.form_id}
                  onClick={() => setSelectedId(tpl.form_id)}
                  className={`bg-white border rounded-md p-4 flex flex-col justify-between h-44 transition-all cursor-pointer shadow-xs hover:shadow-sm ${
                    isSelected
                      ? "border-sky-500 ring-2 ring-sky-200 bg-sky-50/20"
                      : "border-gray-200 hover:border-sky-300"
                  }`}
                >
                  <div>
                    <div className="w-10 h-10 rounded-full bg-sky-300/80 mb-3" />
                    <h4 className="font-bold text-gray-900 text-xs truncate">
                      {tpl.form_name}
                    </h4>
                    <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                      {tpl.service_id}
                    </span>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        STATUS_STYLES[tpl.status] ?? ""
                      }`}
                    >
                      {tpl.status} · v{tpl.version ?? 1}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                    <div className="flex items-center gap-1 min-w-0">
                      <Clock size={12} className="text-gray-400 shrink-0" />
                      <span className="truncate">
                        {getServiceName(tpl.service_id)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(tpl.form_id);
                      }}
                      className="px-2.5 py-1 text-sky-600 hover:bg-sky-50 rounded-md text-xs font-semibold cursor-pointer"
                    >
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 text-xs text-gray-500">
            Showing {sortedTemplates.length} of {statusVisible.length} templates
          </div>
        </div>

        {/* Right Details Drawer */}
        {selectedTemplate && (
          <aside className="w-full lg:w-80 shrink-0 bg-white border border-gray-200 rounded-md p-5 flex flex-col justify-between shadow-sm animate-fade-in">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-bold text-gray-900 text-sm">
                  Template Details
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-sky-200/80 shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">
                    {selectedTemplate.form_name}
                  </h4>
                  <span className="text-xs text-gray-500">
                    {getServiceName(selectedTemplate.service_id)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                {selectedTemplate.form_description ||
                  "No description provided for this template."}
              </p>

              <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-400">Status:</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      STATUS_STYLES[selectedTemplate.status] ?? ""
                    }`}
                  >
                    {selectedTemplate.status} · v{selectedTemplate.version ?? 1}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-400">Paper Size:</span>
                  <span className="font-medium text-gray-800">
                    {
                      PAPER_LABELS[
                        templatePaperSize(
                          selectedTemplate,
                          `${getServiceName(selectedTemplate.service_id)} ${getCategoryName(selectedTemplate.service_id)}`,
                        )
                      ]
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Service:</span>
                  <span className="font-medium text-gray-800">
                    {getServiceName(selectedTemplate.service_id)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Category:</span>
                  <span className="font-medium text-gray-800">
                    {getCategoryName(selectedTemplate.service_id)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Last Updated:</span>
                  <span className="font-medium text-gray-800">
                    {selectedTemplate.updated_at
                      ? new Date(selectedTemplate.updated_at).toLocaleString()
                      : "Recently"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Created By:</span>
                  <span className="font-medium text-gray-800">
                    {selectedTemplate.created_by || "Administrator"}
                  </span>
                </div>
              </div>

              {versionHistory.length > 1 && (
                <div className="pt-3 border-t border-gray-100">
                  <div className="text-[11px] font-semibold text-gray-400 uppercase mb-2">
                    Version history
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {versionHistory.map((v) => (
                      <button
                        key={v.form_id}
                        type="button"
                        onClick={() => setSelectedId(v.form_id)}
                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border text-xs text-left cursor-pointer ${
                          v.form_id === selectedTemplate.form_id
                            ? "border-sky-400 bg-sky-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <span className="font-medium">v{v.version ?? 1}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            STATUS_STYLES[v.status] ?? ""
                          }`}
                        >
                          {v.status}
                        </span>
                        <span className="text-gray-400">
                          {new Date(v.updated_at).toLocaleDateString()}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-6">
              <button
                type="button"
                onClick={() => handlePreviewClick(selectedTemplate)}
                disabled={previewLoadingId === selectedTemplate.form_id}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md border border-sky-300 text-sky-600 hover:bg-sky-50 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {previewLoadingId === selectedTemplate.form_id ? (
                  <LoadingSpinner size={14} />
                ) : (
                  <Eye size={14} />
                )}
                <span>
                  {previewLoadingId === selectedTemplate.form_id
                    ? "Loading Preview..."
                    : "Preview Template"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onEditTemplate(selectedTemplate)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md border border-sky-300 text-sky-600 hover:bg-sky-50 text-xs font-bold transition-colors cursor-pointer"
              >
                <Edit size={14} />
                <span>
                  {selectedTemplate.status === "Archived"
                    ? "Restore as New Version"
                    : "Edit Template"}
                </span>
              </button>

              {selectedTemplate.status === "Draft" && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Delete Draft</span>
                </button>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Delete Draft Confirmation Modal */}
      {showDeleteConfirm && selectedTemplate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-md max-w-sm w-full p-6 shadow-xl border border-gray-200 text-center">
            <h4 className="font-bold text-gray-900 text-sm mb-1">
              Delete this draft?
            </h4>
            <p className="text-xs text-gray-500 mb-6">
              <span className="font-bold text-gray-700">
                "{selectedTemplate.form_name}"
              </span>{" "}
              will be permanently deleted. Published versions are not affected.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 text-xs font-semibold rounded-md border border-gray-200 hover:bg-gray-50 text-gray-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTemplate(selectedTemplate.form_id);
                  setShowDeleteConfirm(false);
                  setSelectedId(null);
                }}
                className="flex-1 py-2 text-xs font-bold rounded-md bg-red-600 hover:bg-red-700 text-white cursor-pointer"
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
          paperSize={templatePaperSize(
            previewTemplate,
            `${getServiceName(previewTemplate.service_id)} ${getCategoryName(previewTemplate.service_id)}`,
          )}
          serviceName={getServiceName(previewTemplate.service_id)}
          category={getCategoryName(previewTemplate.service_id)}
          components={previewTemplate.components}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </div>
  );
}

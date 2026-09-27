import { useEffect, useState, useCallback } from "react";
import api from "#lib/axios";
import Header from "../../../components/Header";
import { INITIAL_TEMPLATES_LIST } from "../components/FormTemplate/sampleTemplates";
import TemplateLibrary from "../components/FormTemplate/TemplateLibrary";
import TemplateBuilder from "../components/FormTemplate/TemplateBuilder";
import type { FormTemplate } from "../../../interface/FormTemplate";
import { Loader2 } from "lucide-react"; // loader icon for fetching feedback

interface FormTemplateProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
  loadData: () => Promise<void>;
}

export default function FormTemplate({
  open,
  setOpen,
  loading,
  loadData,
}: FormTemplateProps) {
  const [viewMode, setViewMode] = useState<"library" | "builder">("library");
  
  // Initialized with an empty array instead of local dummy data (INITIAL_TEMPLATES_LIST)
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  
  // Added state for managing asynchronous API fetch loading and error feedback
  const [fetching, setFetching] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [formtemplates, setFormTemplates] = useState<FormTemplate[]>([]);

  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(
    null
  );

  // Added function to fetch form templates from GET /api/admin/form-templates
  const fetchFormTemplates = useCallback(async () => {
    setFetching(true);
    setFetchError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await api.get("api/admin/form-templates", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFormTemplates(response.data.formTemplates || []);

    } catch (error) {
      // IF API FAILS, ALSO FALLBACK TO SAMPLE DATA FOR TESTING
      setTemplates(INITIAL_TEMPLATES_LIST);
    }
    finally {
      setFetching(false);
    }
  }, []);

  // Automatically fetch templates when component mounts
  useEffect(() => {
    fetchFormTemplates();
  }, [fetchFormTemplates]);

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setViewMode("builder");
  };

  // Updated handleEditTemplate to fetch full form details & components from GET /api/admin/form-templates/:form_id
  const handleEditTemplate = async (template: FormTemplate) => {
    try {
      const token = localStorage.getItem("token");
      const formId = (template as unknown as Record<string, unknown>).form_id || template.form_id; // Ensure we have the correct form_id

      const response = await api.get(`api/admin/form-templates/${formId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Combine metadata and components before opening the builder
      const fullTemplate = {
        ...response.data.formTemplate,
        components: response.data.components,
      };

      setEditingTemplate(fullTemplate);
      setViewMode("builder");
    } catch (error) {
      console.error("Error fetching template details:", error);
      // Fallback to passing available template data if detailed request fails
      setEditingTemplate(template);
      setViewMode("builder");
    }
  };

  const handleDeleteTemplate = (fixtureId: string) => {
    setTemplates((prev) => prev.filter((t) => t.form_id !== fixtureId));
  };

  const handleBackToLibrary = () => {
    setViewMode("library");
    setEditingTemplate(null);
    fetchFormTemplates(); // Re-fetch templates list when exiting builder to get latest updates
  };

  return (
    <main className="flex-1 min-w-0 overflow-y-auto">
      <Header
        open={open}
        loading={loading}
        setOpen={setOpen}
        loadData={loadData}
        page="Form Templates"
      />

      <div className="mt-4 px-6">
        {/* CHANGED: Conditional UI rendering for Loading, Error, or Template Views */}
        {fetching ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            <span className="ml-2 text-sm text-gray-500">
              Loading form templates...
            </span>
          </div>
        ) : fetchError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
            <p className="font-semibold">{fetchError}</p>
            <button
              onClick={fetchFormTemplates}
              className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        ) : viewMode === "library" ? (
          <TemplateLibrary
            templates={formtemplates}
            onCreateNew={handleCreateNew}
            onEditTemplate={handleEditTemplate}
            onDeleteTemplate={handleDeleteTemplate}
          />
        ) : (
          <TemplateBuilder
            //initialTemplate={editingTemplate}
            onBackToLibrary={handleBackToLibrary}
          />
        )}
      </div>
    </main>
  );
}
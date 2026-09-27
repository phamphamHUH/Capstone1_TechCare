import { useEffect, useState, useCallback } from "react";
import api from "#lib/axios";
import Header from "../../../components/Header";
import TemplateLibrary from "../components/FormTemplate/TemplateLibrary";
import TemplateBuilder from "../components/FormTemplate/TemplateBuilder";
import {
  dbComponentToBuilderComponent,
  type FormTemplate,
} from "../../../interface/FormTemplate";
import { Loader2 } from "lucide-react";

export interface ServiceOption {
  service_id: string;
  service_name: string;
  service_type?: string;
}

interface FormTemplateProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
  loadData: () => Promise<void>;
}

function isValidFormTemplate(rec: any): rec is FormTemplate {
  return (
    rec &&
    typeof rec.form_id === "string" &&
    typeof rec.form_name === "string" &&
    typeof rec.service_id === "string" &&
    rec.service_id.length > 0
  );
}

function isValidService(rec: any): rec is ServiceOption {
  return (
    rec &&
    typeof rec.service_id === "string" &&
    typeof rec.service_name === "string"
  );
}

export default function FormTemplate({
  open,
  setOpen,
  loading,
  loadData,
}: FormTemplateProps) {
  const [viewMode, setViewMode] = useState<"library" | "builder">("library");

  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);

  const [fetching, setFetching] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(
    null
  );

  // Added function to fetch form templates from GET /api/admin/form-templates
  const fetchFormTemplates = useCallback(async () => {
    setFetching(true);
    setFetchError(null);

    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [templatesRes, servicesRes] = await Promise.all([
        api.get("api/admin/form-templates", { headers }),
        api.get("api/admin/services", { headers }),
      ]);

      const rawTemplates = templatesRes.data.formTemplates ?? [];
      const validTemplates = rawTemplates.filter(isValidFormTemplate);
      if (validTemplates.length !== rawTemplates.length) {
        console.warn(
          `Dropped ${rawTemplates.length - validTemplates.length} malformed template record(s).`
        );
      }
      setFormTemplates(validTemplates);

      const rawServices = servicesRes.data.services ?? [];
      const validServices = rawServices.filter(isValidService);
      if (validServices.length !== rawServices.length) {
        console.warn(
          `Dropped ${rawServices.length - validServices.length} malformed service record(s).`
        );
      }
      setServices(validServices);
    } catch (error) {
      console.error("Error fetching form templates / services:", error);
      setFetchError("Failed to load form templates. Please try again.");
    } finally {
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
      const response = await api.get(
        `api/admin/form-templates/${template.form_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const fullTemplate: FormTemplate = {
        ...response.data.formTemplate,
        components: (response.data.components ?? []).map(
          dbComponentToBuilderComponent
        ),
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

  const handleDeleteTemplate = async (formId: string) => {
    const previous = formTemplates;
    setFormTemplates((prev) => prev.filter((t) => t.form_id !== formId));

    try {
      const token = localStorage.getItem("token");
      await api.delete(`api/admin/form-templates/${formId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error("Error deleting template:", error);
      setFormTemplates(previous); // roll back
      setFetchError("Failed to delete template. Please try again.");
    }
  };

  const handleBackToLibrary = () => {
    setViewMode("library");
    setEditingTemplate(null);
    fetchFormTemplates();
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
            templates={formTemplates}
            services={services}
            onCreateNew={handleCreateNew}
            onEditTemplate={handleEditTemplate}
            onDeleteTemplate={handleDeleteTemplate}
          />
        ) : (
          <TemplateBuilder
            key={editingTemplate?.form_id ?? "new"}
            initialTemplate={editingTemplate}
            services={services}
            onBackToLibrary={handleBackToLibrary}
          />
        )}
      </div>
    </main>
  );
}
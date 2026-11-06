import { useEffect, useState, useCallback } from "react";
import api from "#lib/axios";
import TemplateLibrary from "../components/FormTemplate/TemplateLibrary";
import TemplateBuilder from "../components/FormTemplate/TemplateBuilder";
import {
  dbComponentToBuilderComponent,
  type FormTemplate as FormTemplateData,
} from "../../../interface/FormTemplate";
import { Loader2 } from "lucide-react";

export interface ServiceOption {
  service_id: string;
  service_name: string;
  service_type?: string;
  service_category: string;
}


function isValidFormTemplate(rec: unknown): rec is FormTemplateData {
  if (typeof rec !== "object" || rec === null) {
    return false;
  }

  const record = rec as Record<string, unknown>;

  return (
    typeof record.form_id === "string" &&
    typeof record.form_name === "string" &&
    typeof record.service_id === "string" &&
    record.service_id.length > 0
  );
}

function isValidService(rec: unknown): rec is ServiceOption {
  if (typeof rec !== "object" || rec === null) {
    return false;
  }

  const record = rec as Record<string, unknown>;

  return (
    typeof record.service_id === "string" &&
    typeof record.service_name === "string"
  );
}

export default function FormTemplate() {
  const [viewMode, setViewMode] = useState<"library" | "builder">("library");

  const [formTemplates, setFormTemplates] = useState<FormTemplateData[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);

  const [fetching, setFetching] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [editingTemplate, setEditingTemplate] = useState<FormTemplateData | null>(
    null,
  );

  // Added function to fetch form templates from GET /api/admin/form-templates
  const fetchFormTemplates = useCallback(async () => {
    setFetching(true);
    setFetchError(null);

    try {
      // const [templatesRes, servicesRes] = await Promise.all([
      //   api.get("/api/admin/form-templates"),
      //   api.get("/api/admin/services"),
      // ]);

      const templatesRes = await api.get("/api/admin/form-templates");
      const servicesRes = await api.get("/api/admin/services");
      const rawTemplates = templatesRes.data.formTemplates ?? [];
      const validTemplates = rawTemplates.filter(isValidFormTemplate);
      if (validTemplates.length !== rawTemplates.length) {
        console.warn(
          `Dropped ${rawTemplates.length - validTemplates.length} malformed template record(s).`,
        );
      }
      setFormTemplates(validTemplates);

      const rawServices = servicesRes.data.services ?? [];
      const validServices = rawServices.filter(isValidService);
      if (validServices.length !== rawServices.length) {
        console.warn(
          `Dropped ${rawServices.length - validServices.length} malformed service record(s).`,
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
    async function action() {
      await fetchFormTemplates()
    }
    action();
  }, [fetchFormTemplates]);

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setViewMode("builder");
  };

  // Updated handleEditTemplate to fetch full form details & components from GET /api/admin/form-templates/:form_id
  const handleEditTemplate = async (template: FormTemplateData) => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get(
        `api/admin/form-templates/${template.form_id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const fullTemplate: FormTemplateData = {
        ...response.data.formTemplate,
        components: (response.data.components ?? []).map(
          dbComponentToBuilderComponent,
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
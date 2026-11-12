import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { Eye, FileCheck2, FileSignature, FileText, PencilLine, RefreshCw, Search } from "lucide-react";
import api from "#lib/axios";
import EmptyState from "../../../components/EmptyState";
import ErrorMessage from "../../../components/ErrorMessage";
import LoadingScreen from "../../../components/LoadingScreen";
import LoadingRegion from "../../../components/LoadingRegion";
import { dbComponentToBuilderComponent, type FormTemplate } from "../../../interface/FormTemplate";
import TemplatePreview from "../../admin/components/FormTemplate/TemplatePreview";
import { PAPER_LABELS, templatePaperSize } from "../../../utils/templatePaper";
import DocumentEditor from "../components/MedicalDocuments/DocumentEditor";
import IssuedDocuments from "../components/MedicalDocuments/IssuedDocuments";

type DocumentType = "medical_certificate" | "medical_clearance";
type TabId = DocumentType | "issued";
type MedicalTemplate = FormTemplate & {
  document_type: DocumentType;
  service_name: string;
  service_category: string;
};

const DOCUMENT_TABS = [
  { id: "medical_certificate", label: "Medical Certificates", singular: "Medical Certificate", icon: FileText },
  { id: "medical_clearance", label: "Medical Clearances", singular: "Medical Clearance", icon: FileCheck2 },
  { id: "issued", label: "Issued Documents", singular: "Issued Document", icon: FileSignature },
] as const;

export default function MedicalDocuments({ refreshKey = 0 }: { refreshKey?: number }) {
  const [templates, setTemplates] = useState<MedicalTemplate[]>([]);
  const [tab, setTab] = useState<TabId>("medical_certificate");
  const [editing, setEditing] = useState<MedicalTemplate | null>(null);
  const [issuedKey, setIssuedKey] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [preview, setPreview] = useState<MedicalTemplate | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void api.get<{ templates: MedicalTemplate[] }>("/api/doctor/medical-document-templates", { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(data.templates)) throw new Error("Invalid template response");
        const loaded = data.templates.map((template) => {
          if (!template.form_id || !template.form_name || template.status !== "Published" ||
            !["medical_certificate", "medical_clearance"].includes(template.document_type) || !Array.isArray(template.components)) {
            throw new Error("Invalid medical document template");
          }
          return { ...template, components: template.components.map(dbComponentToBuilderComponent) };
        });
        setTemplates(loaded);
        setPreview(null);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(isAxiosError<{ message?: string }>(cause)
          ? cause.response?.data?.message || "Medical document templates could not be loaded. Please try again."
          : "Medical document templates could not be loaded. Please try again.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refreshKey, reload]);

  const currentTab = DOCUMENT_TABS.find((item) => item.id === tab)!;
  const query = search.trim().toLowerCase();
  const visible = templates.filter((template) => template.document_type === tab &&
    `${template.form_name} ${template.service_name} ${template.form_description || ""}`.toLowerCase().includes(query));

  if (editing) {
    return (
      <main className="min-w-0 space-y-5 px-4 sm:px-6">
        <DocumentEditor
          template={editing}
          onBack={() => setEditing(null)}
          onReleased={() => setIssuedKey((value) => value + 1)}
        />
      </main>
    );
  }

  return (
    <main className="min-w-0 space-y-5 px-4 sm:px-6">
      <section className="rounded-md border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Medical Documents</h2>
            <p className="mt-1 text-sm text-gray-500">Fill out medical certificates and clearances for a patient and release them to the patient portal.</p>
          </div>
          <button type="button" onClick={() => { setReload((value) => value + 1); setIssuedKey((value) => value + 1); }} disabled={loading}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
            <RefreshCw size={15} />Refresh
          </button>
        </div>
        <div role="tablist" aria-label="Medical document type" className="mt-5 flex gap-4 overflow-x-auto border-b border-gray-200">
          {DOCUMENT_TABS.map((item, index) => (
            <button key={item.id} ref={(element) => { tabRefs.current[index] = element; }}
              type="button" role="tab" id={`document-tab-${item.id}`} aria-selected={tab === item.id}
              aria-controls="medical-document-panel" tabIndex={tab === item.id ? 0 : -1}
              onClick={() => { setTab(item.id); setSearch(""); }}
              onKeyDown={(event) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === "Home" ? 0 : event.key === "End" ? DOCUMENT_TABS.length - 1
                  : (index + (event.key === "ArrowRight" ? 1 : -1) + DOCUMENT_TABS.length) % DOCUMENT_TABS.length;
                setTab(DOCUMENT_TABS[next].id); setSearch(""); tabRefs.current[next]?.focus();
              }}
              className={`flex shrink-0 cursor-pointer items-center gap-2 border-b-2 pb-3 text-sm font-medium ${tab === item.id ? "border-sky-600 text-sky-600" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
              <item.icon size={16} />{item.label}
              {item.id !== "issued" && !loading && !error && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{templates.filter((template) => template.document_type === item.id).length}</span>}
            </button>
          ))}
        </div>
      </section>

      {error && <div className="space-y-3"><ErrorMessage>{error}</ErrorMessage>
        <button type="button" onClick={() => setReload((value) => value + 1)} disabled={loading} className="cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Retry loading templates</button>
      </div>}

      <section id="medical-document-panel" role="tabpanel" aria-labelledby={`document-tab-${tab}`} tabIndex={0} className="space-y-4">
        {tab === "issued" ? <IssuedDocuments refreshKey={refreshKey + issuedKey} /> : <>
        <label className="relative block max-w-md">
          <span className="sr-only">Search medical document templates</span>
          <Search size={17} aria-hidden="true" className="absolute left-3 top-3 text-gray-400" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${currentTab.label.toLowerCase()}...`}
            className="w-full rounded-md border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-sky-500" />
        </label>
        {loading && templates.length === 0 ? <LoadingScreen variant="page" message="Loading medical document templates..." /> :
          <LoadingRegion loading={loading} message="Refreshing medical document templates...">
            {visible.length > 0 ? <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {visible.map((template) => (
                <article key={template.form_id} className="flex min-w-0 flex-col rounded-md border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-md bg-sky-50 p-3 text-sky-600"><currentTab.icon size={22} /></div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-500">{currentTab.singular}</p>
                      <h3 className="break-words font-semibold text-gray-900">{template.form_name}</h3>
                    </div>
                  </div>
                  <p className="mb-4 whitespace-pre-wrap break-words text-sm text-gray-500">{template.form_description || "Published clinic template."}</p>
                  <dl className="mb-5 space-y-2 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-gray-500">Service</dt><dd className="min-w-0 break-words text-right font-medium text-gray-700">{template.service_name}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-gray-500">Paper size</dt><dd className="text-right font-medium text-gray-700">{PAPER_LABELS[templatePaperSize(template, template.service_name)]}</dd></div>
                  </dl>
                  <div className="mt-auto grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button type="button" onClick={() => setEditing(template)} aria-label={`Fill out ${template.form_name}`}
                      className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500">
                      <PencilLine size={16} />Fill out
                    </button>
                    <button type="button" onClick={() => setPreview(template)} aria-label={`Preview ${template.form_name}`}
                      className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500">
                      <Eye size={16} />Preview
                    </button>
                  </div>
                </article>
              ))}
            </div> : !error && <EmptyState
              message={query ? "No matching templates found." : `No published ${currentTab.label.toLowerCase()} available.`}
              description={query ? "Try another template name or service." : "Templates will appear here once an administrator publishes them in Form Templates."}
              action={query ? <button type="button" onClick={() => setSearch("")} className="cursor-pointer font-medium text-sky-600 hover:underline">Clear search</button> : undefined}
            />}
          </LoadingRegion>}
        </>}
      </section>

      {preview && <TemplatePreview templateName={preview.form_name} category={preview.service_category}
        serviceName={preview.service_name} paperSize={templatePaperSize(preview, preview.service_name)}
        components={preview.components} onClose={() => setPreview(null)} />}
    </main>
  );
}

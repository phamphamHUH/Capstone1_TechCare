import { useEffect, useMemo, useState } from "react";
import { FileCheck2, FileText, MousePointerClick, Search } from "lucide-react";
import api from "../../../lib/axios";
import EmptyState from "../../../components/EmptyState";
import ErrorMessage from "../../../components/ErrorMessage";
import LoadingScreen from "../../../components/LoadingScreen";
import PatientSummaryCard from "../components/PatientSummaryCard";
import type { PatientSessionUser } from "../../../interface/PatientPortal";
import { ReportPreview } from "../../laboratory_staff/components/LaboratoryResults/PrintResultView";
import { formatLabDate } from "../../../utils/formats";
import {
  DOCUMENT_TYPE_LABELS,
  issuedReport,
  type IssuedMedicalDocument,
  type MedicalDocumentType,
} from "../../../utils/medicalDocuments";

type Props = {
  patient: PatientSessionUser;
  refreshKey?: number;
  onLoadingChange?: (loading: boolean) => void;
};

export default function MedicalDocuments({ patient, refreshKey = 0, onLoadingChange }: Props) {
  const [documents, setDocuments] = useState<IssuedMedicalDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"" | MedicalDocumentType>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      onLoadingChange?.(true);
      setError("");
      try {
        const { data } = await api.get<{ documents: IssuedMedicalDocument[] }>(
          "/api/patient/medical-documents",
          { signal: controller.signal },
        );
        const rows = Array.isArray(data.documents) ? data.documents : [];
        setDocuments(rows);
        setSelectedId((current) =>
          current && rows.some((row) => row.document_id === current) ? current : rows[0]?.document_id ?? null,
        );
      } catch {
        if (!controller.signal.aborted) setError("Unable to load your medical documents.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          onLoadingChange?.(false);
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [refreshKey, onLoadingChange]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return documents.filter(
      (document) =>
        (!type || document.document_type === type) &&
        (!query ||
          `${document.document_id} ${document.template_snapshot?.form_name ?? ""} ${document.physician_name}`
            .toLowerCase()
            .includes(query)),
    );
  }, [documents, search, type]);

  const selected = filtered.find((document) => document.document_id === selectedId) ?? filtered[0] ?? null;
  const report = useMemo(() => (selected ? issuedReport(selected) : null), [selected]);

  return (
    <div className="space-y-6">
      <PatientSummaryCard patient={patient} />
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-7">
        <section className="min-w-0 rounded-md border border-gray-200 bg-white px-5 py-6 shadow-lg lg:col-span-2">
          <h2 className="font-bold text-gray-900">Medical Documents</h2>
          <p className="mt-1 text-sm text-gray-500">Medical certificates and clearances released by your doctor.</p>
          <label className="mt-5 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-400/20">
            <Search size={17} strokeWidth={1.5} aria-hidden="true" className="shrink-0" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search document..."
              aria-label="Search medical documents" className="h-9 w-full min-w-0 bg-transparent outline-none" />
          </label>
          <select value={type} onChange={(event) => setType(event.target.value as "" | MedicalDocumentType)}
            aria-label="Filter by document type"
            className="mt-2 h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-600 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20">
            <option value="">All Documents</option>
            <option value="medical_certificate">Medical Certificates</option>
            <option value="medical_clearance">Medical Clearances</option>
          </select>

          <div className="mt-5 max-h-[540px] space-y-2 overflow-y-auto">
            {error && <ErrorMessage>{error}</ErrorMessage>}
            {loading && documents.length === 0 ? (
              <LoadingScreen message="Loading medical documents..." />
            ) : filtered.length === 0 ? (
              <EmptyState message={error ? "Medical documents are unavailable." : "No medical documents found."} />
            ) : (
              filtered.map((document) => {
                const active = selected?.document_id === document.document_id;
                const Icon = document.document_type === "medical_clearance" ? FileCheck2 : FileText;
                return (
                  <button type="button" key={document.document_id} onClick={() => setSelectedId(document.document_id)} aria-pressed={active}
                    className={`w-full cursor-pointer rounded-md border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-sky-500 ${active ? "border-sky-200 bg-sky-50" : "border-gray-200 hover:bg-gray-50"}`}>
                    <div className="flex min-w-0 items-start gap-2.5">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-600"><Icon size={20} /></div>
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-gray-800">{DOCUMENT_TYPE_LABELS[document.document_type]}</p>
                        <p className="mt-1 text-xs text-gray-500">{document.document_id} · {formatLabDate(document.issued_at)}</p>
                        <p className="mt-1 break-words text-xs text-gray-500">{document.physician_name}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="min-w-0 rounded-md border border-gray-200 bg-white px-5 py-6 shadow-lg lg:col-span-5">
          <h2 className="font-bold text-gray-900">Document Preview</h2>
          {report && selected ? (
            <ReportPreview key={selected.document_id} report={report} />
          ) : (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-gray-400">
              <MousePointerClick size={28} strokeWidth={1.5} aria-hidden="true" />
              <EmptyState message="Select a document to preview it." />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

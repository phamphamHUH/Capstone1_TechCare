import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { Eye, Search, X } from "lucide-react";
import api from "#lib/axios";
import EmptyState from "../../../../components/EmptyState";
import ErrorMessage from "../../../../components/ErrorMessage";
import LoadingScreen from "../../../../components/LoadingScreen";
import { ReportPreview } from "../../../laboratory_staff/components/LaboratoryResults/PrintResultView";
import { formatLabDate } from "../../../../utils/formats";
import {
  DOCUMENT_TYPE_LABELS,
  issuedReport,
  type IssuedMedicalDocument,
} from "../../../../utils/medicalDocuments";

export function DocumentPreviewModal({ document, onClose }: { document: IssuedMedicalDocument; onClose: () => void }) {
  const report = useMemo(() => issuedReport(document), [document]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="issued-document-title" className="flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-md border border-gray-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div>
            <h3 id="issued-document-title" className="text-base font-bold text-gray-900">
              {DOCUMENT_TYPE_LABELS[document.document_type]} {document.document_id}
            </h3>
            <p className="text-xs text-gray-500">{document.patient_name} · Released {formatLabDate(document.issued_at)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close document" className="cursor-pointer p-1.5 text-gray-500 hover:text-gray-800">
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-4 pb-4">
          <ReportPreview report={report} />
        </div>
      </div>
    </div>
  );
}

export default function IssuedDocuments({ refreshKey = 0 }: { refreshKey?: number }) {
  const [documents, setDocuments] = useState<IssuedMedicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<IssuedMedicalDocument | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get<{ documents: IssuedMedicalDocument[] }>(
          "/api/doctor/medical-documents",
          { signal: controller.signal },
        );
        setDocuments(Array.isArray(data.documents) ? data.documents : []);
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(
          isAxiosError<{ message?: string }>(cause)
            ? cause.response?.data?.message || "Issued documents could not be loaded."
            : "Issued documents could not be loaded.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [refreshKey]);

  const query = search.trim().toLowerCase();
  const visible = documents.filter((document) =>
    `${document.document_id} ${document.patient_name} ${document.patient_id} ${document.template_snapshot?.form_name ?? ""}`
      .toLowerCase()
      .includes(query),
  );

  return (
    <div className="space-y-4">
      <label className="relative block max-w-md">
        <span className="sr-only">Search issued documents</span>
        <Search size={17} aria-hidden="true" className="absolute top-3 left-3 text-gray-400" />
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by patient, document no. or form..."
          className="w-full rounded-md border border-gray-300 bg-white py-2.5 pr-3 pl-10 text-sm outline-sky-500" />
      </label>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {loading && documents.length === 0 ? (
        <LoadingScreen variant="page" message="Loading issued documents..." />
      ) : visible.length === 0 ? (
        !error && <EmptyState
          message={query ? "No matching documents." : "No documents issued yet."}
          description={query ? "Try another patient name or document number." : "Documents you release to patients will appear here."}
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600">
              <tr>
                {["Document No.", "Type", "Form", "Patient", "Released", ""].map((label, index) => (
                  <th key={index} scope="col" className="px-4 py-3 font-semibold">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((document) => (
                <tr key={document.document_id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{document.document_id}</td>
                  <td className="px-4 py-3 text-gray-600">{DOCUMENT_TYPE_LABELS[document.document_type]}</td>
                  <td className="px-4 py-3 text-gray-600">{document.template_snapshot?.form_name}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{document.patient_name}</p>
                    <p className="text-xs text-gray-500">{document.patient_id}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatLabDate(document.issued_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => setViewing(document)} aria-label={`View ${document.document_id}`}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100">
                      <Eye size={14} />View / Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {viewing && <DocumentPreviewModal document={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

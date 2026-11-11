import { useState } from "react";
import { Folder, MousePointerClick } from "lucide-react";
import EmptyState from "../../../../components/EmptyState";

export type PatientAttachment = {
  id: string;
  patientId: string;
  fileName: string;
  fileType: string;
  consultationRecordId?: string | null;
  relatedService?: string | null;
  date?: string | null;
  uploadedBy?: string | null;
  notes?: string | null;
};

type DigitalDocumentsTabProps = {
  patientId: string;
  consultationRecordId: string;
  documents?: readonly PatientAttachment[];
  onReturn: () => void;
};

function documentDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

export default function DigitalDocumentsTab({
  patientId,
  consultationRecordId,
  documents = [],
  onReturn,
}: DigitalDocumentsTabProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Keep attachments scoped to the active patient, including previous visits.
  // No document-list or file-preview API currently exists in the backend.
  const attachments = documents.filter((item) => item.patientId === patientId);
  const selectedDocument =
    attachments.find((item) => item.id === selectedId) ??
    attachments[0] ??
    null;

  const relatedVisit = (item: PatientAttachment) =>
    item.consultationRecordId
      ? item.consultationRecordId === consultationRecordId
        ? "Current Consultation"
        : "Past Consultation"
      : item.relatedService || "Not recorded";

  return (
    <div className="mb-5 space-y-5">
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-7">
        <section
          aria-labelledby="patient-attachments-heading"
          className="h-fit min-w-0 rounded-md border border-gray-200 px-5 py-6 shadow-lg lg:col-span-5"
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 id="patient-attachments-heading" className="font-bold">
                Patient Attachments
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Read-only view of uploaded files and related service records.
              </p>
            </div>
            <span className="shrink-0 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
              {attachments.length} {attachments.length === 1 ? "file" : "files"}
            </span>
          </div>

          {attachments.length === 0 ? (
            <EmptyState message="No patient attachments available" />
          ) : (
            <div className="overflow-x-auto rounded-md border border-gray-200">
              <table className="w-full min-w-[700px] table-fixed text-left text-sm text-gray-600">
                <caption className="sr-only">
                  Patient attachments and related visits
                </caption>
                <thead className="bg-gray-50 text-xs font-medium text-gray-700">
                  <tr>
                    <th scope="col" className="w-[26%] px-3 py-3 font-medium">
                      File Name
                    </th>
                    <th scope="col" className="w-[9%] px-2 py-3 font-medium">
                      File Type
                    </th>
                    <th scope="col" className="w-[20%] px-2 py-3 font-medium">
                      Related Service / Visit
                    </th>
                    <th scope="col" className="w-[13%] px-2 py-3 font-medium">
                      Date
                    </th>
                    <th scope="col" className="w-[15%] px-2 py-3 font-medium">
                      Uploaded By
                    </th>
                    <th scope="col" className="w-[17%] px-2 py-3 font-medium">
                      View / Preview
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attachments.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-3 align-top">
                        <div className="flex items-start gap-3">
                          <Folder
                            size={17}
                            aria-hidden="true"
                            className="mt-0.5 shrink-0 fill-sky-400 text-sky-400"
                          />
                          <span className="min-w-0 break-words">
                            {item.fileName}
                          </span>
                        </div>
                      </td>
                      <td className="break-words px-2 py-3 align-top">
                        {item.fileType}
                      </td>
                      <td className="px-2 py-3 align-top">
                        {relatedVisit(item)}
                      </td>
                      <td className="px-2 py-3 align-top">
                        {documentDate(item.date)}
                      </td>
                      <td className="break-words px-2 py-3 align-top">
                        {item.uploadedBy || "Not recorded"}
                      </td>
                      <td className="px-2 py-2.5 align-top">
                        <button
                          type="button"
                          aria-label={`View ${item.fileName}`}
                          aria-controls="selected-document-panel"
                          aria-pressed={selectedDocument?.id === item.id}
                          onClick={() => setSelectedId(item.id)}
                          className="cursor-pointer rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-sky-500 transition-colors hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside
          id="selected-document-panel"
          aria-labelledby="selected-document-heading"
          className="h-fit min-w-0 rounded-md border border-gray-200 px-5 py-6 shadow-lg lg:col-span-2"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id="selected-document-heading" className="font-bold">
              Selected Document
            </h2>
            <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-500">
              Read-only
            </span>
          </div>

          <div aria-live="polite" aria-atomic="true">
            {selectedDocument ? (
              <>
                <div className="flex items-start gap-3 border-b border-gray-100 py-4">
                  <Folder
                    size={18}
                    aria-hidden="true"
                    className="shrink-0 fill-sky-400 text-sky-400"
                  />
                  <p className="min-w-0 break-words text-sm font-semibold text-gray-900">
                    {selectedDocument.fileName}
                  </p>
                </div>
                <dl className="space-y-3 border-b border-gray-100 py-4 text-sm">
                  {[
                    ["File Type", selectedDocument.fileType],
                    ["Related Service", relatedVisit(selectedDocument)],
                    ["Date", documentDate(selectedDocument.date)],
                    [
                      "Uploaded By",
                      selectedDocument.uploadedBy || "Not recorded",
                    ],
                    ["Preview State", "Not available"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3">
                      <dt className="shrink-0 text-gray-400">{label}</dt>
                      <dd className="min-w-0 break-words text-right font-medium text-gray-700">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
                  No preview available for this document.
                </p>
                <h3 className="mb-2 mt-4 text-sm font-bold text-gray-900">
                  Document Notes
                </h3>
                <p className="whitespace-pre-wrap break-words rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
                  {selectedDocument.notes ||
                    "Linked clinic document. Preview unavailable; this view is read-only."}
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-16 text-center text-gray-400">
                <MousePointerClick
                  size={28}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <EmptyState message="Select a document to view its details." />
              </div>
            )}
          </div>
        </aside>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onReturn}
          className="cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        >
          Return to Consultation
        </button>
      </div>
    </div>
  );
}

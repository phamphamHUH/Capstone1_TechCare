import { useMemo } from "react";
import { X } from "lucide-react";
import type {
  BuilderComponent,
  PaperSize,
} from "../../../../interface/FormTemplate";
import type { LaboratoryReportData } from "../../../../interface/LaboratoryAnalysis";
import { ReportPreview } from "../../../laboratory_staff/components/LaboratoryResults/PrintResultView";
import {
  defaultPaperSize,
  PAPER_LABELS,
} from "../../../../utils/templatePaper";

interface TemplatePreviewProps {
  templateName: string;
  category: string;
  components: BuilderComponent[];
  paperSize?: PaperSize;
  serviceName?: string;
  onClose: () => void;
}

export default function TemplatePreview({
  templateName,
  category,
  components,
  paperSize,
  serviceName,
  onClose,
}: TemplatePreviewProps) {
  const size = paperSize ?? defaultPaperSize(`${templateName} ${category}`);
  const report = useMemo<LaboratoryReportData>(
    () => ({
      request: {
        requestId: "SAMPLE",
        queueId: "",
        patientId: "SAMPLE",
        patientName: "SAMPLE PATIENT",
        birthdate: "",
        age: null,
        sex: "—",
        requestedAt: "",
        collectedAt: "",
        accepted: false,
        sampleCollected: false,
        room: "",
        priority: false,
        category: "Normal",
        status: "In Progress",
        consultationType: "",
        tests: [
          {
            id: "preview",
            serviceId: "preview",
            name: serviceName || templateName || "Untitled Template",
            description: "",
          },
        ],
      },
      template: {
        form_id: "preview",
        form_name: templateName || "Untitled Template",
        service_id: "preview",
        status: "Draft",
        created_by: "",
        created_at: "",
        updated_at: "",
        components,
        category,
        testNames: [],
        paper_size: size,
      },
      values: Object.fromEntries(
        components
          .filter((component) => component.settings.defaultValue != null)
          .map((component) => [
            component.fieldKey,
            component.settings.defaultValue,
          ]),
      ),
      remarks: "",
    }),
    [templateName, category, components, size, serviceName],
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-preview-title"
        className="bg-white w-full max-w-5xl max-h-[calc(100dvh-2rem)] rounded-md shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h3
              id="template-preview-title"
              className="text-base font-bold text-gray-900"
            >
              Report Preview: {templateName || "Untitled Template"}
            </h3>
            <p className="text-xs text-gray-500">
              {PAPER_LABELS[size]} · Sample patient details
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report preview"
            className="p-1.5 text-gray-500 hover:text-gray-800 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-4 pb-4">
          <ReportPreview key={size} report={report} />
        </div>
      </div>
    </div>
  );
}

import { Printer, X } from "lucide-react";
import type { BuilderComponent } from "../../../../interface/FormTemplate";

interface TemplatePreviewProps {
  templateName: string;
  category: string;
  components: BuilderComponent[];
  onClose: () => void;
}

export default function TemplatePreview({
  templateName,
  category,
  components,
  onClose,
}: TemplatePreviewProps) {
  const getWidthClass = (width?: string) => {
    switch (width) {
      case "1/4":
        return "w-full sm:w-[calc(25%-0.75rem)] flex-shrink-0";
      case "1/3":
        return "w-full sm:w-[calc((100%-2rem)/3)] flex-shrink-0";
      case "1/2":
        return "w-full sm:w-[calc(50%-0.5rem)] flex-shrink-0";
      case "FULL":
      default:
        return "w-full flex-shrink-0";
    }
  };

  const previewableComponents = (components ?? []).filter(
  (c) => c.settings?.showInPreview !== false
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col my-8">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Report Preview: {templateName || "Untitled Template"}
            </h3>
            <span className="text-xs text-gray-500">
              Category: {category} • In-memory rendered preview
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Printer size={14} />
              <span>Print Preview</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Report Canvas Content */}
        <div className="p-8 sm:p-12 overflow-y-auto max-h-[calc(85vh-100px)] flex flex-col gap-6">
          {/* Clinic Banner */}
          <div className="flex items-center justify-between border-b-2 border-sky-600 pb-4">
            <div className="flex items-center gap-4">
              <img
                src="/assets/reyna-g-logo.png"
                alt="Clinic Logo"
                className="w-16 h-16 object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <div>
                <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">
                  Reyna G Diagnostic Medical Clinic
                </h1>
                <p className="text-xs text-gray-600">
                  Address St. Address 1234 chu chu • Tel: 0912-345-6789
                </p>
                <p className="text-xs text-sky-700 font-semibold mt-0.5">
                  CLINICAL LABORATORY & DIAGNOSTIC SERVICES
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-gray-500 leading-snug">
              <div>
                <span className="font-semibold text-gray-700">REPORT NO:</span>{" "}
                REP-2026-0001
              </div>
              <div>
                <span className="font-semibold text-gray-700">DATE:</span>{" "}
                {new Date().toISOString().split("T")[0]}
              </div>
            </div>
          </div>

          {/* Patient Details Header */}
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-gray-400 block text-[10px] uppercase">
                Patient Name:
              </span>
              <span className="font-bold text-gray-800">JUAN DELA CRUZ</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase">
                Age / Gender:
              </span>
              <span className="font-semibold text-gray-800">32 / Male</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase">
                Date of Birth:
              </span>
              <span className="font-semibold text-gray-800">1994-05-12</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase">
                Requesting Doctor:
              </span>
              <span className="font-semibold text-gray-800">
                Dr. LeBron R. James
              </span>
            </div>
          </div>

          {/* Rendered Template Components */}
          <div className="flex flex-wrap gap-4 py-2">
            {previewableComponents.map((comp) => {
              const settings = comp.settings ?? {};
              const align = settings.alignment || "left";

              return (
                <div
                  key={comp.id}
                  className={`${getWidthClass(
                    settings.width
                  )} text-${align}`}
                >
                  {comp.type === "section_header" && (
                    <div className="w-full bg-sky-100 text-sky-900 font-bold text-xs uppercase px-3 py-1.5 rounded-md tracking-wider border-l-4 border-sky-500 my-1">
                      {settings.sectionHeader || comp.label}
                    </div>
                  )}

                  {comp.type === "static_text" && (
                    <p className="text-xs text-gray-700 leading-relaxed italic my-1">
                      {settings.staticText || comp.label}
                    </p>
                  )}

                  {comp.type === "line_divider" && (
                    <hr className="my-2 border-gray-300" />
                  )}

                  {comp.type === "text_field" && (
                    <div className="flex items-center justify-between border-b border-gray-200 py-1.5 text-xs">
                      <span className="font-semibold text-gray-700">
                        {comp.label}:
                      </span>
                      <span className="text-gray-900 font-medium">
                        {settings.defaultValue || "—"}
                      </span>
                    </div>
                  )}

                  {comp.type === "number_field" && (
                    <div className="flex items-center justify-between border-b border-gray-200 py-1.5 text-xs">
                      <span className="font-semibold text-gray-700">
                        {comp.label}:
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900">
                          {settings.defaultValue || "14.2"}
                        </span>
                        {settings.unit && (
                          <span className="text-gray-500 font-medium">
                            {settings.unit}
                          </span>
                        )}
                        {settings.referenceRange && (
                          <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                            (Normal: {settings.referenceRange})
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {comp.type === "checkbox" && (
                    <div className="py-1 text-xs">
                      <span className="font-semibold text-gray-700 block mb-1">
                        {comp.label}:
                      </span>
                      <div className="flex flex-wrap gap-3">
                        {(settings.checkboxOptions || ["Option 1"]).map(
                          (opt, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 text-gray-700"
                            >
                              <span className="w-3.5 h-3.5 border border-gray-400 rounded-sm inline-block" />
                              {opt}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {comp.type === "table" && (
                    <div className="w-full my-2 border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-sky-50 text-sky-900 font-bold border-b border-gray-200">
                          <tr>
                            {(
                              settings.tableColumns || [
                                { id: "1", header: "Parameter" },
                                { id: "2", header: "Result" },
                              ]
                            ).map((col) => (
                              <th key={col.id} className="p-2">
                                {col.header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-gray-100 text-gray-700">
                            {(settings.tableColumns || [1, 2]).map(
                              (_, idx) => (
                                <td key={idx} className="p-2">
                                  {idx === 0 ? "Sample Test 1" : "Normal"}
                                </td>
                              )
                            )}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Remarks Section */}
          <div className="border-t border-gray-200 pt-4 text-xs">
            <span className="font-bold text-gray-800 uppercase block mb-1">
              Remarks & Clinical Interpretation:
            </span>
            <p className="text-gray-600 italic">
              Results verified against clinical reference intervals. Please
              consult with requesting physician for correlation.
            </p>
          </div>

          {/* Doctor / Pathologist Signature Placeholders */}
          <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
            <div className="flex flex-col items-center">
              <div className="w-48 border-b border-gray-400 pb-1 font-bold text-gray-800">
                Medical Technologist, RMT
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5">
                License No: 0098765
              </span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-48 border-b border-gray-400 pb-1 font-bold text-gray-800">
                Pathologist, MD, FPSP
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5">
                License No: 0012345
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


import EmptyState from "../../../../components/EmptyState";
import LoadingScreen, {
  LoadingSpinner,
} from "../../../../components/LoadingScreen";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Eye,
  Maximize,
  Minimize,
  MoveHorizontal,
  Printer,
  Shrink,
} from "lucide-react";
import type {
  AnalysisRequest,
  LaboratoryReportData,
  ResultReleaseResponse,
} from "../../../../interface/LaboratoryAnalysis";
import { AnalysisButton, AnalysisNotice } from "./AnalysisUi";
import {
  apiMessage,
  fetchPrintableResults,
} from "./utils/laboratoryResultsApi";
import LaboratoryReport from "./PrintResultView/LaboratoryReport";
import ResultReleaseControl from "./ResultReleaseControl";
import {
  reportFrameHtml,
  reportPaper,
  waitForReportAssets,
} from "./utils/laboratoryPrint";
import { templatePaperSize } from "../../../../utils/templatePaper";

type ReportLoadState = {
  request: AnalysisRequest;
  revision: number;
  reports: readonly LaboratoryReportData[];
  error: string;
};

type ReportAssetState = {
  report: LaboratoryReportData;
  body: HTMLElement;
  revision: number;
  error: string;
};

type ReportPreviewProps = { report: LaboratoryReportData };

// "width": page width fills the preview; "page": the whole page is visible;
// "actual": 100%.
type ZoomMode = "width" | "page" | "actual";

const ZOOM_OPTIONS: { mode: ZoomMode; label: string; icon: typeof Shrink }[] = [
  { mode: "width", label: "Fit width", icon: MoveHorizontal },
  { mode: "page", label: "Fit page", icon: Shrink },
  { mode: "actual", label: "Actual size", icon: Eye },
];

export function ReportPreview({ report }: ReportPreviewProps) {
  const paperSize = templatePaperSize(
    report.template,
    report.request.tests.find(
      (test) => test.serviceId === report.template.service_id,
    )?.name,
  );
  const paper = reportPaper(paperSize);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const printButtonRef = useRef<HTMLButtonElement>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState(paper.width + 48);
  const [viewHeight, setViewHeight] = useState(paper.height);
  const [height, setHeight] = useState(paper.height);
  const [zoom, setZoom] = useState<ZoomMode>("width");
  const [fullscreen, setFullscreen] = useState(false);

  const [assetState, setAssetState] = useState<ReportAssetState | null>(null);

  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const assets =
    assetState?.report === report &&
    assetState.body === body &&
    assetState.revision === reload
      ? assetState
      : null;
  const ready = Boolean(assets && !assets.error);
  const previewError = error || assets?.error;
  // Full screen may enlarge the report; the normal preview never goes above 100%.
  const maxScale = fullscreen ? 2 : 1;
  const widthScale = (width - 32) / paper.width;
  const scale =
    zoom === "actual"
      ? 1
      : Math.max(
          0.1,
          Math.min(
            maxScale,
            zoom === "page"
              ? Math.min(widthScale, (viewHeight - 32) / height)
              : widthScale,
          ),
        );

  useLayoutEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const measure = () => {
      setWidth(container.clientWidth);
      setViewHeight(container.clientHeight);
    };
    measure();
    let animationFrame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(measure);
    });
    observer.observe(container);
    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    if (!body) {
      return;
    }

    const frameWindow = body.ownerDocument.defaultView;
    if (!frameWindow) return;

    const measure = () =>
      setHeight(
        Math.max(paper.height, Math.ceil(body.getBoundingClientRect().height)),
      );
    measure();
    let animationFrame = 0;
    const observer = new ResizeObserver(() => {
      frameWindow.cancelAnimationFrame(animationFrame);
      animationFrame = frameWindow.requestAnimationFrame(measure);
    });
    observer.observe(body.querySelector(".report-sheet") ?? body);
    return () => {
      frameWindow.cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [body, report, paper.height]);

  useEffect(() => {
    const sync = () =>
      setFullscreen(document.fullscreenElement === previewRef.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await previewRef.current?.requestFullscreen();
        setZoom("page");
      }
    } catch {
      setError("Full screen is not available in this browser.");
    }
  }

  useEffect(() => {
    if (!body) {
      return;
    }

    let cancelled = false;
    const document = frameRef.current?.contentDocument;

    if (!document) {
      return;
    }

    document.title = report.medicalDocument
      ? `${report.medicalDocument.typeLabel} - ${report.resultId || "Draft"} - ${report.request.patientName}`
      : `Laboratory Result - ${report.request.requestId} - ${report.template.form_name}`;

    void waitForReportAssets(document)
      .then(() => {
        if (!cancelled) {
          setAssetState({
            report,
            body,
            revision: reload,
            error: "",
          });
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          setAssetState({
            report,
            body,
            revision: reload,
            error: apiMessage(
              cause,
              "A report image could not be loaded. Please retry the preview before printing.",
            ),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [body, report, reload]);

  async function print() {
    const frame = frameRef.current;

    if (!ready || !frame?.contentWindow || !body || printing) {
      return;
    }

    setPrinting(true);
    setError("");

    try {
      await waitForReportAssets(body.ownerDocument);

      if (frame !== frameRef.current) {
        return;
      }

      frame.contentWindow.focus();
      frame.contentWindow.print();
    } catch (cause) {
      setError(
        apiMessage(cause, "Unable to open the print dialog. Please try again."),
      );
    } finally {
      setPrinting(false);
      printButtonRef.current?.focus();
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 py-4">
        <AnalysisButton
          variant="secondary"
          onClick={() => {
            void toggleFullscreen();
          }}
        >
          <Maximize size={14} />
          Full screen
        </AnalysisButton>
        <button
          ref={printButtonRef}
          type="button"
          onClick={() => {
            void print();
          }}
          disabled={!ready || printing}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {printing ? <LoadingSpinner size={14} /> : <Printer size={14} />}
          {report.resultId ? "Print" : "Print Draft"}
        </button>
        <ZoomControls zoom={zoom} onZoom={setZoom} className="ml-auto" />
        <span
          className="w-10 text-right text-xs text-gray-500"
          aria-label={`Preview zoom ${Math.round(scale * 100)} percent`}
        >
          {Math.round(scale * 100)}%
        </span>
      </div>
      {previewError && (
        <>
          <AnalysisNotice error>{previewError}</AnalysisNotice>
          <AnalysisButton
            variant="secondary"
            onClick={() => {
              setBody(null);
              setError("");
              setReload((value) => value + 1);
            }}
          >
            Retry preview
          </AnalysisButton>
        </>
      )}
      <div
        ref={previewRef}
        className={
          fullscreen
            ? "flex h-screen flex-col bg-white"
            : "mt-1 overflow-hidden rounded-md border border-gray-300"
        }
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-300 bg-white px-4 py-3 text-sm">
          <Eye size={15} className="text-sky-600" />
          <h2 className="font-semibold">Print Preview</h2>
          <span className="text-gray-500">{paper.label}</span>
          <span
            className={`ml-auto rounded-full px-2.5 py-1 text-xs ${report.resultId ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"}`}
          >
            {report.resultId
              ? report.medicalDocument
                ? "Released"
                : "Saved result"
              : "Draft · Not saved"}
          </span>
          {fullscreen && (
            <>
              <ZoomControls zoom={zoom} onZoom={setZoom} />
              <AnalysisButton
                variant="secondary"
                onClick={() => {
                  void toggleFullscreen();
                }}
              >
                <Minimize size={14} />
                Exit full screen
              </AnalysisButton>
            </>
          )}
        </div>
        {!ready && !previewError && (
          <LoadingScreen
            message="Preparing report..."
            variant="inline"
            className="py-3"
          />
        )}
        <div
          ref={containerRef}
          className={`overflow-auto bg-gray-100 p-4 ${fullscreen ? "min-h-0 flex-1" : "h-[75vh] min-h-80"}`}
          aria-busy={!ready && !previewError}
        >
          <div
            className="relative mx-auto bg-white shadow-sm"
            style={{
              width: paper.width * scale,
              height: height * scale,
            }}
          >
            <iframe
              key={`${reload}:${paperSize}`}
              ref={frameRef}
              title={`${report.template.form_name} print preview for ${report.request.patientName || report.request.patientId}`}
              srcDoc={reportFrameHtml(paperSize)}
              sandbox="allow-same-origin allow-modals"
              className="absolute top-0 left-0 origin-top-left border-0 bg-white"
              style={{
                width: paper.width,
                height,
                transform: `scale(${scale})`,
              }}
              onLoad={(event) => {
                setBody(event.currentTarget.contentDocument?.body ?? null);
              }}
            />
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        {paperSize === "a4"
          ? "Use A4 paper (210 × 297 mm) in portrait at 100% scale, with browser headers and footers off."
          : "Use 8.5 × 13 inch long bond paper in portrait at 100% scale, with browser headers and footers off. The report uses only the top half; the bottom half stays blank."}
      </p>
      {body && createPortal(<LaboratoryReport report={report} />, body)}
    </>
  );
}

function ZoomControls({
  zoom,
  onZoom,
  className = "",
}: {
  zoom: ZoomMode;
  onZoom: (mode: ZoomMode) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Preview zoom"
      className={`flex items-center rounded-md border border-gray-300 bg-white p-0.5 ${className}`}
    >
      {ZOOM_OPTIONS.map(({ mode, label, icon: Icon }) => (
        <button
          key={mode}
          type="button"
          aria-pressed={zoom === mode}
          onClick={() => onZoom(mode)}
          className={`flex cursor-pointer items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-sky-500 ${zoom === mode ? "bg-sky-100 text-sky-700" : "text-gray-600 hover:bg-gray-50"}`}
        >
          <Icon size={13} />
          {label}
        </button>
      ))}
    </div>
  );
}

type PrintResultViewProps = {
  refreshKey?: number;
  request: AnalysisRequest;
  reports?: readonly LaboratoryReportData[];
  onBack: () => void;
  backLabel?: string;
  onBackToList?: () => void;
  onReleased?: (result: ResultReleaseResponse) => void;
};

export default function PrintResultView({
  refreshKey = 0,
  request,
  reports,
  onBack,
  backLabel = "Back to Results",
  onBackToList = onBack,
  onReleased,
}: PrintResultViewProps) {
  const [loadState, setLoadState] = useState<ReportLoadState | null>(null);

  const reload = refreshKey;
  const [selected, setSelected] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const result = loadState?.request === request ? loadState : null;
  const loaded = reports ?? result?.reports ?? [];
  const loading =
    reports === undefined && (!result || result.revision !== reload);
  const error =
    reports === undefined && result?.revision === reload ? result.error : "";

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    if (reports !== undefined) {
      return () => controller.abort();
    }

    void fetchPrintableResults(request, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setLoadState({
            request,
            revision: reload,
            reports: items,
            error: "",
          });
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setLoadState((previous) => ({
            request,
            revision: reload,
            reports: previous?.request === request ? previous.reports : [],
            error: apiMessage(cause, "Unable to load this laboratory result."),
          }));
        }
      });

    return () => controller.abort();
  }, [request, reports, reload]);

  const selectedIndex = loaded[selected] ? selected : 0;
  const report = loaded[selectedIndex];

  return (
    <section
      className="min-w-0 bg-white pb-6 font-sans text-sm text-gray-900"
      aria-labelledby="print-result-heading"
    >
      <header className="flex flex-wrap items-start gap-4 border-b border-gray-300 pb-4">
        <AnalysisButton variant="secondary" onClick={onBack}>
          <ArrowLeft size={13} />
          {backLabel}
        </AnalysisButton>
        <div>
          <h1
            ref={headingRef}
            tabIndex={-1}
            id="print-result-heading"
            className="text-2xl font-semibold outline-none"
          >
            Print Result
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Generate a printable laboratory result in official format.
          </p>
        </div>
      </header>
      {error && <AnalysisNotice error>{error}</AnalysisNotice>}
      {loading && loaded.length === 0 ? (
        <LoadingScreen message="Loading laboratory result..." />
      ) : report ? (
        <>
          {loaded.length > 1 && (
            <label className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              Report
              <select
                className="max-w-full rounded border border-gray-300 bg-white p-2 outline-sky-400"
                value={selectedIndex}
                onChange={(event) => setSelected(Number(event.target.value))}
              >
                {loaded.map((item, index) => (
                  <option
                    value={index}
                    key={`${item.resultId ?? item.template.form_id}-${index}`}
                  >
                    {item.template.form_name}
                    {" · "}
                    {item.resultId || "Draft"}
                  </option>
                ))}
              </select>
            </label>
          )}
          <ResultReleaseControl
            key={`release:${report.resultId ?? "draft"}:${report.template.form_id}`}
            report={report}
            onBackToList={onBackToList}
            onReleased={onReleased}
          />
          <ReportPreview
            key={`${report.resultId ?? "draft"}:${report.template.form_id}`}
            report={report}
          />
        </>
      ) : (
        <div className="pt-5">
          <EmptyState
            message="No laboratory report available."
            description="Saved results will appear here when they are ready to preview."
          />
        </div>
      )}
    </section>
  );
}

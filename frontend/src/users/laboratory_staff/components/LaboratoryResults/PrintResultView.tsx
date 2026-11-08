import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Eye, LoaderCircle, Maximize, Printer } from "lucide-react";
import type {
  AnalysisRequest,
  LaboratoryReportData,
  ResultReleaseResponse,
} from "../../../../interface/LaboratoryAnalysis";
import { AnalysisButton, AnalysisNotice } from "./AnalysisUi";
import { apiMessage, fetchPrintableResults } from "./laboratoryResultsApi";
import LaboratoryReport from "./LaboratoryReport";
import ResultReleaseControl from "./ResultReleaseControl";
import {
  REPORT_FRAME_HTML,
  REPORT_MIN_HEIGHT,
  REPORT_PAPER_LABEL,
  REPORT_WIDTH,
  waitForReportAssets,
} from "./laboratoryPrint";

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

function ReportPreview({ report }: ReportPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const printButtonRef = useRef<HTMLButtonElement>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState(REPORT_WIDTH + 48);
  const [height, setHeight] = useState(REPORT_MIN_HEIGHT);
  const [fit, setFit] = useState(true);

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
  const scale = fit
    ? Math.max(0.1, Math.min(1, (width - 32) / REPORT_WIDTH))
    : 1;

  useLayoutEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const measure = () => setWidth(container.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!body) {
      return;
    }

    const measure = () =>
      setHeight(
        Math.max(
          REPORT_MIN_HEIGHT,
          Math.ceil(body.getBoundingClientRect().height),
        ),
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    return () => observer.disconnect();
  }, [body, report]);

  useEffect(() => {
    if (!body) {
      return;
    }

    let cancelled = false;
    const document = frameRef.current?.contentDocument;

    if (!document) {
      return;
    }

    document.title = `Laboratory Result - ${report.request.requestId} - ${report.template.form_name}`;

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
          aria-pressed={fit}
          onClick={() => setFit(true)}
        >
          <Maximize size={14} />
          Fit to Page
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
          {printing ? (
            <LoaderCircle
              size={14}
              className="animate-spin motion-reduce:animate-none"
            />
          ) : (
            <Printer size={14} />
          )}
          {report.resultId ? "Print" : "Print Draft"}
        </button>
        <button
          type="button"
          onClick={() => setFit(false)}
          aria-pressed={!fit}
          className="ml-auto cursor-pointer rounded px-2 py-1 text-sm text-gray-500 hover:text-sky-600 focus-visible:outline-sky-500"
        >
          Actual size
        </button>
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
      <div className="mt-1 overflow-hidden rounded-2xl border border-gray-300">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-300 bg-white px-4 py-3 text-sm">
          <Eye size={15} className="text-sky-600" />
          <h2 className="font-semibold">Print Preview</h2>
          <span className="text-gray-500">{REPORT_PAPER_LABEL}</span>
          <span
            className={`ml-auto rounded-full px-2.5 py-1 text-xs ${report.resultId ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"}`}
          >
            {report.resultId ? "Saved result" : "Draft · Not saved"}
          </span>
        </div>
        {!ready && !previewError && (
          <p
            role="status"
            className="flex items-center justify-center gap-2 bg-gray-50 py-3 text-sm text-gray-500"
          >
            <LoaderCircle
              size={14}
              className="animate-spin motion-reduce:animate-none"
            />
            Preparing report...
          </p>
        )}
        <div
          ref={containerRef}
          className="max-h-[75vh] min-h-80 overflow-auto bg-gray-100 p-4"
          aria-busy={!ready && !previewError}
        >
          <div
            className="relative mx-auto bg-white shadow-sm"
            style={{
              width: REPORT_WIDTH * scale,
              height: height * scale,
            }}
          >
            <iframe
              key={reload}
              ref={frameRef}
              title={`${report.template.form_name} print preview for ${report.request.patientName || report.request.patientId}`}
              srcDoc={REPORT_FRAME_HTML}
              sandbox="allow-same-origin allow-modals"
              className="absolute top-0 left-0 origin-top-left border-0 bg-white"
              style={{
                width: REPORT_WIDTH,
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
        Use 8.5 × 13 inch long bond paper in portrait at 100% scale, with browser
        headers and footers off. The report uses only the top half; the bottom
        half stays blank.
      </p>
      {body && createPortal(<LaboratoryReport report={report} />, body)}
    </>
  );
}

type PrintResultViewProps = {
  request: AnalysisRequest;
  reports?: readonly LaboratoryReportData[];
  onBack: () => void;
  backLabel?: string;
  onBackToList?: () => void;
  onReleased?: (result: ResultReleaseResponse) => void;
};

export default function PrintResultView({
  request,
  reports,
  onBack,
  backLabel = "Back to Results",
  onBackToList = onBack,
  onReleased,
}: PrintResultViewProps) {
  const [loadState, setLoadState] = useState<ReportLoadState | null>(null);

  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const result =
    loadState?.request === request && loadState.revision === reload
      ? loadState
      : null;
  const loaded = reports ?? result?.reports ?? [];
  const loading = reports === undefined && result === null;
  const error = reports === undefined ? result?.error : "";

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
          setLoadState({
            request,
            revision: reload,
            reports: [],
            error: apiMessage(cause, "Unable to load this laboratory result."),
          });
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
      {loading ? (
        <p
          role="status"
          className="flex min-h-64 items-center justify-center gap-2 text-gray-500"
        >
          <LoaderCircle
            size={18}
            className="animate-spin motion-reduce:animate-none"
          />
          Loading laboratory result...
        </p>
      ) : error ? (
        <div className="pt-5">
          <AnalysisNotice error>{error}</AnalysisNotice>
          <AnalysisButton
            variant="secondary"
            onClick={() => setReload((value) => value + 1)}
          >
            Try again
          </AnalysisButton>
        </div>
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
          <AnalysisNotice>
            No laboratory report is available to preview.
          </AnalysisNotice>
        </div>
      )}
    </section>
  );
}

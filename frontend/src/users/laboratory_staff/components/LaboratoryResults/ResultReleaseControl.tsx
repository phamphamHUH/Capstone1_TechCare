import { LoadingSpinner } from "../../../../components/LoadingScreen";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Globe, Send, X } from "lucide-react";
import type {
  LaboratoryReportData,
  ResultReleaseResponse,
} from "../../../../interface/LaboratoryAnalysis";
import { AnalysisButton, AnalysisNotice } from "./AnalysisUi";
import { formatLabDate } from "../../../../utils/formats";
import {
  apiMessage,
  releaseLaboratoryResult,
  resultReleaseApi,
} from "./laboratoryResultsApi";
import ResultSuccessOverlay from "./ResultSuccessOverlay";

type ReleaseConfirmationContentProps = {
  report: LaboratoryReportData;
  unavailableReason: string;
  pending: boolean;
  error: string;
  onConfirm: () => void;
  cancelRef?: RefObject<HTMLButtonElement | null>;
};

export function ReleaseConfirmationContent({
  report,
  unavailableReason,
  pending,
  error,
  onConfirm,
  cancelRef,
}: ReleaseConfirmationContentProps) {
  return (
    <div className="font-sans text-sm text-gray-900">
      <header className="flex items-start gap-3 border-b border-gray-300 p-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">
          <Globe size={21} />
        </span>
        <div>
          <Dialog.Title className="text-lg font-semibold">
            Release Laboratory Result
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm leading-relaxed text-gray-500">
            Confirm release of this saved laboratory result. Patient online
            access is shown only when confirmed by the server.
          </Dialog.Description>
        </div>
        <Dialog.Close
          disabled={pending}
          aria-label="Close release confirmation"
          className="ml-auto cursor-pointer rounded p-1 text-gray-500 hover:bg-sky-50 focus-visible:outline-sky-500 disabled:cursor-not-allowed"
        >
          <X size={17} />
        </Dialog.Close>
      </header>
      <div className="p-5">
        <dl className="grid grid-cols-2 gap-4 rounded-md border border-gray-300 bg-gray-50 p-3 text-sm [&_dt]:mb-1 [&_dt]:text-xs [&_dt]:text-gray-500 [&_dd]:wrap-anywhere">
          <div>
            <dt>Patient</dt>
            <dd className="font-semibold">
              {report.request.patientName || report.request.patientId}
            </dd>
          </div>
          <div>
            <dt>Request No.</dt>
            <dd>{report.request.requestId}</dd>
          </div>
          <div>
            <dt>Laboratory Result</dt>
            <dd>{report.template.form_name}</dd>
          </div>
          <div>
            <dt>Result No.</dt>
            <dd>{report.resultId || "Not saved"}</dd>
          </div>
        </dl>
        <p className="my-4 text-sm leading-relaxed">
          Review the patient details and result before confirming release.
        </p>
        {unavailableReason && (
          <AnalysisNotice>{unavailableReason}</AnalysisNotice>
        )}
        {error && <AnalysisNotice error>{error}</AnalysisNotice>}
      </div>
      <footer className="flex flex-wrap justify-end gap-2 border-t border-gray-300 p-4">
        <Dialog.Close
          ref={cancelRef}
          disabled={pending}
          className="min-h-9 cursor-pointer rounded-md border border-gray-300 px-4 py-2 text-sm text-sky-700 hover:bg-sky-50 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </Dialog.Close>
        <AnalysisButton
          disabled={pending || Boolean(unavailableReason)}
          onClick={onConfirm}
        >
          {pending ? <LoadingSpinner size={14} /> : <Send size={14} />}
          {pending ? "Releasing..." : "Confirm Release"}
        </AnalysisButton>
      </footer>
    </div>
  );
}

type ResultReleaseControlProps = {
  report: LaboratoryReportData;
  onBackToList: () => void;
  onReleased?: (result: ResultReleaseResponse) => void;
};

export default function ResultReleaseControl({
  report,
  onBackToList,
  onReleased,
}: ResultReleaseControlProps) {
  const [open, setOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<ResultReleaseResponse | null>(
    null,
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const pendingRequest = useRef<AbortController | null>(null);
  const available =
    confirmed?.online_available === true || report.onlineAvailable === true;
  const released =
    available ||
    confirmed?.status === "Released" ||
    report.releaseStatus === "Released";
  const releasedAt = confirmed?.released_at || report.releasedAt;
  const unavailableReason = !report.resultId
    ? "Save this result before releasing it."
    : !resultReleaseApi.releaseResult
      ? "Releasing is not available yet."
      : "";
  const status = available
    ? "Available online"
    : released
      ? "Released"
      : !report.resultId || report.onlineAvailable === false
        ? "Not available online"
        : "Online availability not recorded";

  useEffect(() => () => pendingRequest.current?.abort(), []);

  async function confirmRelease() {
    if (
      pendingRequest.current ||
      unavailableReason ||
      released ||
      !report.resultId
    )
      return;
    const controller = new AbortController();
    pendingRequest.current = controller;
    setReleasing(true);
    setError("");
    try {
      const result = await releaseLaboratoryResult(
        {
          result_id: report.resultId,
          request_id: report.request.requestId,
          patient_id: report.request.patientId,
        },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setConfirmed(result);
        onReleased?.(result);
        setOpen(false);
        setShowSuccess(true);
      }
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          apiMessage(cause, "Unable to release this result. Please try again."),
        );
    } finally {
      if (!controller.signal.aborted) setReleasing(false);
      if (pendingRequest.current === controller) pendingRequest.current = null;
    }
  }

  return (
    <>
      <section
        aria-label="Result release and online availability"
        className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-gray-300 bg-gray-50 p-4"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">
          <Globe size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">Result Release</h2>
          <p className="mt-1 text-sm text-gray-500">
            {available
              ? "This result is available online for the patient."
              : released
                ? "This result is released. Patient online access has not been confirmed."
                : "Review and release the saved laboratory result."}
          </p>
          {releasedAt && (
            <p className="mt-1 text-xs text-gray-500">
              Released: {formatLabDate(releasedAt)}
            </p>
          )}
        </div>
        <span
          role="status"
          className={`rounded-full px-2.5 py-1 text-xs ${available ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}
        >
          {status}
        </span>
        <button
          ref={triggerRef}
          type="button"
          aria-disabled={released}
          onClick={() => {
            if (released) return;
            setError("");
            setOpen(true);
          }}
          className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-sky-500 bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
        >
          <Send size={13} />
          {released ? "Released" : "Release Result"}
        </button>
      </section>
      <Dialog.Root
        open={open}
        onOpenChange={(nextOpen) => {
          if (!pendingRequest.current) setOpen(nextOpen);
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60" />
          <Dialog.Viewport className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-4">
            <Dialog.Popup
              initialFocus={cancelRef}
              finalFocus={triggerRef}
              className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-md border border-gray-300 bg-white shadow-xl outline-none"
            >
              <ReleaseConfirmationContent
                report={report}
                unavailableReason={unavailableReason}
                pending={releasing}
                error={error}
                onConfirm={() => {
                  void confirmRelease();
                }}
                cancelRef={cancelRef}
              />
            </Dialog.Popup>
          </Dialog.Viewport>
        </Dialog.Portal>
      </Dialog.Root>
      <ResultSuccessOverlay
        open={showSuccess}
        title="Result Released Successfully"
        description={
          available
            ? "The laboratory result is now available online for the patient."
            : "The server confirmed that the laboratory result was released."
        }
        returnFocusRef={triggerRef}
        onClose={() => setShowSuccess(false)}
        onBackToList={() => {
          setShowSuccess(false);
          onBackToList();
        }}
      />
    </>
  );
}

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Printer } from "lucide-react";
import UniversalModal from "../../../../../components/UniversalModal";
import LoadingScreen from "../../../../../components/LoadingScreen";
import ErrorMessage from "../../../../../components/ErrorMessage";
import type { LaboratoryReportData } from "../../../../../interface/LaboratoryAnalysis";
import { ReportPreview } from "../../../../laboratory_staff/components/LaboratoryResults/PrintResultView";
import { fetchPatientLaboratoryReport } from "../utils/patientLaboratoryReport";

function ReleasedReportPreview({ resultId }: { resultId: string }) {
  const [state, setState] = useState<{
    report?: LaboratoryReportData;
    error?: string;
  } | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchPatientLaboratoryReport(resultId, controller.signal)
      .then((report) => {
        if (!controller.signal.aborted) setState({ report });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || axios.isCancel(error)) return;
        setState({
          error: axios.isAxiosError(error)
            ? "Unable to load the released report. Please try again."
            : error instanceof Error
              ? error.message
              : "Unable to load the report.",
        });
      });
    return () => controller.abort();
  }, [resultId, retry]);

  if (!state) return <LoadingScreen message="Loading released report..." />;
  if (state.error) {
    return (
      <>
        <ErrorMessage>{state.error}</ErrorMessage>
        <button
          type="button"
          onClick={() => {
            setState(null);
            setRetry((current) => current + 1);
          }}
          className="mt-3 cursor-pointer rounded-md border border-gray-300 px-4 py-2 text-sm text-sky-700 hover:bg-sky-50"
        >
          Retry
        </button>
      </>
    );
  }
  return state.report ? <ReportPreview report={state.report} /> : null;
}

export default function PatientLaboratoryPrint({
  resultId,
}: {
  resultId: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Print result ${resultId}`}
        onClick={() => setOpen(true)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-sky-500"
      >
        <Printer size={15} />
        Print Result
      </button>
      <UniversalModal
        isOpen={open}
        title="Print Laboratory Result"
        description="Preview and print your released laboratory report."
        icon={<Printer size={28} />}
        onClose={() => setOpen(false)}
        finalFocus={triggerRef}
        className="max-w-5xl"
      >
        {open && <ReleasedReportPreview key={resultId} resultId={resultId} />}
      </UniversalModal>
    </>
  );
}

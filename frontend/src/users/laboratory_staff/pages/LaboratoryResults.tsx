import { useCallback, useEffect, useRef, useState } from "react";
import Header from "../../../components/Header";
import type {
  AnalysisRequest,
  AnalysisStatus,
} from "../../../interface/LaboratoryAnalysis";
import AnalysisList from "../components/LaboratoryResults/AnalysisList";
import ResultEntry from "../components/LaboratoryResults/ResultEntry";
import PrintResultView from "../components/LaboratoryResults/PrintResultView";
import {
  apiMessage,
  fetchAnalysisRequests,
} from "../components/LaboratoryResults/utils/laboratoryResultsApi";
import { AnalysisNotice } from "../components/LaboratoryResults/AnalysisUi";
import {
  fetchSavedResults,
  startAnalysis,
} from "../components/LaboratoryResults/utils/laboratoryResultAdapters";

type LaboratoryResultsProps = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  room: string;
  // Unsaved result entry (the parent confirms before switching pages).
  onUnsavedChange?: (unsaved: boolean) => void;
};

function LaboratoryResults({
  open,
  setOpen,
  room,
  onUnsavedChange,
}: LaboratoryResultsProps) {
  const [requests, setRequests] = useState<AnalysisRequest[]>([]);
  const [selectedRequest, setSelectedRequest] =
    useState<AnalysisRequest | null>(null);
  const [printRequest, setPrintRequest] = useState<AnalysisRequest | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const pendingRequest = useRef<AbortController | null>(null);
  const startingRequest = useRef<AbortController | null>(null);
  const [activeTab, setActiveTab] =
    useState<AnalysisStatus>("Ready for Analysis");
  const [starting, setStarting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [printRefresh, setPrintRefresh] = useState(0);

  const loadRequests = useCallback(async () => {
    pendingRequest.current?.abort();
    const controller = new AbortController();
    pendingRequest.current = controller;
    setLoading(true);
    setError(null);
    setResultError(null);

    try {
      const [requestResponse, releasedResponse] = await Promise.allSettled([
        fetchAnalysisRequests(room, controller.signal),
        fetchSavedResults(room, controller.signal),
      ]);
      if (requestResponse.status === "rejected") throw requestResponse.reason;
      const items = requestResponse.value;

      if (!controller.signal.aborted) {
        setRequests(items);
        if (releasedResponse.status === "rejected") {
          setResultError(
            apiMessage(
              releasedResponse.reason,
              "Unable to load saved laboratory results.",
            ),
          );
        }
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(apiMessage(cause, "Unable to load laboratory requests."));
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [room]);

  useEffect(() => {
    const initialize = async () => {
      await loadRequests();
    };

    void initialize();
    return () => pendingRequest.current?.abort();
  }, [loadRequests]);

  useEffect(() => {
    function retryAfterReconnect() {
      if (error || resultError) void loadRequests();
    }
    window.addEventListener("online", retryAfterReconnect);
    window.addEventListener("focus", retryAfterReconnect);
    return () => {
      window.removeEventListener("online", retryAfterReconnect);
      window.removeEventListener("focus", retryAfterReconnect);
    };
  }, [error, resultError, loadRequests]);

  useEffect(() => () => startingRequest.current?.abort(), []);

  async function enterResult(request: AnalysisRequest) {
    if (startingRequest.current) return;
    const controller = new AbortController();
    startingRequest.current = controller;
    setStarting(true);
    setActionError("");
    try {
      await startAnalysis(request, controller.signal);
      if (!controller.signal.aborted) {
        setActiveTab("In Progress");
        setSelectedRequest({ ...request, status: "In Progress" });
        void loadRequests();
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setActionError(apiMessage(cause, "Unable to start analysis."));
        void loadRequests();
      }
    } finally {
      startingRequest.current = null;
      if (!controller.signal.aborted) setStarting(false);
    }
  }

  function reloadRequests() {
    setPrintRefresh((value) => value + 1);
    void loadRequests();
  }

  function returnToList() {
    setSelectedRequest(null);
    setPrintRequest(null);
    void loadRequests();
    requestAnimationFrame(() => {
      document.getElementById("analysis-heading")?.focus();
    });
  }

  return (
    <main className="min-w-0 flex-1 bg-white">
      <Header
        page="Laboratory Results"
        loading={loading}
        open={open}
        setOpen={setOpen}
        loadData={reloadRequests}
      />
      <div className="px-4 pb-9 sm:px-6">
        <div hidden={Boolean(selectedRequest || printRequest)}>
          {resultError && (
            <div className="pt-4">
              <AnalysisNotice error>
                Saved results could not be loaded: {resultError} Result entry is
                unavailable until result status can be checked. Use Refresh to
                try again.
              </AnalysisNotice>
            </div>
          )}
          {actionError && <AnalysisNotice error>{actionError}</AnalysisNotice>}
          {starting && (
            <p role="status" className="py-2 text-sm text-sky-700">
              Starting analysis...
            </p>
          )}
          <AnalysisList
            requests={requests}
            loading={loading}
            error={error}
            room={room}
            onEnter={(request) => {
              void enterResult(request);
            }}
            onPrintPreview={setPrintRequest}
            entryDisabled={Boolean(resultError || error) || starting || loading}
            selectedTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
        {selectedRequest && (
          <ResultEntry
            key={`${selectedRequest.requestId}:${selectedRequest.status}`}
            request={selectedRequest}
            onCancel={returnToList}
            onDirtyChange={onUnsavedChange}
            onSaved={() => {
              setActiveTab("Completed");
              reloadRequests();
            }}
          />
        )}

        {printRequest && (
          <PrintResultView
            request={printRequest}
            refreshKey={printRefresh}
            onBack={returnToList}
          />
        )}
      </div>
    </main>
  );
}

export default LaboratoryResults;


import { useEffect, useMemo, useState } from "react";
import Header from "../../../components/Header";
import ReleasingSide from "../components/LaboratoryResults/ReleasingSide";
import LaboratoryResultTable, {
  type LaboratoryResult,
} from "../components/LaboratoryResults/LaboratoryResultTable";
import api from "../../../lib/axios";
import { printLaboratoryResult } from "../../../utils/laboratoryResultPrint";

type LabRequest = {
  request_id: string;
  consultation_id: string | null;
  patient_id: string;
  doctor_id: string | null;
  test_type: string;
  results: Record<string, unknown> | null;
  status: string;
  requested_at: string;
  updated_at: string;
};

type LaboratoryResultsProps = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  requests: LabRequest[];
  loading: boolean;
  error: string | null;
  loadData: () => Promise<void>;
};

const BLOOD_TEST_PARAMETERS = [
  "WBC",
  "RBC",
  "HEMOGLOBIN",
  "PLATELETS",
  "NEUTROPHILS",
];

const createDefaultResults = (): LaboratoryResult[] =>
  BLOOD_TEST_PARAMETERS.map((parameter) => ({
    parameter,
    result: "",
    referenceRange: "",
    status: "",
  }));

function LaboratoryResults({
  open,
  setOpen,
  requests,
  loading,
  error,
  loadData,
}: LaboratoryResultsProps) {
  const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(
    null,
  );

  const [laboratoryResults, setLaboratoryResults] = useState<
    LaboratoryResult[]
  >([]);

  const [saving, setSaving] = useState(false);

  const releasingRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.status === "Completed" ||
          request.status === "Lab Result",
      ),
    [requests],
  );

  useEffect(() => {
    if (!selectedRequest && releasingRequests.length > 0) {
      setSelectedRequest(releasingRequests[0]);
    }
  }, [releasingRequests, selectedRequest]);

  useEffect(() => {
    if (!selectedRequest) {
      setLaboratoryResults([]);
      return;
    }

    const savedResults = selectedRequest.results;

    if (
      savedResults &&
      Array.isArray(savedResults.parameters)
    ) {
      const parameters =
        savedResults.parameters as LaboratoryResult[];

      setLaboratoryResults(parameters);
      return;
    }

    setLaboratoryResults(createDefaultResults());
  }, [selectedRequest]);

  const handleResultChange = (
    parameter: string,
    field: "result" | "referenceRange" | "status",
    value: string,
  ) => {
    setLaboratoryResults((currentResults) =>
      currentResults.map((item) =>
        item.parameter === parameter
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  };

  const validateResults = () => {
    if (!selectedRequest) {
      throw new Error("Please select a laboratory request.");
    }

    const hasEmptyResult = laboratoryResults.some(
      (item) => !item.result.trim(),
    );

    if (hasEmptyResult) {
      throw new Error("Please enter a result for every parameter.");
    }
  };

  async function saveResults(status: string) {
    if (!selectedRequest) {
      throw new Error("No laboratory request selected.");
    }

    validateResults();

    setSaving(true);

    try {
      const releasedAt = new Date().toISOString();

      await api.patch(
        `/api/labstaff/laboratory-requests/${selectedRequest.request_id}`,
        {
          status,
          results: {
            testType: selectedRequest.test_type,
            parameters: laboratoryResults,
            releasedAt,
          },
        },
      );

      await loadData();

      setSelectedRequest((current) =>
        current
          ? {
              ...current,
              status,
              results: {
                testType: current.test_type,
                parameters: laboratoryResults,
                releasedAt,
              },
            }
          : null,
      );
    } finally {
      setSaving(false);
    }
  }

  const handleRelease = async () => {
    await saveResults("Released");
  };

  const handleSendToDoctor = async () => {
    await saveResults("Released");
  };

  const handlePrint = () => {
    if (!selectedRequest) {
      window.alert("Please select a laboratory request first.");
      return;
    }

    printLaboratoryResult({
      request: selectedRequest,
      results: laboratoryResults,
    });
  };

  return (
    <main className="flex-1 min-w-0 border-gray-300">
      <Header
        page="Laboratory Results"
        loading={loading}
        open={open}
        setOpen={setOpen}
        loadData={loadData}
      />

      {/* Page heading */}
      <div className="mb-6 flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Laboratory Results
          </h2>

          <p className="text-sm text-gray-500">
            Select a patient from the releasing queue to input laboratory
            results.
          </p>
        </div>

        <h2 className="text-lg font-semibold text-slate-900">
          Date: {new Date().toLocaleDateString()}
        </h2>
      </div>

      {/* General error */}
      {error && (
        <div className="mx-6 mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Main laboratory results area */}
      <div className="flex flex-col gap-5 px-6 xl:flex-row">
        {/* Left table */}
        <ReleasingSide
          requests={requests}
          selectedRequestId={selectedRequest?.request_id ?? null}
          onSelect={(request) => setSelectedRequest(request)}
        />

        {/* Right table */}
        <div className="min-w-0 flex-1">
          {selectedRequest ? (
            <>
              {/* Patient heading */}
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">
                    {selectedRequest.patient_id}
                  </h1>

                  <p className="text-sm text-gray-500">
                    Request ID: {selectedRequest.request_id}
                  </p>
                </div>

                <div className="rounded-full bg-gray-200 px-4 py-2 text-sm font-medium text-gray-600">
                  {selectedRequest.test_type}
                </div>
              </div>

              <LaboratoryResultTable
                results={laboratoryResults}
                onChange={handleResultChange}
                onRelease={handleRelease}
                onPrint={handlePrint}
                onSendToDoctor={handleSendToDoctor}
                saving={saving}
              />
            </>
          ) : (
            <div className="flex min-h-100 items-center justify-center rounded-2xl border border-gray-300 bg-white">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-slate-700">
                  No Laboratory Request Selected
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Select a patient from the releasing queue.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default LaboratoryResults;

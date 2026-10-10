import { useEffect, useMemo, useState } from "react";
import Header from "../../../components/Header";
import ReleasingSide from "../components/LaboratoryResults/ReleasingSide";
import LaboratoryResultTable, {
  type LaboratoryResult,
} from "../components/LaboratoryResults/LaboratoryResultTable";
import api from "../../../lib/axios";

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
          request.status === "Completed" || request.status === "Lab Result",
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
    if (savedResults && Array.isArray(savedResults.parameters)) {
      const parameters = savedResults.parameters as LaboratoryResult[];

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
      await api.patch(
        `/api/labstaff/laboratory-requests/${selectedRequest.request_id}`,
        {
          status,
          results: {
            testType: selectedRequest.test_type,
            parameters: laboratoryResults,
            releasedAt: new Date().toISOString(),
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
              releasedAt: new Date().toISOString(),
            },
          }
          : null,
      );
    } finally {
      setSaving(false);
    }
  };

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

    const printWindow = window.open("", "_blank", "width=900,height=700");

    if (!printWindow) {
      window.alert("Please allow pop-ups to print the laboratory result.");
      return;
    }

    const rows = laboratoryResults
      .map(
        (item) => `
          <tr>
            <td>${item.parameter}</td>
            <td>${item.result}</td>
            <td>${item.referenceRange}</td>
            <td>${item.status}</td>
          </tr>
        `,
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laboratory Result - ${selectedRequest.patient_id}</title>

          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #222;
            }

            h1 {
              margin-bottom: 5px;
            }

            .information {
              margin-bottom: 25px;
              line-height: 1.7;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }

            th,
            td {
              border: 1px solid #ccc;
              padding: 10px;
              text-align: left;
            }

            th {
              background: #f3f4f6;
            }
          </style>
        </head>

        <body>
          <h1>Laboratory Result</h1>

          <div class="information">
            <strong>Patient ID:</strong>
            ${selectedRequest.patient_id}
            <br />

            <strong>Doctor ID:</strong>
            ${selectedRequest.doctor_id ?? "N/A"}
            <br />

            <strong>Test Type:</strong>
            ${selectedRequest.test_type}
            <br />

            <strong>Request ID:</strong>
            ${selectedRequest.request_id}
            <br />

            <strong>Date:</strong>
            ${new Date().toLocaleDateString()}
          </div>

          <table>
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Result</th>
                <th>Reference Range</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 250);
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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-6">
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
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 mx-6">
          {error}
        </div>
      )}

      {/* MAIN LABORATORY RESULTS AREA */}
      <div className="flex flex-col gap-5 xl:flex-row px-6">
        {/* LEFT TABLE */}
        <ReleasingSide
          requests={requests}
          selectedRequestId={selectedRequest?.request_id ?? null}
          onSelect={(request) => setSelectedRequest(request)}
        />

        {/* RIGHT TABLE */}
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

import api from "../../../../../lib/axios";
import type {
  AnalysisRequest,
  LaboratoryReportData,
  ReportTemplate,
  ResultEntryPayload,
  ResultReleasePayload,
  ResultReleaseResponse,
} from "../../../../../interface/LaboratoryAnalysis";
import type { Service } from "../../../../../interface/Service";
import { matchingTest, toReportTemplate } from "./reportTemplates";
import { normalizeAnalysisRequests } from "./laboratoryAnalysis";
import { retryLaboratoryRead } from "./laboratoryNetwork";
import {
  saveResult,
  loadReleasedReports,
  releaseResult,
} from "./laboratoryResultAdapters";
export { fetchReleasedResults } from "./laboratoryResultAdapters";
export {
  collectionDay,
  normalizeAnalysisRequests,
  patientAge,
} from "./laboratoryAnalysis";
export const test_requests_ENDPOINT =
  "/api/labstaff/laboratory-results/analysis-items";
export const LABORATORY_TEMPLATES_ENDPOINT =
  "/api/labstaff/laboratory-results/form-templates/";

type AnalysisReadyItem = {
  item_id: string;
  request_id: string;
  patient_id: string;
  service_name: string;
  request_status: string;
  service_id: string;
  room: string;
  queue_id: string | null;
  status: string;
  analysis_status: "Ready for Analysis" | "In Progress" | "Completed";
};

function isCollected(status: string) {
  return [
    "specimen collected",
    "in progress",
    "completed",
    "released",
  ].includes(status.trim().toLowerCase());
}

export async function fetchAnalysisRequests(
  room: string,
  signal?: AbortSignal,
): Promise<AnalysisRequest[]> {
  return retryLaboratoryRead(() => loadAnalysisRequests(room, signal), signal);
}

async function loadAnalysisRequests(
  room: string,
  signal?: AbortSignal,
): Promise<AnalysisRequest[]> {
  const response = await api.get(test_requests_ENDPOINT, {
    params: { room },
    signal,
  });
  if (!Array.isArray(response.data)) {
    throw new Error("The analysis-ready response was not a list.");
  }
  const items: AnalysisReadyItem[] = response.data.filter(
    (item) =>
      item?.room === room &&
      typeof item.status === "string" &&
      isCollected(item.status),
  );
  if (!items.length) return [];
  if (
    items.some(
      (item) =>
        !item.item_id ||
        !item.request_id ||
        !item.patient_id ||
        !item.service_id ||
        !item.service_name,
    )
  ) {
    throw new Error(
      "Some laboratory tests are missing patient or request information. Please reload laboratory requests.",
    );
  }
  // Historical completed tests may have no queue. The analysis endpoint joins
  // patient and service details through request_id, so queue_id is optional.
  const rows = items.map((item) => ({
    ...item,
    request_status: item.request_status || item.status,
    sample_status: "Specimen Collected",
    items: [item],
  }));
  if (signal?.aborted)
    throw new Error("Loading laboratory requests was cancelled.");
  return normalizeAnalysisRequests(rows, room);
}

export async function fetchPublishedReportTemplates(
  request: AnalysisRequest,
  signal?: AbortSignal,
): Promise<ReportTemplate[]> {
  try {
    const [templateResponse, serviceResponse] = await Promise.all([
      api.get(LABORATORY_TEMPLATES_ENDPOINT, { signal }),
      api.get("/api/labstaff/services/" + encodeURIComponent(request.room), {
        signal,
      }),
    ]);
    const rows: unknown = templateResponse.data;
    const services: Service[] = serviceResponse.data;
    if (!Array.isArray(rows) || !Array.isArray(services)) {
      throw new Error("Unable to read published templates and their services.");
    }
    return (
      rows
        // Older published-template responses omitted the status column.
        .filter(
          (row) =>
            row && (row.status === undefined || row.status === "Published"),
        )
        .map((row) => ({
          ...toReportTemplate({ ...row, status: "Published" }, services),
          fieldsAvailable: Array.isArray(row.components),
        }))
        .filter((template) => matchingTest(request, template))
    );
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response
      ?.status;
    if (status === 401 || status === 403) {
      throw new Error(
        "Published report templates are unavailable for this laboratory account. Please sign in again or contact an administrator.",
        { cause: error },
      );
    }
    throw error;
  }
}

export const resultEntryApi: {
  loadTemplates:
    | null
    | ((
        request: AnalysisRequest,
        signal?: AbortSignal,
      ) => Promise<ReportTemplate[]>);
  saveResult:
    | null
    | ((payload: ResultEntryPayload) => Promise<{
        result_id: string;
      }>);
} = {
  loadTemplates: fetchPublishedReportTemplates,
  saveResult,
};

export async function submitResultEntry(payload: ResultEntryPayload): Promise<{
  result_id: string;
}> {
  if (!resultEntryApi.saveResult) {
    throw new Error("Result saving is not available yet.");
  }

  const result = await resultEntryApi.saveResult(payload);

  if (
    !result ||
    typeof result.result_id !== "string" ||
    !result.result_id.trim()
  ) {
    throw new Error(
      "The server did not confirm a saved result. Your entries have been kept.",
    );
  }

  return result;
}

export const resultPrintApi: {
  loadResults:
    | null
    | ((
        request: AnalysisRequest,
        signal?: AbortSignal,
      ) => Promise<LaboratoryReportData[]>);
} = {
  loadResults: loadReleasedReports,
};

export async function fetchPrintableResults(
  request: AnalysisRequest,
  signal?: AbortSignal,
): Promise<LaboratoryReportData[]> {
  if (!resultPrintApi.loadResults) {
    throw new Error(
      "Saved results are not available for preview yet. The result-reading service has not been connected.",
    );
  }

  const reports = await resultPrintApi.loadResults(request, signal);

  if (!Array.isArray(reports) || !reports.length) {
    throw new Error("No saved results are available for this request.");
  }

  if (
    reports.some(
      (report) =>
        !report?.resultId?.trim() ||
        report.request?.requestId !== request.requestId ||
        report.request?.patientId !== request.patientId ||
        !report.template?.form_id ||
        !Array.isArray(report.template.components) ||
        !matchingTest(request, report.template) ||
        !report.values ||
        typeof report.values !== "object" ||
        Array.isArray(report.values),
    )
  ) {
    throw new Error(
      "The saved result or its original report template is incomplete. Unable to prepare a printable report.",
    );
  }

  return reports;
}

// Release status and confirmed patient online access are separate server facts.
export const resultReleaseApi: {
  releaseResult:
    | null
    | ((
        payload: ResultReleasePayload,
        signal?: AbortSignal,
      ) => Promise<ResultReleaseResponse>);
} = { releaseResult };

export async function releaseLaboratoryResult(
  payload: ResultReleasePayload,
  signal?: AbortSignal,
): Promise<ResultReleaseResponse> {
  if (signal?.aborted) throw new Error("The release request was cancelled.");
  if (
    ![payload.result_id, payload.request_id, payload.patient_id].every(
      (value) => typeof value === "string" && value.trim(),
    )
  ) {
    throw new Error(
      "A saved result, request, and patient are required before releasing.",
    );
  }
  if (!resultReleaseApi.releaseResult) {
    throw new Error(
      "Releasing is not available yet. This result has not been made available online.",
    );
  }
  const result = await resultReleaseApi.releaseResult(payload, signal);
  if (signal?.aborted) throw new Error("The release request was cancelled.");
  if (
    !result ||
    result.result_id !== payload.result_id ||
    (result.status !== "Released" && result.online_available !== true)
  ) {
    throw new Error(
      "The server did not confirm release. Reload the result to check its status before retrying.",
    );
  }
  return result;
}

export function apiMessage(error: unknown, fallback: string) {
  const cause = error as {
    response?: {
      data?: {
        message?: string;
        error?: string;
      };
    };
    message?: string;
  };

  return (
    cause?.response?.data?.message ||
    cause?.response?.data?.error ||
    cause?.message ||
    fallback
  );
}

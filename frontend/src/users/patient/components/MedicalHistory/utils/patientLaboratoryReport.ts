import api from "../../../../../lib/axios";
import type {
  AnalysisRequest,
  LaboratoryReportData,
} from "../../../../../interface/LaboratoryAnalysis";
import {
  releasedReports,
  type ReleasedResult,
} from "../../../../laboratory_staff/components/LaboratoryResults/utils/laboratoryResultAdapters";
import { patientAge } from "../../../../laboratory_staff/components/LaboratoryResults/utils/laboratoryAnalysis";

type PatientReleasedResult = ReleasedResult & {
  status: "Released";
  request_id: string;
  patient_id: string;
  patient_name: string;
  birthdate: string;
  sex: string;
  requested_at: string;
  is_priority: boolean;
  service_id: string;
  service_name: string;
  queue_id: string | null;
  room: string;
  released_at: string | null;
};

export async function fetchPatientLaboratoryReport(
  resultId: string,
  signal?: AbortSignal,
): Promise<LaboratoryReportData> {
  const { data } = await api.get<{ results: PatientReleasedResult[] }>(
    `/api/patient/laboratory-results/${encodeURIComponent(resultId)}`,
    { signal },
  );
  const result = Array.isArray(data.results) ? data.results[0] : undefined;
  if (
    !result ||
    result.result_id !== resultId ||
    result.status !== "Released" ||
    !result.patient_id ||
    !result.request_id ||
    !result.item_id ||
    !result.service_id ||
    !Array.isArray(result.results)
  ) {
    throw new Error("The released report could not be loaded. Please try again.");
  }
  const request: AnalysisRequest = {
    requestId: result.request_id,
    queueId: result.queue_id ?? "",
    patientId: result.patient_id,
    patientName: result.patient_name,
    birthdate: result.birthdate,
    age: patientAge(result.birthdate),
    sex: result.sex,
    requestedAt: result.requested_at,
    // A collection time is not returned by this endpoint; do not substitute another date.
    collectedAt: "",
    accepted: true,
    sampleCollected: true,
    room: result.room,
    priority: result.is_priority,
    category: result.is_priority ? "Priority" : "Normal",
    status: "Completed",
    consultationType: "Laboratory Request",
    tests: [
      {
        id: result.item_id,
        serviceId: result.service_id,
        name: result.service_name,
        description: "",
      },
    ],
  };
  try {
    // Reuse the lab's saved template snapshot and values, including its units and ranges.
    const [report] = releasedReports(request, [result]);
    if (!report) throw new Error("Missing saved report");
    return { ...report, releasedAt: result.released_at ?? undefined };
  } catch {
    throw new Error(
      "This result's saved report layout is unavailable. Please contact the laboratory for a printed copy.",
    );
  }
}

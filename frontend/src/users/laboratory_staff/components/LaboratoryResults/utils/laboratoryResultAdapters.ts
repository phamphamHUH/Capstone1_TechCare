import api from "../../../../../lib/axios";
import type {
  AnalysisRequest,
  LaboratoryReportData,
  ResultEntryPayload,
  ResultReleasePayload,
  ResultReleaseResponse,
} from "../../../../../interface/LaboratoryAnalysis";
import { inputTypes } from "./laboratoryValidation";
import { matchingTest, toReportTemplate } from "./reportTemplates";
import { retryLaboratoryRead } from "./laboratoryNetwork";

export const test_results_ENDPOINT = "/api/labstaff/laboratory-results";

type StoredEntry = {
  name: string;
  result: string | number;
  field_key?: string;
  raw_value?: unknown;
  template_snapshot?: unknown;
};

export type ReleasedResult = {
  result_id: string;
  item_id: string;
  results: StoredEntry[];
  remarks?: string;
  created_at?: string;
  verified_by?: string;
  verified_at?: string;
  status?: "Pending" | "Released";
  service_category?: string | null;
};

function resultText(value: unknown): string | number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return JSON.stringify(value);
}

export async function saveResult(payload: ResultEntryPayload) {
  const template = payload.template_snapshot;
  if (
    !payload.item_id ||
    !template ||
    template.form_id !== payload.form_id ||
    template.service_id !== payload.service_id ||
    (template.version ?? null) !== payload.template_version
  ) {
    throw new Error(
      "The result does not match its laboratory item and template. Reload the request before saving.",
    );
  }
  const results: StoredEntry[] = template.components
    .filter((component) => inputTypes.has(component.type))
    .filter((component) => {
      const value = payload.values[component.fieldKey];
      return (
        value != null &&
        value !== "" &&
        !(typeof value === "string" && !value.trim()) &&
        !(Array.isArray(value) && !value.length)
      );
    })
    .map((component) => ({
      name: component.label,
      result: resultText(payload.values[component.fieldKey]),
      field_key: component.fieldKey,
      raw_value: payload.values[component.fieldKey],
    }));
  if (!results.length)
    throw new Error("Enter at least one result before saving.");
  // The existing endpoint preserves additional properties in its JSONB results.
  // Store the actual selected admin revision, never reconstruct from a newer one.
  results[0].template_snapshot = template;
  const response = await api.post(
    `${test_results_ENDPOINT}/${encodeURIComponent(payload.item_id)}`,
    { results, remarks: payload.remarks, room: payload.room },
  );
  const saved = response.data?.result;
  if (
    typeof saved?.result_id !== "string" ||
    !saved.result_id.trim() ||
    saved.item_id !== payload.item_id
  ) {
    throw new Error(
      "The server did not confirm this item's saved result. Your entries have been kept.",
    );
  }
  return { result_id: saved.result_id };
}

export async function fetchReleasedResults(
  signal?: AbortSignal,
): Promise<ReleasedResult[]> {
  const response = await api.get(test_results_ENDPOINT, { signal });
  const results: unknown = response.data?.results;
  if (
    !Array.isArray(results) ||
    results.some(
      (row) =>
        !row ||
        typeof row.result_id !== "string" ||
        !row.result_id.trim() ||
        typeof row.item_id !== "string" ||
        !row.item_id.trim() ||
        !Array.isArray(row.results),
    )
  ) {
    throw new Error("The released-results response could not be read.");
  }
  return results;
}

export function releasedReports(
  request: AnalysisRequest,
  results: ReleasedResult[],
): LaboratoryReportData[] {
  const itemIds = new Set(request.tests.map((test) => test.id));
  return results
    .filter((row) => itemIds.has(row.item_id))
    .map((row) => {
      const stored = row.results.find(
        (entry) => entry.template_snapshot,
      )?.template_snapshot;
      if (!stored) {
        throw new Error(
          "This saved result does not include its original report template. The backend must provide that template before it can be printed in its original format.",
        );
      }
      const template = toReportTemplate(stored, []);
      // Recover the category for older snapshots that did not save it.
      if (template.category.toLowerCase() === "laboratory" && row.service_category?.trim()) {
        template.category = row.service_category.trim();
      }
      const test = matchingTest(request, template);
      if (test?.id !== row.item_id || !template.components.length) {
        throw new Error(
          "The saved report template does not match this laboratory item.",
        );
      }
      const entries = row.results;
      if (
        entries.some(
          (entry) =>
            !entry ||
            typeof entry.field_key !== "string" ||
            !Object.hasOwn(entry, "raw_value"),
        )
      ) {
        throw new Error(
          "The saved result is missing its original field values.",
        );
      }
      return {
        request,
        template,
        values: Object.fromEntries(
          entries.map((entry) => [entry.field_key!, entry.raw_value]),
        ),
        remarks: row.remarks ?? "",
        resultId: row.result_id,
        savedAt: row.created_at,
        verifiedBy: row.verified_by,
        verifiedAt: row.verified_at,
        releaseStatus: row.status ?? "Released",
      };
    });
}

export async function loadReleasedReports(
  request: AnalysisRequest,
  signal?: AbortSignal,
) {
  return releasedReports(
    request,
    await fetchSavedResults(request.room, signal),
  );
}

export async function fetchSavedResults(
  room: string,
  signal?: AbortSignal,
): Promise<ReleasedResult[]> {
  const response = await retryLaboratoryRead(
    () =>
      api.get(`${test_results_ENDPOINT}/saved`, {
        params: { room },
        signal,
      }),
    signal,
  );
  const results = response.data?.results;
  if (
    !Array.isArray(results) ||
    results.some(
      (row) =>
        !row ||
        typeof row.result_id !== "string" ||
        typeof row.item_id !== "string" ||
        !Array.isArray(row.results) ||
        !["Pending", "Released"].includes(row.status),
    )
  )
    throw new Error("The saved-results response could not be read.");
  return results;
}

export async function startAnalysis(
  request: AnalysisRequest,
  signal?: AbortSignal,
) {
  const ids = request.tests.map((test) => test.id);
  if (!ids.length || ids.some((id) => !id) || new Set(ids).size !== ids.length)
    throw new Error("Laboratory item IDs are incomplete.");
  const response = await api.patch(
    "/api/labstaff/laboratory-requests/analysis/start",
    { room: request.room, item_ids: ids },
    { signal },
  );
  const items = response.data?.items;
  if (
    !Array.isArray(items) ||
    items.length !== ids.length ||
    new Set(items.map((item) => item.item_id)).size !== ids.length ||
    items.some(
      (item) => !ids.includes(item.item_id) || item.status !== "In Progress",
    )
  )
    throw new Error(
      "The server did not confirm that analysis started. Refresh the list before retrying.",
    );
}

export function applyReleasedResults(
  requests: AnalysisRequest[],
  results: ReleasedResult[],
): AnalysisRequest[] {
  const releasedIds = new Set(results.map((result) => result.item_id));
  return requests.flatMap((request) => {
    const completed = request.tests.filter((test) => releasedIds.has(test.id));
    const ready = request.tests.filter((test) => !releasedIds.has(test.id));
    const rows: AnalysisRequest[] = [];
    if (ready.length) rows.push({ ...request, tests: ready });
    if (completed.length)
      rows.push({ ...request, tests: completed, status: "Completed" });
    return rows;
  });
}

export async function releaseResult(
  payload: ResultReleasePayload,
  signal?: AbortSignal,
): Promise<ResultReleaseResponse> {
  const response = await api.patch(
    `${test_results_ENDPOINT}/${encodeURIComponent(payload.result_id)}/release`,
    undefined,
    { signal },
  );
  const released = response.data?.result;
  if (
    released?.result_id !== payload.result_id ||
    released.status !== "Released"
  ) {
    throw new Error(
      "The server did not confirm release. Reload this result before retrying.",
    );
  }
  return {
    result_id: released.result_id,
    status: "Released",
    // updated_at is returned by the successful release operation itself.
    released_at:
      typeof released.updated_at === "string" &&
      Number.isFinite(Date.parse(released.updated_at))
        ? released.updated_at
        : undefined,
  };
}

import type {
  AnalysisRequest,
  ResultValues,
} from "../../../../../../interface/LaboratoryAnalysis";

// Unsaved result entries are kept on this computer so a misclick, page change
// or closed tab doesn't lose them. Removed once the result is saved.

export type ResultDraft = {
  templateId: string;
  values: ResultValues;
  remarks: string;
  savedAt: string;
};

const PREFIX = "lab-result-draft";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Per staff member and per request (and its tests).
export function draftKey(request: AnalysisRequest) {
  let userId = "unknown";
  try {
    userId = JSON.parse(sessionStorage.getItem("user") || "{}").user_id || userId;
  } catch {
    // Keep the fallback.
  }
  const tests = request.tests.map((test) => test.id || test.name).join(",");
  return `${PREFIX}:${userId}:${request.requestId}:${tests}`;
}

export function readDraft(key: string): ResultDraft | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const draft = JSON.parse(raw) as ResultDraft;
    if (
      !draft.templateId ||
      Date.now() - new Date(draft.savedAt).getTime() > MAX_AGE_MS
    ) {
      localStorage.removeItem(key);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

// Returns the save time, or null when storage is unavailable.
export function writeDraft(
  key: string,
  draft: Omit<ResultDraft, "savedAt">,
): string | null {
  const savedAt = new Date().toISOString();
  try {
    localStorage.setItem(key, JSON.stringify({ ...draft, savedAt }));
    return savedAt;
  } catch {
    return null;
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to clear.
  }
}

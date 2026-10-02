export const DIAGNOSIS_TYPES = ["Primary", "Secondary"] as const;
export type DiagnosisType = (typeof DIAGNOSIS_TYPES)[number];

export const PHYSICAL_EXAM_FIELDS = [
  "general_appearance",
  "heent",
  "cardiovascular",
  "respiratory",
  "abdomen",
  "extremities",
] as const;
export type PhysicalExamField = (typeof PHYSICAL_EXAM_FIELDS)[number];

export const LIMITS = {
  hpiMin: 10,
  hpiMax: 2000,
  diagnosisNameMin: 2,
  diagnosisNameMax: 255,
  maxDiagnoses: 10,
  examMax: 500,
  maxLabServices: 20,
} as const;

// ICD-10 category (letter A-T or V-Z, 2 digits / A / B) + optional subcategory.
export const ICD10_PATTERN = /^[A-TV-Z][0-9][0-9AB](\.[0-9A-TV-Z]{1,4})?$/;

export type DiagnosisEntry = {
  diagnosis: string;
  icd10: string;
  type: DiagnosisType;
};

export type FindingsValue = {
  presenting_complaint: { hpi: string };
  diagnosis: DiagnosisEntry[];
  physical_examination: Partial<Record<PhysicalExamField, string>>;
};

export type FieldErrors = Record<string, string>;
export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: FieldErrors };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function validateFindings(input: unknown): ValidationResult<FindingsValue> {
  const errors: FieldErrors = {};
  const body = isRecord(input) ? input : {};

  // --- History of Present Illness -------------------------------------
  const rawHpi = isRecord(body.presenting_complaint)
    ? body.presenting_complaint.hpi
    : body.presenting_complaint;
  const hpi = clean(rawHpi);
  if (!hpi) {
    errors.presenting_complaint = "History of present illness is required.";
  } else if (hpi.length < LIMITS.hpiMin) {
    errors.presenting_complaint = `Please enter at least ${LIMITS.hpiMin} characters.`;
  } else if (hpi.length > LIMITS.hpiMax) {
    errors.presenting_complaint = `Must be ${LIMITS.hpiMax} characters or fewer.`;
  }

  // --- Assessment / Diagnosis -----------------------------------------
  const diagnosis: DiagnosisEntry[] = [];
  if (!Array.isArray(body.diagnosis) || body.diagnosis.length === 0) {
    errors.diagnosis = "Add at least one diagnosis.";
  } else if (body.diagnosis.length > LIMITS.maxDiagnoses) {
    errors.diagnosis = `No more than ${LIMITS.maxDiagnoses} diagnoses are allowed.`;
  } else {
    const seenCodes = new Set<string>();
    body.diagnosis.forEach((raw, i) => {
      const row = isRecord(raw) ? raw : {};
      const name = clean(row.diagnosis);
      const icd10 = clean(row.icd10).toUpperCase();
      const type = row.type;

      if (name.length < LIMITS.diagnosisNameMin) {
        errors[`diagnosis.${i}.diagnosis`] = "Diagnosis name is required.";
      } else if (name.length > LIMITS.diagnosisNameMax) {
        errors[`diagnosis.${i}.diagnosis`] = `Must be ${LIMITS.diagnosisNameMax} characters or fewer.`;
      }

      if (!icd10) {
        errors[`diagnosis.${i}.icd10`] = "ICD-10 code is required.";
      } else if (!ICD10_PATTERN.test(icd10)) {
        errors[`diagnosis.${i}.icd10`] = "Use a valid ICD-10 code, e.g. J06.9.";
      } else if (seenCodes.has(icd10)) {
        errors[`diagnosis.${i}.icd10`] = "This ICD-10 code is already listed.";
      }
      seenCodes.add(icd10);

      if (!DIAGNOSIS_TYPES.includes(type as DiagnosisType)) {
        errors[`diagnosis.${i}.type`] = "Type must be Primary or Secondary.";
      }

      diagnosis.push({ diagnosis: name, icd10, type: type as DiagnosisType });
    });

    if (!errors.diagnosis) {
      const primaryCount = diagnosis.filter((d) => d.type === "Primary").length;
      if (primaryCount === 0) errors.diagnosis = "Mark one diagnosis as Primary.";
      else if (primaryCount > 1) errors.diagnosis = "Only one diagnosis can be Primary.";
    }
  }

  // --- Physical Examination -------------------------------------------
  const physical_examination: Partial<Record<PhysicalExamField, string>> = {};
  const exam = isRecord(body.physical_examination) ? body.physical_examination : {};
  for (const field of PHYSICAL_EXAM_FIELDS) {
    const value = clean(exam[field]);
    if (value.length > LIMITS.examMax) {
      errors[`physical_examination.${field}`] = `Must be ${LIMITS.examMax} characters or fewer.`;
    }
    if (value) physical_examination[field] = value;
  }
  if (Object.keys(physical_examination).length === 0) {
    errors.physical_examination = "Enter at least one physical examination finding.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { presenting_complaint: { hpi }, diagnosis, physical_examination },
  };
}

// --------------------------------------------------------------------------
// Laboratory request
// --------------------------------------------------------------------------

export type LabRequestValue = {
  patient_id: string;
  consultation_record_id: string | null;
  service_ids: string[];
  priority: "Yes" | "No";
  request_date: string | null; // YYYY-MM-DD
  estimated_release_date: string | null; // YYYY-MM-DD
};

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRealDate(value: string) {
  const m = DATE_ONLY.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === mo - 1 &&
    date.getUTCDate() === d
  );
}

export function validateLabRequest(input: unknown): ValidationResult<LabRequestValue> {
  const errors: FieldErrors = {};
  const body = isRecord(input) ? input : {};

  const patient_id = clean(body.patient_id);
  if (!patient_id) errors.patient_id = "Patient is required.";
  else if (patient_id.length > 255) errors.patient_id = "Invalid patient ID.";

  const consultation_record_id = clean(body.consultation_record_id) || null;

  // services may be ["S-CBC"] or [{ service_id: "S-CBC" }]
  const service_ids: string[] = [];
  if (!Array.isArray(body.services) || body.services.length === 0) {
    errors.services = "Select at least one laboratory test.";
  } else if (body.services.length > LIMITS.maxLabServices) {
    errors.services = `No more than ${LIMITS.maxLabServices} tests can be requested at once.`;
  } else {
    for (const entry of body.services) {
      const id = clean(isRecord(entry) ? entry.service_id : entry);
      if (!id) {
        errors.services = "Each selected test must have a service ID.";
        break;
      }
      if (service_ids.includes(id)) {
        errors.services = "The same test was selected more than once.";
        break;
      }
      service_ids.push(id);
    }
  }

  const rawPriority = body.priority === undefined ? "No" : body.priority;
  if (rawPriority !== "Yes" && rawPriority !== "No") {
    errors.priority = "Priority must be Yes or No.";
  }

  const request_date = clean(body.request_date) || null;
  if (request_date && !isRealDate(request_date)) {
    errors.request_date = "Enter a valid request date.";
  }

  const estimated_release_date = clean(body.estimated_release_date) || null;
  if (estimated_release_date && !isRealDate(estimated_release_date)) {
    errors.estimated_release_date = "Enter a valid estimated release date.";
  } else if (
    estimated_release_date &&
    request_date &&
    !errors.request_date &&
    estimated_release_date < request_date
  ) {
    errors.estimated_release_date = "Release date can't be before the request date.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      patient_id,
      consultation_record_id,
      service_ids,
      priority: rawPriority as "Yes" | "No",
      request_date,
      estimated_release_date,
    },
  };
}

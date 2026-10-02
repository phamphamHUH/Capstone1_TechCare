// Browser-side mirror of backend/src/utils/consultationValidation.ts.
// Keep the two in sync; the server is still the source of truth.
import type {
  FieldErrors,
  FindingsFormState,
  LabRequestFormState,
} from "./types";
import { PHYSICAL_EXAM_FIELDS } from "./types";

export const LIMITS = {
  hpiMin: 10,
  hpiMax: 2000,
  diagnosisNameMin: 2,
  diagnosisNameMax: 255,
  maxDiagnoses: 10,
  examMax: 500,
  maxLabServices: 20,
} as const;

export const ICD10_PATTERN = /^[A-TV-Z][0-9][0-9AB](\.[0-9A-TV-Z]{1,4})?$/;

export function validateFindingsForm(state: FindingsFormState): FieldErrors {
  const errors: FieldErrors = {};

  const hpi = state.hpi.trim();
  if (!hpi) errors.presenting_complaint = "History of present illness is required.";
  else if (hpi.length < LIMITS.hpiMin)
    errors.presenting_complaint = `Please enter at least ${LIMITS.hpiMin} characters.`;
  else if (hpi.length > LIMITS.hpiMax)
    errors.presenting_complaint = `Must be ${LIMITS.hpiMax} characters or fewer.`;

  if (state.diagnosis.length === 0) {
    errors.diagnosis = "Add at least one diagnosis.";
  } else if (state.diagnosis.length > LIMITS.maxDiagnoses) {
    errors.diagnosis = `No more than ${LIMITS.maxDiagnoses} diagnoses are allowed.`;
  } else {
    const seen = new Set<string>();
    state.diagnosis.forEach((row, i) => {
      const name = row.diagnosis.trim();
      const code = row.icd10.trim().toUpperCase();
      if (name.length < LIMITS.diagnosisNameMin)
        errors[`diagnosis.${i}.diagnosis`] = "Diagnosis name is required.";
      else if (name.length > LIMITS.diagnosisNameMax)
        errors[`diagnosis.${i}.diagnosis`] = `Must be ${LIMITS.diagnosisNameMax} characters or fewer.`;

      if (!code) errors[`diagnosis.${i}.icd10`] = "ICD-10 code is required.";
      else if (!ICD10_PATTERN.test(code))
        errors[`diagnosis.${i}.icd10`] = "Use a valid ICD-10 code, e.g. J06.9.";
      else if (seen.has(code))
        errors[`diagnosis.${i}.icd10`] = "This ICD-10 code is already listed.";
      seen.add(code);
    });
    const primary = state.diagnosis.filter((d) => d.type === "Primary").length;
    if (primary === 0) errors.diagnosis = "Mark one diagnosis as Primary.";
    else if (primary > 1) errors.diagnosis = "Only one diagnosis can be Primary.";
  }

  let anyExam = false;
  for (const { key } of PHYSICAL_EXAM_FIELDS) {
    const v = state.exam[key].trim();
    if (v) anyExam = true;
    if (v.length > LIMITS.examMax)
      errors[`physical_examination.${key}`] = `Must be ${LIMITS.examMax} characters or fewer.`;
  }
  if (!anyExam) errors.physical_examination = "Enter at least one physical examination finding.";

  return errors;
}

export function validateLabRequestForm(
  patientId: string,
  state: LabRequestFormState,
): FieldErrors {
  const errors: FieldErrors = {};
  if (!patientId) errors.patient_id = "Select a patient first.";
  if (state.serviceIds.length === 0) errors.services = "Select at least one laboratory test.";
  else if (state.serviceIds.length > LIMITS.maxLabServices)
    errors.services = `No more than ${LIMITS.maxLabServices} tests can be requested at once.`;

  const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
  if (state.requestDate && !isDate(state.requestDate))
    errors.request_date = "Enter a valid request date.";
  if (state.estimatedReleaseDate && !isDate(state.estimatedReleaseDate))
    errors.estimated_release_date = "Enter a valid estimated release date.";
  else if (
    state.estimatedReleaseDate &&
    state.requestDate &&
    !errors.request_date &&
    state.estimatedReleaseDate < state.requestDate
  )
    errors.estimated_release_date = "Release date can't be before the request date.";
  return errors;
}

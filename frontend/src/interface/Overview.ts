import type { QueueEntry } from "./Queue";

export type DiagnosisType = "Primary" | "Secondary";
export type Diagnosis = {
  id: number;
  name: string; // the clinic doesn't use ICD-10 codes
  type: DiagnosisType;
};
export type NoteField = (typeof NOTE_FIELDS)[number];
export type NoteKey = NoteField["key"];
export type VitalKey = (typeof VITAL_FIELDS)[number]["key"];
export type ExamKey = (typeof EXAM_FIELDS)[number]["key"];
export type NewDiagnosis = Omit<Diagnosis, "id">;

export const CONSULTATION_TYPES = [
  "Initial Checkup",
  "Follow-up",
  "Routine Check-up",
  "Emergency / Urgent",
  "Referral",
  "Result Review",
  "Prescription Refill",
  "Medical Clearance",
  "Other",
];
export const EXAM_FIELDS = [
  {
    key: "generalAppearance",
    label: "General Appearance",
    placeholder: "e.g. Awake, not in distress",
  },
  {
    key: "heent",
    label: "HEENT",
    placeholder: "e.g. Pink palpebral conjunctiva, clear TM",
  },
  {
    key: "cardiovascular",
    label: "Cardiovascular",
    placeholder: "e.g. Adynamic precordium, normal rate, regular rhythm",
  },
  {
    key: "respiratory",
    label: "Respiratory",
    placeholder: "e.g. Clear breath sounds, no wheezing",
  },
  { key: "abdomen", label: "Abdomen", placeholder: "e.g. Soft, non-tender" },
  { key: "extremities", label: "Extremities", placeholder: "e.g. No edema" },
] as const;
export const VITAL_FIELDS = [
  {
    key: "bloodPressure",
    label: "BP",
    unit: "mmHg",
    placeholder: "120/80",
    inputMode: "numeric",
    pattern: /^\d{0,3}\/?\d{0,3}$/,
  },
  {
    key: "heartRate",
    label: "HR",
    unit: "bpm",
    placeholder: "78",
    inputMode: "numeric",
    pattern: /^\d{0,3}$/,
  },
  {
    key: "respiratoryRate",
    label: "Respiratory Rate",
    unit: "/min",
    placeholder: "18",
    inputMode: "numeric",
    pattern: /^\d{0,3}$/,
  },
  {
    key: "temperature",
    label: "Temp",
    unit: "°C",
    placeholder: "36.8",
    inputMode: "decimal",
    pattern: /^\d{0,2}\.?\d{0,1}$/,
  },
  {
    key: "bloodOxygen",
    label: "SpO₂",
    unit: "%",
    placeholder: "98",
    inputMode: "numeric",
    pattern: /^\d{0,3}$/,
  },
] as const;
export const NOTE_FIELDS = [
  {
    key: "hpi",
    label: "History of Present Illness (HPI) *",
    rows: 4,
    placeholder: "Describe the history of the present illness...",
  },
  {
    key: "chiefComplaint",
    label: "Chief Complaint",
    rows: 3,
    placeholder: "Enter the patient's chief complaint...",
  },
  {
    key: "doctorNotes",
    label: "Doctor's Notes",
    rows: 4,
    placeholder:
      "Add clinical observations, treatment rationale, or follow-up instructions here...",
  },
] as const;
export const [hpiField, complaintField, doctorNotesField] = NOTE_FIELDS;
export const VISIT_TILES = [
  { label: "Queue No.", get: (q: QueueEntry) => q.queue_id },
  {
    label: "Consultation ID",
    get: (q: QueueEntry) => q.consultation_record_id,
  },
] as const;

export type DiagnosisType = "Primary" | "Secondary";

export const PHYSICAL_EXAM_FIELDS = [
  { key: "general_appearance", label: "General Appearance" },
  { key: "heent", label: "HEENT" },
  { key: "cardiovascular", label: "Cardiovascular" },
  { key: "respiratory", label: "Respiratory" },
  { key: "abdomen", label: "Abdomen" },
  { key: "extremities", label: "Extremities" },
] as const;

export type PhysicalExamKey = (typeof PHYSICAL_EXAM_FIELDS)[number]["key"];

export type DiagnosisRow = {
  /** Local-only React key; not sent to the API. */
  key: string;
  diagnosis: string;
  icd10: string;
  type: DiagnosisType;
};

export type FindingsFormState = {
  hpi: string;
  diagnosis: DiagnosisRow[];
  exam: Record<PhysicalExamKey, string>;
};

export type FieldErrors = Record<string, string>;

export type ConsultationPatient = {
  patient_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  sex: string;
  birthdate: string; // YYYY-MM-DD
  contact_number: string;
  address: string | null;
  image_url: string | null;
};

export type LaboratoryService = {
  service_id: string;
  service_name: string;
  service_type: string;
  price: string | number;
  room: string;
};

export type LabPriority = "Yes" | "No";

export type LabRequestFormState = {
  serviceIds: string[];
  priority: LabPriority;
  requestDate: string; // YYYY-MM-DD
  estimatedReleaseDate: string; // YYYY-MM-DD
};

export type WorkspaceTab =
  | "consultation"
  | "medical-history"
  | "laboratory-results"
  | "laboratory-request"
  | "attachments";

export const WORKSPACE_TABS: { key: WorkspaceTab; label: string }[] = [
  { key: "consultation", label: "Consultation" },
  { key: "medical-history", label: "Medical History" },
  { key: "laboratory-results", label: "Laboratory Results" },
  { key: "laboratory-request", label: "Laboratory Request" },
  { key: "attachments", label: "Attachments" },
];

let rowSeq = 0;
export const newDiagnosisRow = (): DiagnosisRow => ({
  key: `dx-${Date.now()}-${rowSeq++}`,
  diagnosis: "",
  icd10: "",
  type: "Secondary",
});

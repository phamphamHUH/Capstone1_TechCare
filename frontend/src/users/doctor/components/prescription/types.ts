export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route?: string;
  instructions: string;
}

export interface PatientInfo {
  id: string;
  patientId: string;
  name: string;
  age: number | string;
  sex: string;
  birthdate: string;
  contactNumber: string;
  address?: string;
  isSeniorCitizen?: boolean;
  isPwd?: boolean;
  avatarInitials: string;
}

export interface DoctorInfo {
  name: string;
  title: string;
  licenseNumber: string;
  department?: string;
  ptrNumber?: string;
  s2Number?: string;
}

export interface Prescription {
  id: string;
  prescriptionNumber: string;
  date: string;
  consultationId?: string;
  patient: PatientInfo;
  doctor: DoctorInfo;
  medications: Medication[];
  additionalNotes?: string;
  createdAt: string;
  status: "active" | "completed" | "draft";
}

export interface PrintOptions {
  paperSize: "A4" | "Letter" | "Legal";
  includeClinicLogo: boolean;
  includeDoctorSignature: boolean;
  includeClinicInfo: boolean;
  includeNotes: boolean;
}

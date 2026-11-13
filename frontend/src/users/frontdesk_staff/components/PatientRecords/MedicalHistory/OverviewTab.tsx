import type { Patient } from "../../../../../interface/Patient";
import { Mail, Phone, MapPin, ArrowLeft } from "lucide-react";
import calculateAge from "../../../../../utils/calculateAge";

type Props = {
  selectedPatient: Patient | null;
};

const labelClass = "mb-1.5 block text-xs font-medium text-gray-500";

// Defined outside the component so it isn't recreated on every render
function Field({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  const text =
    value === null || value === undefined ? "" : String(value).trim();

  return (
    <div>
      <span className={labelClass}>{label}</span>
      <div
        className={`min-h-10 wrap-break-word whitespace-pre-line rounded-md bg-gray-50 px-3 py-2.5 text-sm font-medium ${
          text ? "text-gray-900" : "text-gray-400"
        }`}
      >
        {text || "Not provided"}
      </div>
    </div>
  );
}

function Card({
  title,
  children,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-md p-6 bg-white border border-gray-200 shadow-sm ${wide ? "lg:col-span-2" : ""}`}
    >
      <h2 className="mb-6 text-base font-semibold ">{title}</h2>
      {children}
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(`${value.substring(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function PatientOverview({ selectedPatient }: Props) {
  // Guard: nothing to show if no patient was selected
  if (!selectedPatient) return null;
  const p = selectedPatient;

  const fullName = [p.first_name, p.middle_name, p.last_name, p.suffix]
    .filter(Boolean)
    .join(" ");
  const initials = `${p.first_name?.charAt(0) ?? ""}${p.last_name?.charAt(0) ?? ""}`;
  const birthdate = p.birthdate?.substring(0, 10) ?? "";
  const age = birthdate ? String(Math.max(0, calculateAge(birthdate))) : "";

  const cityProvince = [p.city, p.province].filter(Boolean).join(", ");
  const addressLines = [p.street, p.barangay, cityProvince, p.zip_code].filter(
    Boolean,
  );

  return (
    <div className="w-full px-6">
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Personal */}
        <Card title="Personal Information" wide>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="First Name" value={p.first_name} />
            <Field label="Middle Name" value={p.middle_name} />
            <Field label="Last Name" value={p.last_name} />
            <Field label="Suffix" value={p.suffix} />
            <Field label="Sex" value={p.sex} />
            <Field label="Birthdate" value={formatDate(p.birthdate)} />
            <Field label="Age" value={age} />
          </div>
        </Card>

        {/* Contact */}
        <Card title="Contact Information">
          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-100">
                <Mail size={18} className="text-gray-600" />
              </div>
              <div className="min-w-0 flex-1">
                <Field label="Email" value={p.email} />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-100">
                <Phone size={18} className="text-gray-600" />
              </div>
              <div className="min-w-0 flex-1">
                <Field label="Mobile Number" value={p.contact_number} />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-100">
                <MapPin size={18} className="text-gray-600" />
              </div>
              <div className="min-w-0 flex-1">
                <Field label="Address" value={addressLines.join("\n")} />
              </div>
            </div>
          </div>
        </Card>

        {/* Record Info */}
        <Card title="Record Information">
          <div className="space-y-5">
            <Field label="Patient ID" value={p.patient_id} />
            <Field label="Civil Status" value={p.civil_status} />
            <Field label="Blood Type" value={p.blood_type} />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field
                label="Height"
                value={p.height_cm != null ? `${p.height_cm} cm` : ""}
              />
              <Field
                label="Weight"
                value={p.weight_kg != null ? `${p.weight_kg} kg` : ""}
              />
            </div>
          </div>
        </Card>

        {/* Guardian */}
        <Card title="Guardian Information (If Minor)" wide>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Full Name" value={p.guardian_name} />
            <Field label="Relationship" value={p.guardian_relationship} />
            <Field label="Contact Number" value={p.guardian_contact} />
          </div>
        </Card>

        {/* Medical */}
        <Card title="Medical Information" wide>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Allergies" value={p.allergies} />
            <Field
              label="Existing Medical Conditions"
              value={p.existing_conditions}
            />
            <Field label="Current Medications" value={p.current_medications} />
            <Field label="Previous Surgeries" value={p.previous_surgeries} />
            <Field
              label="Previous Hospitalizations"
              value={p.previous_hospitalizations}
            />
            <Field
              label="Family Medical History"
              value={p.family_medical_history}
            />
            <Field label="Smoking" value={p.smoking_status} />
            <Field label="Alcohol Consumption" value={p.alcohol_consumption} />
          </div>
        </Card>
      </div>
    </div>
  );
}

export default PatientOverview;

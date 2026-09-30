import { useSearchParams } from "react-router";
import type { Patient } from "../../../../interface/Patient";
import { Phone, Pencil, Trash2, History, Printer } from "lucide-react";

type Props = {
  patient: Patient;
  onEdit: (patient: Patient) => void;
  onDelete: (patientId: string) => void;
  onPrint: (patient: Patient) => void;
};

function calculateAge(birthdate: string): number {
  const birthDate = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() >= birthDate.getDate());

  if (!hasHadBirthdayThisYear) {
    age--;
  }

  return age;
}

function PatientCardSquare({ patient, onEdit, onDelete, onPrint }: Props) {
  const [, setSearchParams] = useSearchParams();

  const fullName = [
    patient.first_name,
    patient.middle_name,
    patient.last_name,
    patient.suffix,
  ]
    .filter(Boolean)
    .join(" ");

  const initials = `${patient.first_name?.charAt(0) || ""}${
    patient.last_name?.charAt(0) || ""
  }`;

  const age = calculateAge(patient.birthdate);

  const handleViewHistory = () => {
    setSearchParams({ page: "patient-medical-history", patient_id: patient.patient_id });
  };

  return (
    <div className="w-full max-w-sm rounded-3xl bg-white p-2 shadow-md">
      {/* Profile Image */}
      <div className="relative h-64 w-full overflow-hidden rounded-[1.4rem] bg-gray-100">
        {patient.image_url ? (
          <img
            src={patient.image_url}
            alt={fullName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-200 text-5xl font-semibold text-gray-500">
            {initials}
          </div>
        )}
      </div>

      {/* Information */}
      <div className="px-3 pb-3 pt-4">
        {/* Name */}
        <h2 className="text-lg font-semibold text-gray-900">{fullName}</h2>

        {/* Age / Sex */}
        <p className="mt-1 text-sm text-gray-500">
          {age} yrs old • {patient.sex}
          {patient.civil_status && ` • ${patient.civil_status}`}
        </p>

        {/* Patient ID / Email */}
        <p className="mt-2 line-clamp-1 text-sm leading-5 text-gray-500">
          {patient.patient_id}
        </p>
        <p className="mt-1 line-clamp-1 text-sm leading-5 text-gray-500">
          {patient.email}
        </p>

        {/* Contact */}
        <div className="mt-4 flex items-center gap-1 text-sm text-gray-500">
          <Phone className="w-4" />
          <span>{patient.contact_number}</span>
        </div>

        {/* Actions */}
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3">
          <button
            onClick={handleViewHistory}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            <History className="h-3.5 w-3.5" />
            History
          </button>
          <button
            onClick={() => onEdit(patient)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            onClick={() => onPrint(patient)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
        </div>

        <button
          onClick={() => onDelete(patient.patient_id)}
          className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
    </div>
  );
}

export default PatientCardSquare;
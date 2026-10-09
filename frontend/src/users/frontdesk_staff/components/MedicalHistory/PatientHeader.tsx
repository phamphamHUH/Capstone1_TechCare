import type { Patient } from "../../../../interface/Patient";
import calculateAge from "../../../../utils/calculateAge";

type PatientHeaderProps = {
  patient: Patient;
};

function PatientHeader({ patient }: PatientHeaderProps) {
  const fullName = [patient.first_name, patient.middle_name, patient.last_name]
    .filter(Boolean)
    .join(" ");

  const initials = `${patient.first_name.charAt(0)}${patient.last_name.charAt(0)}`;

  const dob = new Date(patient.birthdate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });

  const age = calculateAge(patient.birthdate);

  const isSeniorCitizen = true;
  // TODO: replace with a real patient field
  const isPWD = true;

  return (
    <div className="flex justify-between border mx-6 mt-5 px-5 py-3 border-gray-200 rounded-xl shadow-lg">
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 overflow-hidden rounded-full bg-gray-100">
          {patient.image_url ? (
            <img
              src={patient.image_url}
              alt={fullName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-200 text-xl font-semibold text-gray-500">
              {initials}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex gap-2 items-center">
            <h1 className="font-bold text-xl">{fullName}</h1>
            <span className="text-sm font-medium text-gray-500">
              {patient.patient_id}
            </span>
          </div>
          <div className="flex gap-2 text-xs">
            {isSeniorCitizen && (
              <span className="rounded-full text-xs bg-sky-100 px-3 py-0.5 text-sky-600">
                Senior Citizen
              </span>
            )}
            {isPWD && (
              <span className="rounded-full text-xs bg-orange-100 px-3 py-0.5 text-orange-600">
                PWD
              </span>
            )}
          </div>
          <div className="flex gap-2 text-sm">
            <span>{patient.sex}</span>
            <span className="text-gray-400">|</span>
            <span>{age} years old</span>
            <span className="text-gray-400">|</span>
            <span>{dob}</span>
            <span className="text-gray-400">|</span>
            <span>{patient.contact_number}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientHeader;

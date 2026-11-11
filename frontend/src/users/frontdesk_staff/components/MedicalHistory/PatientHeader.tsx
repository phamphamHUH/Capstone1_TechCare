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

  const isSeniorCitizen = false;
  // TODO: replace with a real patient field
  const isPWD = false;

  return (
    <div className="flex flex-wrap justify-between gap-3 border mx-4 sm:mx-6 mt-5 px-4 sm:px-5 py-3 border-gray-200 rounded-md shadow-lg">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <div className="relative h-14 w-14 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-full bg-gray-100">
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
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap gap-x-2 gap-y-1 items-center">
            <h1 className="font-bold text-lg sm:text-xl">{fullName}</h1>
            <span className="text-sm font-medium text-gray-500">
              {patient.patient_id}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
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

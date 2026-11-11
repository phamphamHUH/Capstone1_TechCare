import type { PatientSessionUser } from "../types.ts";

type Props = {
  patient: PatientSessionUser;
};

function getFullName(patient: PatientSessionUser) {
  return (
    [patient.first_name, patient.middle_name, patient.last_name, patient.suffix]
      .filter(Boolean)
      .join(" ") ||
    patient.username ||
    "Patient"
  );
}

function getInitials(patient: PatientSessionUser) {
  const first = patient.first_name?.trim()?.[0] ?? "P";
  const last = patient.last_name?.trim()?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
}

function getAge(birthdate?: string | null) {
  if (!birthdate) return null;

  const birth = new Date(birthdate);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const birthdayPassed =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() &&
      today.getDate() >= birth.getDate());

  if (!birthdayPassed) age -= 1;
  return age;
}

function PatientSummaryCard({ patient }: Props) {
  const fullName = getFullName(patient);
  const age = getAge(patient.birthdate);
  const patientId = patient.patient_id ?? patient.user_id ?? "—";

  return (
    <section className="rounded-md border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-5">
          {patient.image_url || patient.profile_photo ? (
            <img
              src={patient.image_url ?? patient.profile_photo ?? ""}
              alt={fullName}
              className="h-15 w-15 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-15 w-15 shrink-0 items-center justify-center rounded-full bg-sky-50 text-2xl font-semibold text-gray-500">
              {getInitials(patient)}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="break-words text-xl font-semibold text-gray-950">
                {fullName}
              </h2>
              <span className="text-xs text-gray-500">ID: {patientId}</span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
              {patient.sex && <span>{patient.sex}</span>}
              {age !== null && <span>{age} Years Old</span>}
              {patient.birthdate && (
                <span>
                  DOB:{" "}
                  {new Date(patient.birthdate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  })}
                </span>
              )}
              {patient.contact_number && <span>{patient.contact_number}</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {patient.blood_type && (
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600">
              Blood Type {patient.blood_type}
            </span>
          )}
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-600">
            Patient
          </span>
        </div>
      </div>
    </section>
  );
}

export default PatientSummaryCard;

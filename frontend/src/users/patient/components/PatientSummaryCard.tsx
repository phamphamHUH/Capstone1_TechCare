import type { PatientSessionUser } from "../types.ts";

type Props = {
  patient: PatientSessionUser;
};

function getFullName(patient: PatientSessionUser) {
  return [
    patient.first_name,
    patient.middle_name,
    patient.last_name,
    patient.suffix,
  ]
    .filter(Boolean)
    .join(" ") || patient.username || "Patient";
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
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());

  if (!birthdayPassed) age -= 1;
  return age;
}

function PatientSummaryCard({ patient }: Props) {
  const fullName = getFullName(patient);
  const age = getAge(patient.birthdate);
  const patientId = patient.patient_id ?? patient.user_id ?? "—";

  return (
    <section className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          {patient.image_url || patient.profile_photo ? (
            <img
              src={patient.image_url ?? patient.profile_photo ?? ""}
              alt={fullName}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sm font-bold text-sky-500">
              {getInitials(patient)}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-base font-bold text-slate-950">{fullName}</h1>
              <span className="text-[11px] text-slate-400">ID: {patientId}</span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              {patient.sex && <span>{patient.sex}</span>}
              {age !== null && <span>{age} Years Old</span>}
              {patient.birthdate && (
                <span>
                  DOB: {new Date(patient.birthdate).toLocaleDateString("en-US", {
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
            <span className="rounded-full bg-rose-50 px-3 py-1 text-[10px] font-semibold text-rose-500">
              Blood Type {patient.blood_type}
            </span>
          )}
          <span className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-semibold text-sky-500">
            Patient
          </span>
        </div>
      </div>
    </section>
  );
}

export default PatientSummaryCard;

import type { AccountUser } from "../../../../../interface/Account";

export type { AccountUser };

export type AccountField = { label: string; value: string };

const text = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value).trim() : "";

function date(value: unknown) {
  const raw = text(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime())
    ? raw
    : parsed.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

// "08:00:00" -> "8:00 AM"
function time(value: unknown) {
  const match = /^(\d{1,2}):(\d{2})/.exec(text(value));
  if (!match) return "";
  const h = Number(match[1]);
  const m = Number(match[2]);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

const titleCase = (value: unknown) =>
  text(value)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");

export const isPatient = (user: AccountUser) =>
  user.role === "patient" || (!!user.patient_id && !user.user_id);

export function fullName(user: AccountUser) {
  return [user.first_name, user.middle_name, user.last_name, user.suffix]
    .map(text)
    .filter(Boolean)
    .join(" ");
}

export const photoOf = (user: AccountUser) =>
  text(user.profile_photo) || text(user.image_url) || "";

/** Read-only details for the settings modal; empty values are left out. */
export function accountFields(user: AccountUser): AccountField[] {
  const fields: AccountField[] = isPatient(user)
    ? [
        { label: "Patient ID", value: text(user.patient_id) },
        { label: "Username", value: text(user.username) },
        { label: "Email", value: text(user.email) },
        { label: "Contact number", value: text(user.contact_number) },
        { label: "Sex", value: text(user.sex) },
        { label: "Birthdate", value: date(user.birthdate) },
        { label: "Civil status", value: text(user.civil_status) },
        { label: "Blood type", value: text(user.blood_type) },
        {
          label: "Address",
          value: [user.street, user.barangay, user.city, user.province, user.zip_code]
            .map(text)
            .filter(Boolean)
            .join(", "),
        },
      ]
    : [
        { label: "Employee ID", value: text(user.user_id) },
        { label: "Role", value: titleCase(user.role) },
        { label: "Department", value: text(user.department) },
        { label: "Username", value: text(user.username) },
        { label: "Email", value: text(user.email) },
        { label: "Contact number", value: text(user.contact_number) },
        { label: "Sex", value: text(user.sex) },
        { label: "Birthdate", value: date(user.birthdate) },
        { label: "Employment status", value: text(user.employment_status) },
        { label: "Date hired", value: date(user.date_hired) },
        {
          label: "Shift",
          value:
            time(user.shift_start) && time(user.shift_end)
              ? `${time(user.shift_start)} – ${time(user.shift_end)}`
              : "",
        },
        { label: "PRC license no.", value: text(user.prc_license_number) },
        { label: "Specialty", value: text(user.medical_specialty) },
        { label: "Address", value: text(user.address) },
      ];
  return fields.filter((field) => field.value);
}

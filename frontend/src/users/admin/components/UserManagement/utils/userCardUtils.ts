import type { User } from "../../../../../interface/User";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  doctor: "Doctor",
  "laboratory-staff": "Laboratory Staff",
  "frontdesk-staff": "Front Desk Staff",
  patient: "Patient",
};

export const roleLabel = (role: string) => ROLE_LABELS[role] ?? role;

// "09:00:00" -> "9:00 AM"
export function formatTime(time?: string | null) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export function getUserDisplay(user: User) {
  const fullName = [user.first_name, user.middle_name, user.last_name, user.suffix]
    .filter(Boolean)
    .join(" ");
  const initials = `${user.first_name?.charAt(0) || ""}${user.last_name?.charAt(0) || ""}`;
  const shift =
    user.shift_start && user.shift_end
      ? `${formatTime(user.shift_start)} - ${formatTime(user.shift_end)}`
      : "—";
  return { fullName, initials, shift };
}

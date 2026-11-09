export const formatAge = (birthdate: string | null, age: number | null) => {
  if (!birthdate) return age === null ? "N/A" : `${age} years old`;

  const birth = new Date(birthdate);
  const now = new Date();

  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;

  if (months < 0) return "N/A";

  if (months < 1) {
    const days = Math.floor((now.getTime() - birth.getTime()) / 86_400_000);
    return `${days} ${days === 1 ? "day" : "days"} old`;
  }
  if (months < 12) return `${months} ${months === 1 ? "month" : "months"} old`;

  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? "year" : "years"} old`;
};

export function formatPatientAddress(patient: {
  street?: string;
  barangay?: string;
  city?: string;
  province?: string;
  zip_code?: string;
  address?: string;
}) {
  return (
    [
      patient.street,
      patient.barangay,
      patient.city,
      patient.province,
      patient.zip_code,
    ]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(", ") ||
    patient.address ||
    "Not recorded"
  );
}

export const peso = (v: number | string | null | undefined) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    Number(v ?? 0),
  );

export const formatDateTime = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    date: date.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("en-PH", {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
};

// Front desk vital signs for consultation requests. Same ranges as the
// backend (backend/src/controllers/fdstaff/utils/vitalSigns.ts).

export type FrontDeskVitals = {
  temperature: string; // °C
  height: string; // cm
  weight: string; // kg
};

export const VITAL_RULES = {
  temperature: { label: "Temperature", unit: "°C", min: 30, max: 45, placeholder: "36.8" },
  height: { label: "Height", unit: "cm", min: 30, max: 250, placeholder: "165" },
  weight: { label: "Weight", unit: "kg", min: 1, max: 350, placeholder: "60" },
} as const;

// Height and weight start from the patient's record; temperature is always new.
export const initialVitals = (patient?: {
  height_cm?: number | string | null;
  weight_kg?: number | string | null;
} | null): FrontDeskVitals => ({
  temperature: "",
  height: patient?.height_cm != null ? String(Number(patient.height_cm)) : "",
  weight: patient?.weight_kg != null ? String(Number(patient.weight_kg)) : "",
});

// First problem found, or null when all three are filled and in range.
export function vitalsError(vitals: FrontDeskVitals): string | null {
  for (const key of Object.keys(VITAL_RULES) as (keyof FrontDeskVitals)[]) {
    const rule = VITAL_RULES[key];
    const text = vitals[key].trim();
    const number = Number(text);
    if (!text || !Number.isFinite(number)) return `${rule.label} is required.`;
    if (number < rule.min || number > rule.max) {
      return `${rule.label} must be between ${rule.min} and ${rule.max} ${rule.unit}.`;
    }
  }
  return null;
}

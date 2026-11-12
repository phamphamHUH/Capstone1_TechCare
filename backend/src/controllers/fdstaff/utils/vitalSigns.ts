// =========================
// FRONT DESK VITAL SIGNS
// =========================
// Taken at the front desk before a consultation request is submitted and saved
// on consultation_records.vital_signs. Stored as text, the same way the
// doctor's form stores BP, HR, etc., so both live in one JSON object:
//   { temperature: "36.8", height: "165", weight: "60.5", ... }

export type FrontDeskVitals = {
  temperature: string; // °C
  height: string; // cm
  weight: string; // kg
};

const RULES = {
  temperature: { label: "Temperature", unit: "°C", min: 30, max: 45 },
  height: { label: "Height", unit: "cm", min: 30, max: 250 },
  weight: { label: "Weight", unit: "kg", min: 1, max: 350 },
} as const;

type Result =
  | { ok: true; value: FrontDeskVitals; numbers: Record<keyof FrontDeskVitals, number> }
  | { ok: false; message: string };

export function readFrontDeskVitals(input: unknown): Result {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, message: "Temperature, height and weight are required." };
  }
  const raw = input as Record<string, unknown>;
  const value = {} as FrontDeskVitals;
  const numbers = {} as Record<keyof FrontDeskVitals, number>;

  for (const key of Object.keys(RULES) as (keyof FrontDeskVitals)[]) {
    const rule = RULES[key];
    const text = String(raw[key] ?? "").trim();
    const number = Number(text);
    if (!text || !Number.isFinite(number)) {
      return { ok: false, message: `${rule.label} is required.` };
    }
    if (number < rule.min || number > rule.max) {
      return {
        ok: false,
        message: `${rule.label} must be between ${rule.min} and ${rule.max} ${rule.unit}.`,
      };
    }
    // One decimal place is enough for all three.
    const rounded = Math.round(number * 10) / 10;
    value[key] = String(rounded);
    numbers[key] = rounded;
  }
  return { ok: true, value, numbers };
}

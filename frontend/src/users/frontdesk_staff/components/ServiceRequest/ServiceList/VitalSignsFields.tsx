import { Thermometer } from "lucide-react";
import type { FrontDeskVitals } from "../utils/vitalSigns";
import { VITAL_RULES } from "../utils/vitalSigns";

type VitalSignsFieldsProps = {
  value: FrontDeskVitals;
  onChange: (value: FrontDeskVitals) => void;
  disabled?: boolean;
  error?: string | null;
};

// Temperature, height and weight, taken before a consultation request is
// submitted. The doctor sees them in Active Consultation.
function VitalSignsFields({ value, onChange, disabled, error }: VitalSignsFieldsProps) {
  return (
    <fieldset className="mt-4 rounded-md border border-gray-200 p-3" disabled={disabled}>
      <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold text-gray-800">
        <Thermometer size={16} className="text-sky-600" />
        Vital signs <span className="text-red-500">*</span>
      </legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(Object.keys(VITAL_RULES) as (keyof FrontDeskVitals)[]).map((key) => {
          const rule = VITAL_RULES[key];
          return (
            <label key={key} className="flex flex-col gap-1 text-xs text-gray-600">
              <span>
                {rule.label} ({rule.unit})
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min={rule.min}
                max={rule.max}
                placeholder={rule.placeholder}
                value={value[key]}
                onChange={(event) => onChange({ ...value, [key]: event.target.value })}
                className="h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-800 outline-none focus:border-sky-400"
              />
            </label>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </fieldset>
  );
}

export default VitalSignsFields;

import { Monitor, Moon, Sun } from "lucide-react";
import type { Theme } from "../../../../lib/theme";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

type ThemePickerProps = {
  value: Theme;
  onChange: (theme: Theme) => void;
  disabled?: boolean;
};

function ThemePicker({ value, onChange, disabled }: ThemePickerProps) {
  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2">
      {OPTIONS.map(({ value: option, label, icon: Icon }) => {
        const selected = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option)}
            className={`flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border text-xs font-medium transition-colors disabled:cursor-wait ${
              selected
                ? "border-sky-500 bg-sky-50 text-sky-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Icon size={18} strokeWidth={1.7} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default ThemePicker;

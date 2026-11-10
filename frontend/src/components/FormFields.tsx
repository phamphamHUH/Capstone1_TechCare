import type { ReactNode } from "react";

export type Option = string | { value: string; label: string };

export const fieldClass =
  "h-8 rounded-lg border border-gray-200 px-2 text-sm text-gray-800 placeholder:text-gray-300 focus:border-sky-400 focus:outline-none read-only:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400";

export function Field({
  label,
  value,
  onChange,
  width = "w-40",
  type = "text",
  readOnly = false,
  placeholder,
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  width?: string;
  type?: string;
  readOnly?: boolean;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-500">
      <span className="whitespace-nowrap">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        className={`${width} ${fieldClass}`}
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  width = "w-36",
  required = false,
  placeholder = "",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  width?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-500">
      <span className="whitespace-nowrap">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`${width} ${fieldClass}`}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => {
          const opt = typeof o === "string" ? { value: o, label: o } : o;
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        {children}
      </div>
    </section>
  );
}
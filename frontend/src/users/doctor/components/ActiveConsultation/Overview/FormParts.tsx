import type { ReactNode } from "react";
import type { NoteField } from "../../../../../interface/Overview";

const fieldClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-xs text-gray-800 outline-none";
const textareaClass =
  "w-full resize-none rounded-lg border border-gray-200 p-3 text-xs text-gray-700 outline-none placeholder:text-gray-400 focus:border-sky-400";
const tileClass = "rounded-lg border border-gray-200 px-2.5 py-2.5 space-y-1";

export function Section({
  title,
  action,
  gap = "space-y-3",
  children,
}: {
  title: string;
  action?: ReactNode;
  gap?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-md border border-gray-200 bg-white p-5 ${gap}`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function NoteSection({
  field,
  value,
  onChange,
  error,
}: {
  field: NoteField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <Section title={field.label}>
      <textarea
        rows={field.rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={`${textareaClass} ${error ? "ring-1 ring-red-400" : ""}`}
      />
      {error && (
        <p data-field-error className="text-[10px] text-red-500">
          {error}
        </p>
      )}
    </Section>
  );
}

export function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-gray-400">{label}</label>
      <input type="text" readOnly value={value} className={fieldClass} />
    </div>
  );
}

export function Tile({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`${tileClass} ${className}`}>
      <p className="text-[10px] text-gray-400">{label}</p>
      <span className="text-xs font-bold">{children}</span>
    </div>
  );
}

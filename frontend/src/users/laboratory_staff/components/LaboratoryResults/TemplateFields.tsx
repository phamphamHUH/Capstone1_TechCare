import FieldError from "../../../../components/FieldError";
import type { BuilderComponent } from "../../../../interface/FormTemplate";
import type { ResultValues } from "../../../../interface/LaboratoryAnalysis";
import { Plus, X } from "lucide-react";
import { inputTypes, resultFlag } from "./laboratoryValidation";
import { AnalysisButton } from "./AnalysisUi";

type TemplateFieldsProps = {
  components: BuilderComponent[];
  values: ResultValues;
  errors: Record<string, string>;
  onChange: (key: string, value: unknown) => void;
  onBlur: (key: string) => void;
  disabled?: boolean;
};

const limit = (value: string | number | undefined) =>
  value === "" || value === undefined ? undefined : Number(value);
const inputClass =
  "h-9 w-full min-w-0 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-50 aria-invalid:border-rose-400 aria-invalid:bg-rose-50 disabled:opacity-50";

type FieldInputProps = {
  component: BuilderComponent;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
  onBlur: () => void;
  disabled?: boolean;
};

function FieldInput({
  component,
  value,
  error,
  onChange,
  onBlur,
  disabled,
}: FieldInputProps) {
  const { fieldKey: key, settings, validation: rules } = component;

  const id = `result-${key}`;
  const type =
    component.type === "date_field"
      ? "date"
      : component.type === "number_field" || rules.inputType === "Number"
        ? "number"
        : rules.inputType === "Email"
          ? "email"
          : rules.inputType === "Date"
            ? "date"
            : "text";

  return (
    <input
      id={id}
      name={key}
      className={inputClass}
      type={type}
      value={
        typeof value === "string" || typeof value === "number" ? value : ""
      }
      required={Boolean(settings.required || rules.required)}
      min={type === "date" ? rules.earliestDate : limit(rules.minValue)}
      max={type === "date" ? rules.latestDate : limit(rules.maxValue)}
      step={
        type === "number" && limit(rules.decimalPlaces) !== undefined
          ? 10 ** -Number(rules.decimalPlaces)
          : "any"
      }
      minLength={limit(rules.minLength)}
      maxLength={limit(rules.maxLength)}
      placeholder={settings.placeholder || "Enter result"}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      onBlur={onBlur}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    />
  );
}

type TableFieldProps = {
  component: BuilderComponent;
  value: unknown;
  errors: Record<string, string>;
  onChange: (value: unknown) => void;
  onBlur: () => void;
  disabled?: boolean;
};

function TableField({
  component,
  value,
  errors,
  onChange,
  onBlur,
  disabled,
}: TableFieldProps) {
  const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  const columns = component.settings.tableColumns ?? [];
  const key = component.fieldKey;
  const maximum = limit(component.validation.tableRules?.maxRows);

  return (
    <div>
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[300px] border-collapse text-left text-xs">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  className="bg-gray-50 p-2 font-medium text-gray-500"
                  scope="col"
                  key={column.id}
                >
                  {column.header}
                </th>
              ))}
              <th className="bg-gray-50 p-2" scope="col">
                <span className="sr-only">Remove row</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {columns.map((column) => {
                  const path = `${key}.${index}.${column.id}`;

                  return (
                    <td
                      className="border-b border-gray-200 p-1.5"
                      key={column.id}
                    >
                      <input
                        className={inputClass}
                        type={column.type}
                        step={column.type === "number" ? "any" : undefined}
                        aria-label={`${component.label}, row ${index + 1}, ${column.header}`}
                        value={String(row[column.id] ?? "")}
                        aria-invalid={Boolean(errors[path])}
                        aria-describedby={
                          errors[path] ? `${path}-error` : undefined
                        }
                        onBlur={onBlur}
                        disabled={disabled}
                        onChange={(event) =>
                          onChange(
                            rows.map((current, rowIndex) =>
                              rowIndex === index
                                ? {
                                    ...current,
                                    [column.id]: event.target.value,
                                  }
                                : current,
                            ),
                          )
                        }
                      />
                      {errors[path] && (
                        <FieldError id={`${path}-error`}>
                          {errors[path]}
                        </FieldError>
                      )}
                    </td>
                  );
                })}
                <td className="border-b border-gray-200 p-1.5">
                  <AnalysisButton
                    variant="link"
                    compact
                    disabled={disabled}
                    aria-label={`Remove row ${index + 1} from ${component.label}`}
                    onClick={() =>
                      onChange(rows.filter((_, rowIndex) => index !== rowIndex))
                    }
                  >
                    <X size={14} />
                  </AnalysisButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AnalysisButton
        variant="link"
        compact
        className="mt-1"
        disabled={disabled || (maximum !== undefined && rows.length >= maximum)}
        onClick={() => onChange([...rows, {}])}
      >
        <Plus size={13} />
        Add row
      </AnalysisButton>
    </div>
  );
}

export default function TemplateFields({
  components,
  values,
  errors,
  onChange,
  onBlur,
  disabled,
}: TemplateFieldsProps) {
  const groups: {
    title: string;
    key: string;
    components: BuilderComponent[];
  }[] = [];

  for (const component of [...components].sort((a, b) => a.order - b.order)) {
    if (component.type === "section_header") {
      groups.push({
        title: component.settings.sectionHeader || component.label,
        key: component.id,
        components: [],
      });
    } else {
      if (!groups.length) {
        groups.push({
          title: "Results",
          key: "results",
          components: [],
        });
      }

      groups[groups.length - 1].components.push(component);
    }
  }

  return (
    <>
      {groups.map((group) => (
        <section key={group.key} className="mb-5" aria-label={group.title}>
          <h3 className="mb-3 text-base font-semibold">{group.title}</h3>
          <div
            className="hidden grid-cols-[1.15fr_1.6fr_1.1fr_.42fr] gap-3 rounded-md bg-gray-50 px-2 py-2 text-xs font-medium text-gray-600 sm:grid"
            aria-hidden="true"
          >
            <span>Parameter</span>
            <span>Result</span>
            <span>Reference Range</span>
            <span>Unit</span>
          </div>
          {group.components.map((component) => {
            const { fieldKey: key, settings, validation: rules } = component;

            const alignment =
              settings.alignment === "center"
                ? "text-center"
                : settings.alignment === "right"
                  ? "text-right"
                  : "text-left";

            if (component.type === "static_text") {
              return (
                <p
                  className={`p-2 text-sm leading-relaxed whitespace-pre-wrap text-gray-500 ${alignment}`}
                  key={component.id}
                >
                  {settings.staticText || component.label}
                </p>
              );
            }

            if (component.type === "line_divider") {
              return (
                <hr
                  className={`my-3 border-gray-300 ${settings.dividerStyle === "dashed" ? "border-dashed" : settings.dividerStyle === "dotted" ? "border-dotted" : "border-solid"}`}
                  key={component.id}
                />
              );
            }

            if (component.type === "image") {
              return settings.imageUrl ? (
                <img
                  className="max-h-40 max-w-full object-contain p-2"
                  key={component.id}
                  src={settings.imageUrl}
                  alt={settings.imageAlt || component.label}
                />
              ) : null;
            }

            if (!inputTypes.has(component.type)) {
              return (
                <FieldError key={component.id}>
                  {"Unsupported template field: "}
                  {component.label}
                </FieldError>
              );
            }

            const flag = resultFlag(component, values[key]);
            const reference =
              settings.referenceRange ||
              (rules.refLow !== undefined && rules.refHigh !== undefined
                ? `${rules.refLow} - ${rules.refHigh}`
                : "—");
            const error = errors[key];

            if (component.type === "checkbox" || component.type === "table") {
              return (
                <div
                  className="border-b border-gray-200 px-2 py-3"
                  key={component.id}
                >
                  <fieldset
                    className="m-0 min-w-0 border-0 p-0"
                    disabled={disabled}
                    onBlur={() => onBlur(key)}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `result-${key}-error` : undefined}
                  >
                    <legend className="mb-2 text-sm">
                      {component.label}
                      {(settings.required || rules.required) && (
                        <span className="text-gray-500">{" *"}</span>
                      )}
                    </legend>
                    {component.type === "table" ? (
                      <TableField
                        component={component}
                        value={values[key]}
                        errors={errors}
                        onChange={(value) => onChange(key, value)}
                        onBlur={() => onBlur(key)}
                        disabled={disabled}
                      />
                    ) : settings.checkboxOptions?.length ? (
                      <div className="flex flex-wrap gap-3 text-sm">
                        {settings.checkboxOptions.map((option) => {
                          const selected = Array.isArray(values[key])
                            ? (values[key] as string[])
                            : [];

                          return (
                            <label
                              className="flex items-center gap-1.5"
                              key={option}
                            >
                              <input
                                className="accent-sky-500"
                                type="checkbox"
                                checked={selected.includes(option)}
                                onChange={(event) =>
                                  onChange(
                                    key,
                                    event.target.checked
                                      ? [...selected, option]
                                      : selected.filter(
                                          (item) => item !== option,
                                        ),
                                  )
                                }
                              />
                              {option}
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <label className="flex items-center gap-1.5 text-sm">
                        <input
                          className="accent-sky-500"
                          type="checkbox"
                          checked={values[key] === true}
                          onChange={(event) =>
                            onChange(key, event.target.checked)
                          }
                        />
                        {settings.placeholder || "Yes"}
                      </label>
                    )}
                  </fieldset>
                  {error && (
                    <FieldError id={`result-${key}-error`}>{error}</FieldError>
                  )}
                </div>
              );
            }

            return (
              <div
                className="grid grid-cols-1 items-center gap-x-3 gap-y-2 border-b border-gray-200 px-2 py-3 text-sm sm:grid-cols-[1.15fr_1.6fr_1.1fr_.42fr]"
                key={component.id}
              >
                <label htmlFor={`result-${key}`}>
                  {component.label}
                  {(settings.required || rules.required) && (
                    <span className="text-xs text-gray-500">{" *"}</span>
                  )}
                </label>
                <div className="relative min-w-0">
                  <FieldInput
                    component={component}
                    value={values[key]}
                    error={error}
                    onChange={(value) => onChange(key, value)}
                    onBlur={() => onBlur(key)}
                    disabled={disabled}
                  />
                  {error && (
                    <FieldError id={`result-${key}-error`}>{error}</FieldError>
                  )}
                  {flag && !error && (
                    <span
                      className={`mt-1 inline-block rounded-sm px-1 text-xs ${flag === (rules.flagLabels?.normal || "Normal") ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}
                    >
                      {flag}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  <span className="sm:hidden">{"Reference: "}</span>
                  {reference}
                </span>
                <span className="text-xs text-gray-500">
                  {settings.unit || "—"}
                </span>
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}

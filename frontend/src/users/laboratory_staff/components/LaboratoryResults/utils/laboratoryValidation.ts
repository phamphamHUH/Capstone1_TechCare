import type {
  ComponentSettings,
  ValidationRules,
} from "../../../../../interface/FormTemplate";

export interface ValidationComponent {
  type: string;
  fieldKey: string;
  label: string;
  settings?: ComponentSettings;
  validation?: ValidationRules;
}

export type ValidationErrors = Record<string, string>;
export const inputTypes: ReadonlySet<string> = new Set([
  "text_field",
  "number_field",
  "date_field",
  "checkbox",
  "table",
]);

export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

const limit = (
  value: number | string | null | undefined,
): number | undefined =>
  value === "" || value == null ? undefined : Number(value);
const empty = (value: unknown): boolean =>
  value == null || (typeof value === "string" && !value.trim());
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

function scalarError(
  value: unknown,
  kind: string,
  rules: ValidationRules,
): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return "Enter a valid value.";
  }

  const text = String(value).trim();

  if (kind === "number") {
    if (
      !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) ||
      !Number.isFinite(Number(text))
    ) {
      return "Enter a finite number.";
    }

    const number = Number(text);
    const minimum = limit(rules.minValue);
    const maximum = limit(rules.maxValue);
    const precision = limit(rules.decimalPlaces);

    if (minimum !== undefined && number < minimum) {
      return `Minimum value is ${rules.minValue}.`;
    }

    if (maximum !== undefined && number > maximum) {
      return `Maximum value is ${rules.maxValue}.`;
    }

    if (
      precision !== undefined &&
      (text.split(".")[1]?.length ?? 0) > precision
    ) {
      return `Use at most ${rules.decimalPlaces} decimal places.`;
    }
  }

  if (kind === "date") {
    if (!validDate(text)) {
      return "Enter a valid date.";
    }

    if (rules.earliestDate && text < rules.earliestDate) {
      return `Earliest date is ${rules.earliestDate}.`;
    }

    if (rules.latestDate && text > rules.latestDate) {
      return `Latest date is ${rules.latestDate}.`;
    }
  }

  if (kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
    return "Enter a valid email address.";
  }

  const minLength = limit(rules.minLength);
  const maxLength = limit(rules.maxLength);

  if (minLength !== undefined && text.length < minLength) {
    return `Enter at least ${rules.minLength} characters.`;
  }

  if (maxLength !== undefined && text.length > maxLength) {
    return `Enter at most ${rules.maxLength} characters.`;
  }

  if (rules.allowedPattern) {
    try {
      if (!new RegExp(`^(?:${rules.allowedPattern})$`, "u").test(text)) {
        return "Value does not match the required format.";
      }
    } catch {
      return "This template has an invalid validation pattern. Contact an administrator.";
    }
  }

  return null;
}

export function validateResults(
  components: readonly ValidationComponent[],
  values: unknown,
): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!isRecord(values)) {
    return {
      _form: "Results must be an object.",
    };
  }

  const fields = components.filter((component) =>
    inputTypes.has(component.type),
  );
  const keys = new Set(fields.map((component) => component.fieldKey));

  if (
    keys.size !== fields.length ||
    fields.some(
      (field) =>
        !field.fieldKey ||
        ["__proto__", "constructor", "prototype"].includes(field.fieldKey),
    )
  ) {
    return {
      _form:
        "The template contains invalid or duplicate field keys. Contact an administrator.",
    };
  }

  if (!fields.length) {
    errors._form = "This template has no result fields.";
  }

  if (Object.keys(values).some((key) => !keys.has(key))) {
    errors._form = "Results contain fields that are not in this template.";
  }

  for (const component of fields) {
    const { fieldKey: key, type } = component;

    const settings = component.settings ?? {};
    const rules = component.validation ?? {};
    const value = Object.hasOwn(values, key) ? values[key] : undefined;
    const required = Boolean(settings.required || rules.required);

    const fail = (message: string, path: string = key): void => {
      errors[path] = rules.customMessage || message;
    };

    if (type === "checkbox") {
      const options = settings.checkboxOptions ?? [];
      const selected = options.length
        ? (value ?? [])
        : value == null
          ? []
          : value === true
            ? [true]
            : value === false
              ? []
              : null;

      if (!Array.isArray(selected)) {
        fail("Select valid options.");
        continue;
      }

      const selections: unknown[] = selected;

      if (
        options.length &&
        (new Set(selections).size !== selections.length ||
          selections.some(
            (item) => typeof item !== "string" || !options.includes(item),
          ))
      ) {
        fail("Select valid options.");
        continue;
      }

      const minSelections = limit(rules.minSelections);
      const maxSelections = limit(rules.maxSelections);

      if (required && !selections.length) {
        fail("Select at least one option.");
      }

      if (minSelections !== undefined && selections.length < minSelections) {
        fail(`Select at least ${rules.minSelections} options.`);
      }

      if (maxSelections !== undefined && selections.length > maxSelections) {
        fail(`Select at most ${rules.maxSelections} options.`);
      }
    } else if (type === "table") {
      const rawRows = value ?? [];

      if (!Array.isArray(rawRows)) {
        fail("Enter valid table rows.");
        continue;
      }

      const rows: unknown[] = rawRows;
      const tableRules = rules.tableRules ?? {};
      const minimum = Math.max(
        required ? 1 : 0,
        limit(tableRules.minRows) ?? 0,
      );

      if (rows.length < minimum) {
        fail(`Enter at least ${minimum} rows.`);
      }

      const maximum = limit(tableRules.maxRows);

      if (maximum !== undefined && rows.length > maximum) {
        fail(`Enter at most ${tableRules.maxRows} rows.`);
      }

      const columns = settings.tableColumns ?? [];

      if (!columns.length) {
        fail("This table has no configured columns.");
      }

      rows.forEach((row, index) => {
        if (!isRecord(row)) {
          fail("Enter valid table rows.");
          return;
        }

        if (
          Object.keys(row).some(
            (column) => !columns.some((c) => c.id === column),
          )
        ) {
          fail("Table contains unknown columns.");
        }

        for (const column of columns) {
          const cell = Object.hasOwn(row, column.id)
            ? row[column.id]
            : undefined;
          const path = `${key}.${index}.${column.id}`;
          const cellRequired = (tableRules.requiredColumns ?? []).some(
            (name) => name === column.id || name === column.header,
          );

          if (empty(cell)) {
            if (cellRequired) {
              fail(`${column.header} is required.`, path);
            }

            continue;
          }

          const error = scalarError(cell, column.type, {});

          if (error) {
            fail(error, path);
          }
        }
      });
    } else {
      if (empty(value)) {
        if (required) {
          fail("This field is required.");
        }

        continue;
      }

      const kind =
        type === "number_field"
          ? "number"
          : type === "date_field"
            ? "date"
            : String(rules.inputType ?? "text").toLowerCase();
      const error = scalarError(value, kind, rules);

      if (error) {
        fail(error);
      }
    }
  }

  return errors;
}

export function resultFlag(
  component: ValidationComponent,
  value: unknown,
): string {
  const rules = component.validation ?? {};

  if (
    empty(value) ||
    (typeof value !== "number" && typeof value !== "string") ||
    !Number.isFinite(Number(value)) ||
    (component.type !== "number_field" && rules.inputType !== "Number")
  ) {
    return "";
  }

  const low = limit(rules.refLow);
  const high = limit(rules.refHigh);

  if (low === undefined && high === undefined) {
    return "";
  }

  if (low !== undefined && Number(value) < low) {
    return rules.flagLabels?.low || "Low";
  }

  if (high !== undefined && Number(value) > high) {
    return rules.flagLabels?.high || "High";
  }

  return rules.flagLabels?.normal || "Normal";
}

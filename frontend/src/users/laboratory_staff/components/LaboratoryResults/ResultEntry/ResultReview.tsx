import type { BuilderComponent } from "../../../../../interface/FormTemplate";
import type { ResultValues } from "../../../../../interface/LaboratoryAnalysis";
import { reportText } from "../utils/laboratoryPrint";
import { inputTypes, resultFlag } from "../utils/laboratoryValidation";

type ResultReviewProps = {
  components: BuilderComponent[];
  values: ResultValues;
  remarks: string;
};

function displayValue(component: BuilderComponent, value: unknown) {
  if (component.type === "table") {
    const rows = Array.isArray(value) ? value.length : 0;
    return rows ? `${rows} row${rows === 1 ? "" : "s"}` : "—";
  }

  const text = reportText(value);
  return text !== "—" && component.settings.unit
    ? `${text} ${component.settings.unit}`
    : text;
}

/** Read-only list of the entered values, shown before the result is saved. */
export default function ResultReview({
  components,
  values,
  remarks,
}: ResultReviewProps) {
  const fields = components.filter((component) =>
    inputTypes.has(component.type),
  );
  const notes = remarks.trim();

  return (
    <div className="max-h-[50vh] overflow-y-auto rounded-md border border-gray-200">
      <dl className="divide-y divide-gray-100 text-sm">
        {fields.map((component) => {
          const value = values[component.fieldKey];
          const flag = resultFlag(component, value);
          const normal = component.validation.flagLabels?.normal || "Normal";

          return (
            <div
              key={component.id}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3 px-3 py-2"
            >
              <dt className="text-gray-500">{component.label}</dt>
              <dd className="font-medium wrap-anywhere whitespace-pre-wrap text-gray-900">
                {displayValue(component, value)}
                {flag && (
                  <span
                    className={`ml-2 rounded-sm px-1 text-xs font-normal ${flag === normal ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}
                  >
                    {flag}
                  </span>
                )}
              </dd>
            </div>
          );
        })}
        {notes && (
          <div className="px-3 py-2">
            <dt className="text-gray-500">Notes / Observations</dt>
            <dd className="mt-1 wrap-anywhere whitespace-pre-wrap text-gray-900">
              {notes}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

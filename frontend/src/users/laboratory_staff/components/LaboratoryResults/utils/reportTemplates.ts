import {
  dbComponentToBuilderComponent,
  type BuilderComponent,
  type FormTemplate,
} from "../../../../../interface/FormTemplate";
import type {
  AnalysisRequest,
  ReportTemplate,
} from "../../../../../interface/LaboratoryAnalysis";
import type { Service } from "../../../../../interface/Service";
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

export const isReportParameter = (field: BuilderComponent) =>
  ["text_field", "number_field", "date_field", "checkbox"].includes(field.type);

// Use one label layout for the printed report and the patient's result table.
// Return copies when labels change; saved snapshots and field keys stay intact.
export function reportComponents(
  template: Pick<ReportTemplate, "components" | "form_name">,
): BuilderComponent[] {
  const components = [...template.components]
    .filter((component) => component.settings.showInPreview !== false)
    .sort((a, b) => a.order - b.order);
  const defaultLabels: Record<string, string> = {
    text_field: "text field",
    number_field: "number field",
    date_field: "date field",
    checkbox: "checkbox",
  };
  const inputs = components.filter(
    (component) => isReportParameter(component) || component.type === "table",
  );
  const onlyInput = inputs.length === 1 ? inputs[0] : undefined;
  const rowLabels = new Map<string, string>();
  const usedStaticText = new Set<string>();

  components.forEach((component, index) => {
    const next = components[index + 1];
    if (component.type !== "static_text" || !next || !isReportParameter(next)) return;
    const text = (component.settings.staticText || component.label).trim();
    if (!text) return;
    rowLabels.set(next.id, text);
    usedStaticText.add(component.id);
  });

  if (
    onlyInput && !rowLabels.has(onlyInput.id) && template.form_name.trim() &&
    normalize(onlyInput.label) === defaultLabels[onlyInput.type]
  ) {
    rowLabels.set(onlyInput.id, template.form_name.trim());
  }

  if (!rowLabels.size) return components;
  return components.flatMap((component) => {
    if (usedStaticText.has(component.id)) return [];
    const label = rowLabels.get(component.id);
    if (label) return [{ ...component, label }];
    if (
      component.type === "section_header" &&
      ["section", "section header"].includes(
        normalize(component.settings.sectionHeader || component.label),
      )
    ) return [];
    return [component];
  });
}

function labels(value: string) {
  return [
    value,
    ...value.split(/[,;/]/),
    ...Array.from(value.matchAll(/\(([^)]+)\)/g), (match) => match[1]),
    value.replace(/\([^)]*\)/g, ""),
  ]
    .map(normalize)
    .filter(Boolean);
}

export function matchingTest(
  request: AnalysisRequest,
  template: ReportTemplate,
) {
  return request.tests.find((test) =>
    test.serviceId
      ? test.serviceId === template.service_id
      : labels(test.name).some((name) =>
          template.testNames.some((serviceName) =>
            labels(serviceName).includes(name),
          ),
        ),
  );
}

export function toReportTemplate(
  value: unknown,
  services: Pick<Service, "service_id" | "service_name" | "service_category">[],
  componentRows?: unknown[],
): ReportTemplate {
  const row = record(value);

  if (
    typeof row.form_id !== "string" ||
    typeof row.form_name !== "string" ||
    typeof row.service_id !== "string" ||
    row.status !== "Published"
  ) {
    throw new Error(
      "The template response does not contain a published admin template.",
    );
  }

  const service = services.find((item) => item.service_id === row.service_id);
  const rawComponents =
    componentRows ?? (Array.isArray(row.components) ? row.components : []);

  const components: BuilderComponent[] = rawComponents.map((value) => {
    const component = record(value);

    if (
      typeof component.id === "string" &&
      typeof component.type === "string" &&
      typeof component.fieldKey === "string" &&
      typeof component.label === "string"
    ) {
      return {
        ...component,
        settings: component.settings ?? {},
        validation: component.validation ?? {},
      } as unknown as BuilderComponent;
    }

    if (
      typeof component.form_component_id !== "string" ||
      typeof component.type_id !== "string" ||
      typeof component.field_key !== "string" ||
      typeof component.label !== "string"
    ) {
      throw new Error(
        "The selected admin template contains an invalid component.",
      );
    }

    return dbComponentToBuilderComponent(component);
  });

  return {
    ...(row as unknown as FormTemplate),
    components: components.sort((a, b) => a.order - b.order),
    category:
      (typeof row.category === "string" ? row.category.trim() : "") ||
      service?.service_category || service?.service_name || "Laboratory",
    testNames: service ? [service.service_name] : [],
    version: typeof row.version === "number" ? row.version : undefined,
  };
}

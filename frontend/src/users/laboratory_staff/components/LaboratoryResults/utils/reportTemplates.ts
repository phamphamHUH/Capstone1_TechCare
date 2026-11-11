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
      service?.service_category || service?.service_name || "Laboratory",
    testNames: service ? [service.service_name] : [],
    version: typeof row.version === "number" ? row.version : undefined,
  };
}

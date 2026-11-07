import type { CSSProperties } from "react";
import type { BuilderComponent } from "../../../../interface/FormTemplate";
import type { LaboratoryReportData } from "../../../../interface/LaboratoryAnalysis";
import { formatLabDate } from "./AnalysisList";
import { resultFlag } from "./laboratoryValidation";
import { reportText, safeReportImage } from "./laboratoryPrint";

function referenceRange(component: BuilderComponent) {
  if (component.settings.referenceRange) {
    return component.settings.referenceRange;
  }

  const { refLow, refHigh } = component.validation;

  const hasLow = refLow != null && refLow !== "";
  const hasHigh = refHigh != null && refHigh !== "";
  return hasLow && hasHigh
    ? `${refLow} – ${refHigh}`
    : hasLow
      ? `≥ ${refLow}`
      : hasHigh
        ? `≤ ${refHigh}`
        : "—";
}

function fieldStyle(component: BuilderComponent): CSSProperties {
  const width = {
    "1/4": "25%",
    "1/3": "33.3333%",
    "1/2": "50%",
    FULL: "100%",
  }[component.settings.width ?? "FULL"];

  return {
    width,
    textAlign: component.settings.alignment ?? "left",
  };
}

type ParameterTableProps = {
  fields: BuilderComponent[];
  report: LaboratoryReportData;
};

function ParameterTable({ fields, report }: ParameterTableProps) {
  return (
    <table aria-label="Laboratory parameters">
      <thead>
        <tr>
          <th scope="col">Parameter</th>
          <th scope="col">Result</th>
          <th scope="col">Reference Range</th>
          <th scope="col">Unit</th>
          <th scope="col">Flag</th>
        </tr>
      </thead>
      <tbody>
        {fields.map((component) => {
          const value = Object.hasOwn(report.values, component.fieldKey)
            ? report.values[component.fieldKey]
            : undefined;
          const flag = resultFlag(component, value);
          const abnormal =
            flag &&
            flag !== (component.validation.flagLabels?.normal || "Normal");

          return (
            <tr key={component.id}>
              <td>{component.label}</td>
              <td
                className="result-value"
                style={{
                  textAlign: component.settings.alignment ?? "left",
                }}
              >
                {reportText(value)}
              </td>
              <td>{referenceRange(component)}</td>
              <td>{component.settings.unit || "—"}</td>
              <td className={`flag ${abnormal ? "abnormal" : ""}`}>
                {flag || "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

type TemplateContentProps = { report: LaboratoryReportData };

function TemplateContent({ report }: TemplateContentProps) {
  const components = [...report.template.components]
    .filter((component) => component.settings.showInPreview !== false)
    .sort((a, b) => a.order - b.order);
  const groups: BuilderComponent[][] = [];
  const isParameter = (field: BuilderComponent) =>
    ["text_field", "number_field", "date_field", "checkbox"].includes(
      field.type,
    ) &&
    (!field.settings.width || field.settings.width === "FULL");

  for (const component of components) {
    const last = groups.at(-1);

    if (isParameter(component) && last && last.every(isParameter)) {
      last.push(component);
    } else {
      groups.push([component]);
    }
  }

  return (
    <>
      {groups.map((group) => {
        const component = group[0];

        if (isParameter(component)) {
          return (
            <ParameterTable key={component.id} fields={group} report={report} />
          );
        }

        const { settings } = component;

        const value = Object.hasOwn(report.values, component.fieldKey)
          ? report.values[component.fieldKey]
          : undefined;

        if (component.type === "section_header") {
          return (
            <h3
              className="section-heading"
              key={component.id}
              style={{
                textAlign: settings.alignment,
              }}
            >
              {settings.sectionHeader || component.label}
            </h3>
          );
        }

        if (component.type === "static_text") {
          return (
            <div
              className="field static-text"
              key={component.id}
              style={fieldStyle(component)}
            >
              {settings.staticText || component.label}
            </div>
          );
        }

        if (component.type === "line_divider") {
          return (
            <hr
              className="divider"
              key={component.id}
              style={{
                borderTopStyle: settings.dividerStyle ?? "solid",
              }}
            />
          );
        }

        if (component.type === "image") {
          return (
            <div
              className="field"
              key={component.id}
              style={fieldStyle(component)}
            >
              {safeReportImage(settings.imageUrl) && (
                <img
                  className="report-image"
                  style={{
                    marginLeft:
                      settings.alignment === "center" ||
                      settings.alignment === "right"
                        ? "auto"
                        : 0,
                    marginRight: settings.alignment === "center" ? "auto" : 0,
                  }}
                  src={safeReportImage(settings.imageUrl)}
                  alt={settings.imageAlt || component.label}
                />
              )}
            </div>
          );
        }

        if (component.type === "table") {
          const columns = settings.tableColumns ?? [];
          const rows = Array.isArray(value) ? value : [];

          return (
            <section
              key={component.id}
              style={{
                textAlign: settings.alignment,
              }}
            >
              <h3 className="section-heading">{component.label}</h3>
              <table aria-label={component.label}>
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th
                        scope="col"
                        key={column.id}
                        style={{
                          width: column.width,
                        }}
                      >
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? (
                    rows.map((row, index) => (
                      <tr key={index}>
                        {columns.map((column) => (
                          <td key={column.id}>
                            {reportText(
                              row &&
                                typeof row === "object" &&
                                Object.hasOwn(row, column.id)
                                ? row[column.id]
                                : undefined,
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={Math.max(1, columns.length)}>
                        No entries recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          );
        }

        return (
          <div
            className="field"
            key={component.id}
            style={fieldStyle(component)}
          >
            <div className="field-label">{component.label}</div>
            <div className="field-value">
              {reportText(value)} {settings.unit}
            </div>
            {settings.referenceRange && (
              <div className="small muted">
                {"Reference: "}
                {settings.referenceRange}
              </div>
            )}
            {resultFlag(component, value) && (
              <div className="flag">{resultFlag(component, value)}</div>
            )}
          </div>
        );
      })}
    </>
  );
}

type LaboratoryReportProps = {
  report: LaboratoryReportData;
};

export default function LaboratoryReport({ report }: LaboratoryReportProps) {
  const { request, template } = report;

  return (
    <article aria-label={`${template.form_name} laboratory report`}>
      <header className="report-header">
        <img className="logo" src="/assets/images/reyna-g-logo.png" alt="Reyna G" />
        <div>
          <h1 className="clinic">Reyna G Diagnostic Medical Clinic</h1>
          <p className="report-type">
            CLINICAL LABORATORY & DIAGNOSTIC SERVICES
          </p>
        </div>
      </header>
      <p className={`report-state ${report.resultId ? "" : "draft"}`}>
        {report.resultId
          ? `Saved result · ${report.resultId}`
          : "DRAFT — NOT SAVED OR RELEASED"}
        {report.resultId &&
          !report.verifiedAt &&
          " · Verification not recorded"}
      </p>
      <dl className="patient">
        <div>
          <dt>Patient Name</dt>
          <dd className="patient-name">
            {request.patientName || "Not provided"}
          </dd>
        </div>
        <div>
          <dt>Patient ID</dt>
          <dd>{request.patientId || "Not provided"}</dd>
        </div>
        <div>
          <dt>Age / Sex</dt>
          <dd>
            {request.age ?? "—"}
            {" / "}
            {request.sex || "—"}
          </dd>
        </div>
        <div>
          <dt>Request No.</dt>
          <dd>{request.requestId}</dd>
        </div>
        <div>
          <dt>Requested</dt>
          <dd>{formatLabDate(request.requestedAt)}</dd>
        </div>
        <div>
          <dt>Sample Collected</dt>
          <dd>{formatLabDate(request.collectedAt)}</dd>
        </div>
      </dl>
      <h2 className="report-title">{template.form_name}</h2>
      <p className="report-category">{template.category}</p>
      <TemplateContent report={report} />
      <section className="notes">
        <h3>Notes / Observations</h3>
        <p>{report.remarks || "No additional notes."}</p>
      </section>
      <footer className="report-footer">
        <p>
          {"Request: "}
          {request.requestId}
          {" · Patient: "}
          {request.patientId || "Not provided"}
        </p>
        <p>
          {"Template: "}
          {template.form_name}
          {template.version != null ? ` · Version ${template.version}` : ""}
        </p>
        {report.savedAt && (
          <p>
            {"Saved: "}
            {formatLabDate(report.savedAt)}
          </p>
        )}
        <p>
          {report.verifiedAt && report.verifiedBy
            ? `Verified by: ${report.verifiedBy} · ${formatLabDate(report.verifiedAt)}`
            : "Verification not recorded."}
        </p>
        {!report.resultId && (
          <p>
            <strong>DRAFT — NOT SAVED OR RELEASED</strong>
          </p>
        )}
      </footer>
    </article>
  );
}

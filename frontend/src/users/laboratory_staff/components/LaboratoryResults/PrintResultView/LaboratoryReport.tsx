import type { CSSProperties } from "react";
import type { BuilderComponent } from "../../../../../interface/FormTemplate";
import type { LaboratoryReportData } from "../../../../../interface/LaboratoryAnalysis";
import { formatLabDate } from "../../../../../utils/formats";
import { resultFlag } from "../utils/laboratoryValidation";
import {
  REPORT_LOGO,
  reportText,
  safeReportImage,
} from "../utils/laboratoryPrint";
import { CLINIC_INFO } from "../../../../../lib/clinicInfo";
import {
  isReportParameter as isParameter,
  reportComponents,
} from "../utils/reportTemplates";
import {
  isImagingReport,
  templatePaperSize,
} from "../../../../../utils/templatePaper";

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

function ParameterValue({
  component,
  report,
}: {
  component: BuilderComponent;
  report: LaboratoryReportData;
}) {
  const value = Object.hasOwn(report.values, component.fieldKey)
    ? report.values[component.fieldKey]
    : undefined;
  const flag = resultFlag(component, value);
  const abnormal =
    flag && flag !== (component.validation.flagLabels?.normal || "Normal");
  return (
    <>
      {reportText(value)}
      {abnormal && <span className="flag abnormal">{flag}</span>}
    </>
  );
}

function ParameterTable({ fields, report }: ParameterTableProps) {
  return (
    <table className="parameters" aria-label="Laboratory parameters">
      <colgroup>
        <col className="test-column" />
        <col className="value-column" />
        <col className="reference-column" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">Test</th>
          <th scope="col">Result</th>
          <th scope="col">Reference</th>
        </tr>
      </thead>
      <tbody>
        {fields.map((component) => {
          const reference = referenceRange(component);
          const unit = component.settings.unit;
          const referenceWithUnit =
            reference === "—" ||
            !unit ||
            reference.toLowerCase().includes(unit.toLowerCase())
              ? reference
              : `${reference} ${unit}`;

          return (
            <tr key={component.id}>
              <th scope="row">{component.label}</th>
              <td
                className="result-value"
                style={{
                  textAlign: component.settings.alignment ?? "center",
                }}
              >
                <ParameterValue component={component} report={report} />
                {unit && <span>{` ${unit}`}</span>}
              </td>
              <td>{referenceWithUnit}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

type TemplateContentProps = { report: LaboratoryReportData };

function TemplateContent({ report }: TemplateContentProps) {
  const a4 =
    templatePaperSize(
      report.template,
      report.request.tests.find(
        (test) => test.serviceId === report.template.service_id,
      )?.name,
    ) === "a4";
  const components = reportComponents(report.template);
  const groups: BuilderComponent[][] = [];

  for (const component of components) {
    const last = groups.at(-1);

    if (!a4 && isParameter(component) && last && last.every(isParameter)) {
      last.push(component);
    } else {
      groups.push([component]);
    }
  }

  return (
    <>
      {groups.map((group) => {
        const component = group[0];

        if (!a4 && isParameter(component)) {
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
  const reportTitle =
    request.tests
      .find((test) => test.serviceId === template.service_id)
      ?.name.trim() || template.form_name;
  const a4 = templatePaperSize(template, reportTitle) === "a4";
  const imaging = isImagingReport(
    `${template.form_name} ${template.category} ${reportTitle}`,
  );
  const xray = /x[\s-]?ray/i.test(
    `${template.form_name} ${template.category} ${reportTitle}`,
  );

  return (
    <article
      className="report-sheet"
      aria-label={`${template.form_name} report`}
    >
      <img className="watermark" src={REPORT_LOGO} alt="" aria-hidden="true" />
      <header className="report-header">
        <div className="logo-frame">
          <img className="logo" src={REPORT_LOGO} alt="Reyna G" />
        </div>
        <div className="clinic-details">
          <h1 className="clinic">{CLINIC_INFO.laboratoryName.toUpperCase()}</h1>
          <p className="clinic-address">{CLINIC_INFO.address.toUpperCase()}</p>
          <p className="clinic-contact">TEL #: {CLINIC_INFO.phone}</p>
          {!a4 && (
            <p className="clinic-contact">
              DOH ACCREDITATION NO.: {CLINIC_INFO.dohAccreditationNo}
            </p>
          )}
        </div>
      </header>
      {!report.resultId && (
        <p className="report-state draft">DRAFT — NOT SAVED OR RELEASED</p>
      )}
      <dl className="patient">
        <div>
          <dt>{a4 ? "Patient Name:" : "Name:"}</dt>
          <dd className="patient-name">
            {request.patientName || "Not provided"}
          </dd>
        </div>
        <div>
          <dt>{a4 ? "Age/Gender:" : "Date:"}</dt>
          <dd>
            {a4
              ? `${request.age ?? "—"} / ${request.sex || "—"}`
              : formatLabDate(
                  report.savedAt || request.collectedAt || request.requestedAt,
                )}
          </dd>
        </div>
        {a4 && (
          <div>
            <dt>Examination:</dt>
            <dd>{reportTitle}</dd>
          </div>
        )}
        {a4 && (
          <div>
            <dt>Requesting Physician:</dt>
            <dd>{report.requestingPhysician || "\u00a0"}</dd>
          </div>
        )}
        {a4 && (
          <div>
            <dt>Case #:</dt>
            <dd>{request.requestId}</dd>
          </div>
        )}
        <div>
          <dt>{a4 ? "Date:" : "Age / Gender:"}</dt>
          <dd>
            {a4
              ? formatLabDate(
                  report.savedAt || request.collectedAt || request.requestedAt,
                )
              : `${request.age ?? "—"} / ${request.sex || "—"}`}
          </dd>
        </div>
        {!a4 && (
          <div>
            <dt>Requesting Physician:</dt>
            <dd>{report.requestingPhysician || "\u00a0"}</dd>
          </div>
        )}
      </dl>
      <div className="report-body">
        <h2 className="report-title">
          {a4
            ? xray
              ? "DIAGNOSTIC X-RAY REPORT"
              : template.form_name
            : reportTitle}
        </h2>
        {template.category?.trim() && (
          <p className="report-category">{template.category.trim()}</p>
        )}
        <TemplateContent report={report} />
      </div>
      {(!a4 || report.remarks.trim()) && (
        <section className="notes">
          <h3>REMARKS:</h3>
          <p>{report.remarks || "\u00a0"}</p>
        </section>
      )}
      <footer className="report-footer">
        <div className="signatures" aria-label="Report signatures">
          {a4 ? (
            <div>
              <p className="signature-name">{"\u00a0"}</p>
              <p className="signature-role">
                {imaging ? "Radiologist/Sonologist" : "Attending Physician"}
              </p>
              <p className="license">License #: ____________</p>
            </div>
          ) : (
            <>
              <div>
                <p className="signature-heading">{"\u00a0"}</p>
                <p className="signature-name">{"\u00a0"}</p>
                <p className="signature-role">Pathologist</p>
                <p className="license">Licensed #: ____________</p>
              </div>
              <div>
                <p className="signature-heading">Processed by:</p>
                <p className="signature-name">{"\u00a0"}</p>
                <p className="signature-role">
                  Registered Medical Technologist
                </p>
                <p className="license">Licensed #: ____________</p>
              </div>
              <div>
                <p className="signature-heading">Evaluated by:</p>
                <p className="signature-name">
                  {report.verifiedAt && report.verifiedBy
                    ? report.verifiedBy
                    : "\u00a0"}
                </p>
                <p className="signature-role">
                  Registered Medical Technologist
                </p>
                <p className="license">Licensed #: ____________</p>
              </div>
            </>
          )}
        </div>
        <p className="report-meta">
          {`Request: ${request.requestId} · Patient: ${request.patientId || "Not provided"}`}
          {report.resultId
            ? ` · Saved result: ${report.resultId}`
            : " · DRAFT — NOT SAVED OR RELEASED"}
          {template.version != null ? ` · Version ${template.version}` : ""}
          {" · "}
          {report.verifiedAt && report.verifiedBy
            ? `Verified by: ${report.verifiedBy} · ${formatLabDate(report.verifiedAt)}`
            : "Verification not recorded."}
        </p>
      </footer>
    </article>
  );
}

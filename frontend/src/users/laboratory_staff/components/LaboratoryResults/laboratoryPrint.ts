import { CLINIC_INFO } from "../../../../lib/clinicInfo";

// Full portrait long bond sheet; the report occupies only its top half.
export const REPORT_WIDTH = 816;
export const REPORT_MIN_HEIGHT = 1248;
export const REPORT_PAPER_LABEL =
  "Long bond · 8.5 × 13 in · Portrait · Top half only";
export const REPORT_LOGO = CLINIC_INFO.logoUrl;

export const REPORT_FRAME_HTML = /* HTML */ `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Laboratory Result</title>
      <style>
        :root {
          color-scheme: light;
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 6px 24px 0;
          width: 816px;
          min-height: 1248px;
          background: white;
          color: #181818;
          font:
            11px/1.25 Arial,
            Helvetica,
            sans-serif;
        }
        h1,
        h2,
        h3,
        p,
        dl,
        dd {
          margin: 0;
        }
        img {
          max-width: 100%;
        }
        .report-sheet {
          position: relative;
          isolation: isolate;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .report-sheet > :not(.watermark) {
          position: relative;
          z-index: 1;
        }
        .watermark {
          position: absolute;
          z-index: 0;
          top: 145px;
          left: 50%;
          width: 355px;
          height: 355px;
          object-fit: contain;
          transform: translateX(-50%);
          opacity: 0.075;
          pointer-events: none;
        }
        .report-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin: 0;
          break-inside: avoid;
        }
        .logo-frame {
          position: relative;
          width: 90px;
          height: 80px;
          overflow: hidden;
          flex-shrink: 0;
        }
        .logo {
          position: absolute;
          left: -17px;
          top: -21px;
          width: 125px;
          height: 125px;
          max-width: none;
          object-fit: contain;
        }
        .clinic-details {
          text-align: center;
        }
        .clinic {
          color: #318b67;
          font-size: 23px;
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.7px;
        }
        .clinic-address {
          margin-top: 4px;
          font-size: 12px;
          font-weight: 700;
        }
        .clinic-contact {
          font-size: 11px;
          font-weight: 700;
        }
        .report-state {
          margin: 0 0 6px;
          text-align: center;
          font-size: 10px;
          font-weight: bold;
          break-inside: avoid;
        }
        .draft {
          color: #8a341e;
        }
        .patient {
          display: grid;
          grid-template-columns: 1.05fr 1fr;
          margin-bottom: 0;
          border-top: 1px solid #bcc7b8;
          border-left: 1px solid #bcc7b8;
          break-inside: avoid;
        }
        .patient > div {
          display: flex;
          align-items: baseline;
          gap: 6px;
          min-width: 0;
          min-height: 20px;
          padding: 3px 6px;
          border-right: 1px solid #bcc7b8;
          border-bottom: 1px solid #bcc7b8;
        }
        .patient > div:nth-child(n + 3) {
          background: rgba(185, 205, 164, 0.48);
        }
        .patient dt {
          flex-shrink: 0;
          font-weight: bold;
          text-transform: uppercase;
        }
        .patient dd {
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .patient-name {
          font-weight: bold;
          text-transform: uppercase;
        }
        .report-body {
          flex: 0 0 auto;
        }
        .report-title {
          margin-bottom: 2px;
          font-size: 18px;
          text-align: center;
          text-decoration: underline;
          text-underline-offset: 3px;
          text-transform: uppercase;
          break-after: avoid;
        }
        .report-category {
          margin: -2px 0 4px;
          font-size: 12px;
          font-weight: bold;
          text-align: center;
          text-transform: uppercase;
          break-after: avoid;
        }
        .section-heading {
          margin: 8px 0 4px;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          break-after: avoid;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          margin-bottom: 0;
          font-size: 11px;
        }
        thead {
          display: table-header-group;
        }
        tfoot {
          display: table-footer-group;
        }
        tr {
          break-inside: avoid;
        }
        th,
        td {
          padding: 2px 6px;
          height: 19px;
          vertical-align: middle;
          border: 1px solid #bcc7b8;
          text-align: inherit;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }
        thead th {
          font-weight: bold;
          text-align: center;
          text-transform: uppercase;
        }
        tbody tr:nth-child(odd) > * {
          background: rgba(185, 205, 164, 0.48);
        }
        .parameters {
          text-align: center;
        }
        .parameters .test-column {
          width: 38%;
        }
        .parameters .value-column {
          width: 25%;
        }
        .parameters .reference-column {
          width: 37%;
        }
        .parameters tbody th {
          font-weight: bold;
        }
        .result-value {
          font-weight: bold;
        }
        .flag {
          margin-left: 5px;
          font-size: 9px;
          font-weight: bold;
        }
        .abnormal {
          color: #8a341e;
        }
        .small,
        .muted {
          font-size: 9px;
          color: #484848;
        }
        .field {
          display: inline-block;
          vertical-align: top;
          padding: 4px 8px 6px 0;
          break-inside: avoid;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }
        .field-label {
          font-weight: bold;
        }
        .field-value {
          font-weight: bold;
          margin-top: 2px;
        }
        .static-text,
        .notes p {
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }
        .static-text {
          margin: 4px 0;
        }
        .report-image {
          display: block;
          max-height: 150px;
          object-fit: contain;
          margin: 6px 0;
        }
        .divider {
          border: 0;
          border-top: 1px solid #bcc7b8;
          margin: 6px 0;
        }
        .notes {
          margin: 0;
          min-height: 24px;
        }
        .notes h3 {
          font-size: 11px;
          text-decoration: underline;
          break-after: avoid;
        }
        .notes p {
          margin: 0;
        }
        .report-footer {
          margin: 0;
          padding-top: 0;
          break-inside: avoid;
          overflow-wrap: anywhere;
        }
        .signatures {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
          text-align: center;
        }
        .signature-heading {
          min-height: 15px;
          font-size: 11px;
          font-weight: bold;
        }
        .signature-name {
          min-height: 30px;
          padding-top: 14px;
          border-bottom: 1px solid #777;
          font-weight: bold;
        }
        .signature-role {
          margin-top: 4px;
          font-size: 10px;
        }
        .license {
          margin-top: 2px;
          font-size: 10px;
        }
        .report-meta {
          margin-top: 6px;
          font-size: 8px;
          line-height: 1.3;
          color: #484848;
          text-align: center;
        }
        .visually-hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          overflow: hidden;
          clip-path: inset(50%);
          white-space: nowrap;
        }
        @page {
          size: 8.5in 13in;
          /* Small top inset, quarter-inch sides, and a blank bottom half. */
          margin: 0.0625in 0.25in 6.5in;
        }
        @media print {
          html,
          body {
            width: auto;
            min-height: 0;
            margin: 0;
            padding: 0;
            background: white;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          a {
            color: inherit;
            text-decoration: none;
          }
        }
      </style>
    </head>
    <body></body>
  </html>`;

export function reportText(value: unknown): string {
  if (value == null || value === "") {
    return "—";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.length ? value.map(reportText).join(", ") : "—";
  }

  return "—";
}

export function safeReportImage(source?: string) {
  return source &&
    (/^https?:\/\//i.test(source) ||
      /^\/(?!\/)/.test(source) ||
      /^data:image\/(png|jpeg|webp|gif);base64,/i.test(source))
    ? source
    : undefined;
}

/** Wait for the actual report assets, including admin-supplied images, before printing. */
export async function waitForReportAssets(document: Document) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      Promise.all([
        document.fonts?.ready,
        ...Array.from(document.images).map(async (image) => {
          await image.decode();

          if (!image.naturalWidth) {
            throw new Error("A report image could not be loaded.");
          }
        }),
      ]),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                "Report images are taking too long to load. Please retry the preview.",
              ),
            ),
          15000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

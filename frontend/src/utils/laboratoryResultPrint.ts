
import type { LaboratoryResult } from "../path/to/LaboratoryResultTable";

type LaboratoryPrintRequest = {
  patient_id: string;
  doctor_id: string | null;
  test_type: string;
  request_id: string;
};

type LaboratoryResultPrintOptions = {
  request: LaboratoryPrintRequest;
  results: LaboratoryResult[];
};

const escapeHtml = (value: unknown): string =>
  String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });

export function generateLaboratoryResultHtml({
  request,
  results,
}: LaboratoryResultPrintOptions): string {
  const rows = results
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.parameter)}</td>
          <td>${escapeHtml(item.result)}</td>
          <td>${escapeHtml(item.referenceRange)}</td>
          <td>${escapeHtml(item.status)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <title>Laboratory Result - ${escapeHtml(request.patient_id)}</title>

        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            color: #222;
          }

          h1 {
            margin-bottom: 5px;
          }

          .information {
            margin-bottom: 25px;
            line-height: 1.7;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }

          th,
          td {
            border: 1px solid #ccc;
            padding: 10px;
            text-align: left;
          }

          th {
            background: #f3f4f6;
          }

          @media print {
            body {
              padding: 0;
            }

            th {
              background: #f3f4f6 !important;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }

            tr {
              break-inside: avoid;
            }
          }
        </style>
      </head>

      <body>
        <h1>Laboratory Result</h1>

        <div class="information">
          <strong>Patient ID:</strong>
          ${escapeHtml(request.patient_id)}
          <br />

          <strong>Doctor ID:</strong>
          ${escapeHtml(request.doctor_id ?? "N/A")}
          <br />

          <strong>Test Type:</strong>
          ${escapeHtml(request.test_type)}
          <br />

          <strong>Request ID:</strong>
          ${escapeHtml(request.request_id)}
          <br />

          <strong>Date:</strong>
          ${escapeHtml(new Date().toLocaleDateString())}
        </div>

        <table>
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Result</th>
              <th>Reference Range</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
    </html>
  `;
}

export function printLaboratoryResult({
  request,
  results,
}: LaboratoryResultPrintOptions): void {
  const printWindow = window.open("", "_blank", "width=900,height=700");

  if (!printWindow) {
    window.alert("Please allow pop-ups to print the laboratory result.");
    return;
  }

  const html = generateLaboratoryResultHtml({ request, results });

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  printWindow.onload = () => {
    printWindow.print();
  };
}

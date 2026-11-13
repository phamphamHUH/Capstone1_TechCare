type PrintablePatientRecord = {
  patient: {
    patient_id: string;
    full_name: string;
    email: string;
    contact_number: string;
    address: string;
    birthdate?: string;
  };
  summary: {
    age: number | string;
    sex: string;
    blood_type: string;
    civil_status: string;
    total_visits: number;
    pending_balance: string | number;
  };
  visits?: Array<{ queue_id?: string; status?: string; created_at?: string }>;
  labRequests?: Array<{ request_id?: string; status?: string; is_paid?: boolean; requested_at?: string }>;
  billing?: Array<{ bill_id?: string; status?: string; total_amount?: number | string; payment_method?: string }>;
};

function formatDate(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function safeText(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
}

export function buildPatientRecordPrintHtml(record: PrintablePatientRecord) {
  const visits = (record.visits ?? [])
    .map(
      (visit) => `
        <tr>
          <td>${safeText(visit.queue_id)}</td>
          <td>${safeText(visit.status)}</td>
          <td>${formatDate(visit.created_at)}</td>
        </tr>
      `,
    )
    .join("");

  const labRows = (record.labRequests ?? [])
    .map(
      (item) => `
        <tr>
          <td>${safeText(item.request_id)}</td>
          <td>${safeText(item.status)}</td>
          <td>${item.is_paid ? "Paid" : "Unpaid"}</td>
          <td>${formatDate(item.requested_at)}</td>
        </tr>
      `,
    )
    .join("");

  const billingRows = (record.billing ?? [])
    .map(
      (item) => `
        <tr>
          <td>${safeText(item.bill_id)}</td>
          <td>${safeText(item.status)}</td>
          <td>₱${Number(item.total_amount ?? 0).toFixed(2)}</td>
          <td>${safeText(item.payment_method)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Patient Record - ${safeText(record.patient.full_name)}</title>
        <style>
          :root { color-scheme: light; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            background: #f8fafc;
            padding: 32px;
          }
          .report {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border: 1px solid #dbe3ef;
            border-radius: 18px;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
            overflow: hidden;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 24px;
            padding: 24px 28px;
            background: linear-gradient(135deg, #eff6ff, #f8fafc);
            border-bottom: 1px solid #e5e7eb;
          }
          .brand h1 {
            margin: 0;
            font-size: 2rem;
            line-height: 1.2;
            letter-spacing: 0.04em;
            color: #0f172a;
          }
          .brand p {
            margin: 8px 0 0;
            color: #475569;
            font-size: 0.8rem;
          }
          .meta {
            text-align: right;
            font-size: 0.8rem;
            color: #475569;
          }
          .content { padding: 28px; }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 16px;
            margin-bottom: 24px;
          }
          .summary-card {
            border: 1px solid #dbe3ef;
            background: #f8fafc;
            border-radius: 12px;
            padding: 12px 14px;
          }
          .label {
            color: #64748b;
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            display: block;
            margin-bottom: 6px;
          }
          .value {
            font-size: 1rem;
            font-weight: 700;
            color: #0f172a;
          }
          .section { margin-top: 24px; }
          .section h2 {
            margin: 0 0 12px;
            font-size: 1rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #2563eb;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.85rem;
          }
          th, td {
            border: 1px solid #e2e8f0;
            padding: 10px 12px;
            text-align: left;
            vertical-align: top;
          }
          th {
            background: #eff6ff;
            color: #1e3a8a;
          }
          @media print {
            body { background: white; padding: 0; }
            .report { box-shadow: none; border: none; border-radius: 0; }
          }
        </style>
      </head>
      <body>
        <div class="report">
          <div class="header">
            <div class="brand">
              <h1>TechCare</h1>
              <p>Patient Record Summary</p>
            </div>
            <div class="meta">
              <div><strong>Patient ID:</strong> ${safeText(record.patient.patient_id)}</div>
              <div><strong>Printed:</strong> ${new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div class="content">
            <div class="summary-grid">
              <div class="summary-card">
                <span class="label">Patient</span>
                <span class="value">${safeText(record.patient.full_name)}</span>
              </div>
              <div class="summary-card">
                <span class="label">Age / Sex</span>
                <span class="value">${safeText(record.summary.age)} / ${safeText(record.summary.sex)}</span>
              </div>
              <div class="summary-card">
                <span class="label">Blood Type</span>
                <span class="value">${safeText(record.summary.blood_type)}</span>
              </div>
              <div class="summary-card">
                <span class="label">Civil Status</span>
                <span class="value">${safeText(record.summary.civil_status)}</span>
              </div>
            </div>

            <div class="summary-grid">
              <div class="summary-card">
                <span class="label">Email</span>
                <span class="value">${safeText(record.patient.email)}</span>
              </div>
              <div class="summary-card">
                <span class="label">Contact</span>
                <span class="value">${safeText(record.patient.contact_number)}</span>
              </div>
              <div class="summary-card">
                <span class="label">Visits</span>
                <span class="value">${safeText(record.summary.total_visits)}</span>
              </div>
              <div class="summary-card">
                <span class="label">Balance</span>
                <span class="value">₱${Number(record.summary.pending_balance ?? 0).toFixed(2)}</span>
              </div>
            </div>

            <div class="section">
              <h2>Contact Information</h2>
              <table>
                <tbody>
                  <tr>
                    <th style="width: 180px;">Address</th>
                    <td>${safeText(record.patient.address)}</td>
                  </tr>
                  <tr>
                    <th>Birthdate</th>
                    <td>${formatDate(record.patient.birthdate)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="section">
              <h2>Visit History</h2>
              <table>
                <thead>
                  <tr>
                    <th>Queue ID</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  ${visits || '<tr><td colspan="3">No visit history found.</td></tr>'}
                </tbody>
              </table>
            </div>

            <div class="section">
              <h2>Laboratory Requests</h2>
              <table>
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Requested</th>
                  </tr>
                </thead>
                <tbody>
                  ${labRows || '<tr><td colspan="4">No laboratory requests found.</td></tr>'}
                </tbody>
              </table>
            </div>

            <div class="section">
              <h2>Billing Records</h2>
              <table>
                <thead>
                  <tr>
                    <th>Bill ID</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Method</th>
                  </tr>
                </thead>
                <tbody>
                  ${billingRows || '<tr><td colspan="4">No billing records found.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

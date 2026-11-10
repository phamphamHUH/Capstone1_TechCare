import { ENV } from "../../../config/env.js";

// =========================
// SHARED EMAIL LAYOUT
// =========================
// Every email is information only: nothing has to be clicked or confirmed.
// One look for every email, built to render the same in Gmail (web + app),
// Outlook (desktop, which uses Word to render), Outlook.com, Apple Mail,
// Yahoo and phone mail apps:
// - tables for layout (Outlook desktop ignores max-width, flex and grid)
// - every style inline; <style> only adds extras (phone sizes, dark mode)
//   that clients without <style> support can safely skip
// - a light card that stays readable when an app forces dark mode

export type Email = {
  to: string;
  subject: string;
  html: string;
};

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const COLOR = {
  brand: "#0284c7",
  page: "#f1f5f9",
  card: "#ffffff",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  noteBg: "#f8fafc",
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export type DetailRow = {
  label: string;
  value: string;
  // Bold row with a line above it, e.g. the total on a receipt.
  strong?: boolean;
};

export type LayoutOptions = {
  // Short summary shown next to the subject in the inbox list (hidden in the email).
  preview: string;
  heading: string;
  greeting?: string;
  paragraphs: string[];
  // Label / value table under the text: username, receipt lines, ...
  details?: DetailRow[];
  // Optional shortcut, e.g. "Log in to TechCare". Never required to do anything.
  button?: { text: string; link: string };
  // Small grey box at the end: privacy notes, who to contact, ...
  note?: string;
};

function detailsTable(rows: DetailRow[]) {
  const cell = `font-family:${FONT};font-size:15px;line-height:22px;padding:10px 0`;

  const body = rows
    .map(({ label, value, strong }) => {
      const line = strong ? `border-top:2px solid ${COLOR.text};` : `border-top:1px solid ${COLOR.border};`;
      const weight = strong ? "font-weight:700;" : "";
      return `<tr>
                  <td class="${strong ? "dv" : "dl"}" style="${cell};${line}${weight}color:${strong ? COLOR.text : COLOR.muted};padding-right:16px">${escapeHtml(label)}</td>
                  <td class="dv" align="right" style="${cell};${line}${weight}color:${COLOR.text};text-align:right;word-break:break-word">${escapeHtml(value)}</td>
                </tr>`;
    })
    .join("");

  return `<tr>
          <td class="px" style="padding:0 40px 24px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${body}</table>
          </td>
        </tr>`;
}

export function layout({ preview, heading, greeting, paragraphs, details, button, note }: LayoutOptions) {
  const clinic = escapeHtml(ENV.EMAIL_FROM_NAME);
  const year = new Date().getFullYear();

  const text = [greeting, ...paragraphs]
    .filter((line): line is string => Boolean(line))
    .map(
      (line) =>
        `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:24px;color:${COLOR.text}">${escapeHtml(line)}</p>`,
    )
    .join("");

  const detailsBlock = details?.length ? detailsTable(details) : "";

  const buttonBlock = button
    ? `<tr>
          <td class="px" style="padding:0 40px 28px">
            <table role="presentation" class="btn" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="${COLOR.brand}" style="border-radius:8px;background:${COLOR.brand}">
                  <a href="${escapeHtml(button.link)}" target="_blank" style="display:inline-block;padding:14px 28px;border:1px solid ${COLOR.brand};border-radius:8px;font-family:${FONT};font-size:16px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none">${escapeHtml(button.text)}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
    : "";

  const noteBlock = note
    ? `<tr>
          <td class="px" style="padding:0 40px 32px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td class="note" style="padding:14px 16px;background:${COLOR.noteBg};border:1px solid ${COLOR.border};border-radius:8px;font-family:${FONT};font-size:14px;line-height:20px;color:${COLOR.muted}">${escapeHtml(note)}</td>
              </tr>
            </table>
          </td>
        </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(heading)}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<style>td,p,a,h1{font-family:Arial,sans-serif !important}</style>
<![endif]-->
<style>
  body{margin:0;padding:0;width:100% !important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
  table,td{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt}
  a{text-decoration:none}
  @media only screen and (max-width:620px){
    .wrap{padding:16px 8px !important}
    .px{padding-left:24px !important;padding-right:24px !important}
    .h1{font-size:22px !important;line-height:30px !important}
    .btn,.btn tbody,.btn tr,.btn td,.btn a{display:block !important;width:100% !important;text-align:center !important;box-sizing:border-box}
  }
  @media (prefers-color-scheme:dark){
    .bg{background:#0b1220 !important}
    .card{background:#111827 !important;border-color:#1f2937 !important}
    .card p,.card h1,.dv{color:#f1f5f9 !important}
    .dl{color:#94a3b8 !important}
    .dl,.dv{border-color:#334155 !important}
    .note{background:#0f172a !important;border-color:#1f2937 !important;color:#94a3b8 !important}
    .muted{color:#94a3b8 !important}
  }
  [data-ogsc] .card p,[data-ogsc] .card h1,[data-ogsc] .dv{color:#f1f5f9 !important}
</style>
</head>
<body class="bg" style="margin:0;padding:0;background:${COLOR.page}">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${COLOR.page};opacity:0">${escapeHtml(preview)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
  <table role="presentation" class="bg" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR.page}">
    <tr>
      <td align="center" class="wrap" style="padding:32px 16px">
        <!--[if mso]><table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto">
          <tr>
            <td style="padding:0 4px 16px;font-family:${FONT};font-size:15px;font-weight:700;color:${COLOR.brand}">${clinic}</td>
          </tr>
          <tr>
            <td class="card" style="background:${COLOR.card};border:1px solid ${COLOR.border};border-radius:12px;overflow:hidden">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height:4px;line-height:4px;font-size:4px;background:${COLOR.brand};border-radius:12px 12px 0 0">&nbsp;</td>
                </tr>
                <tr>
                  <td class="px" style="padding:32px 40px 8px">
                    <h1 class="h1" style="margin:0 0 20px;font-family:${FONT};font-size:24px;line-height:32px;font-weight:700;color:${COLOR.text}">${escapeHtml(heading)}</h1>
                    ${text}
                  </td>
                </tr>
                ${detailsBlock}
                ${buttonBlock}
                ${noteBlock}
              </table>
            </td>
          </tr>
          <tr>
            <td class="muted" align="center" style="padding:20px 16px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${COLOR.muted}">
              This is an automated message from ${clinic}. Please don't reply to this email.<br>
              &copy; ${year} ${clinic}
            </td>
          </tr>
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

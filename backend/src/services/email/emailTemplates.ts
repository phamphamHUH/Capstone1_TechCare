// =========================
// EMAIL TEMPLATES
// =========================
// Every email the system sends. They are information only: nothing has to
// be clicked or confirmed. Each function returns { to, subject, html } for
// sendEmail(). The shared look lives in ./emailTemplates/layout.ts and
// escapes every value, so names can't inject HTML.
//
// To add an email: create ./emailTemplates/<name>.ts that calls layout(),
// then export it here.

export type { Email } from "./emailTemplates/layout.js";
export { employeeAccountCreatedEmail } from "./emailTemplates/employeeAccountCreated.js";
export { patientAccountCreatedEmail } from "./emailTemplates/patientAccountCreated.js";
export { labResultsReadyEmail } from "./emailTemplates/labResultsReady.js";
export { paymentReceiptEmail, type ReceiptInfo } from "./emailTemplates/paymentReceipt.js";

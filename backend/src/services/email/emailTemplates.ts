// =========================
// EMAIL TEMPLATES
// =========================
// Every email the system sends. Each function returns { to, subject, html }
// for sendEmail(). The shared look lives in ./emailTemplates/layout.ts and
// escapes every value, so names can't inject HTML.
//
// To add an email: create ./emailTemplates/<name>.ts that calls layout(),
// then export it here.

export type { Email } from "./emailTemplates/layout.js";
export { employeeVerificationEmail } from "./emailTemplates/employeeVerification.js";
export { patientVerificationEmail } from "./emailTemplates/patientVerification.js";
export { passwordResetEmail } from "./emailTemplates/passwordReset.js";
export { labResultsReadyEmail } from "./emailTemplates/labResultsReady.js";

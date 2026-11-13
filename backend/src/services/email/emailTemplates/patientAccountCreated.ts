import { ENV } from "../../../config/env.js";
import { layout, type Email } from "./layout.js";

// PATIENT: the front desk registered them, and either
// - set the password at the desk (access = { password }): the email carries it,
//   and the patient can log in right away, or
// - chose an emailed link (access = { setPasswordLink }): the patient creates
//   their own password and can log in once it's set.
export type PatientAccess =
  | { password: string }
  | { setPasswordLink: { url: string; days: number } };

export function patientAccountCreatedEmail(
  to: string,
  firstName: string,
  patientId: string,
  access: PatientAccess,
): Email {
  const intro =
    "You're now registered as a patient. With your patient account you can view your laboratory results, prescriptions and visit history online.";

  if ("password" in access) {
    return {
      to,
      subject: `You're now registered at ${ENV.EMAIL_FROM_NAME}`,
      html: layout({
        preview: "Your patient account is ready. Here are your login details.",
        heading: "Welcome to the clinic",
        greeting: `Hi ${firstName},`,
        paragraphs: [intro, "You can log in now with the details below."],
        details: [
          { label: "Patient ID / Username", value: patientId },
          { label: "Password", value: access.password },
        ],
        button: { text: "Log in", link: `${ENV.APP_URL}/login` },
        note: "Keep this password private. Forgot it? Visit the clinic front desk and they will reset it for you.",
      }),
    };
  }

  return {
    to,
    subject: `Create your password for ${ENV.EMAIL_FROM_NAME}`,
    html: layout({
      preview: "Your patient account is ready. Create your password to start.",
      heading: "Welcome to the clinic",
      greeting: `Hi ${firstName},`,
      paragraphs: [
        intro,
        "To start, create your password with the button below. You can log in once it's set.",
      ],
      details: [{ label: "Patient ID / Username", value: patientId }],
      button: { text: "Create your password", link: access.setPasswordLink.url },
      note: `This link works once and expires in ${access.setPasswordLink.days} days. If it has expired, ask the clinic front desk for help.`,
    }),
  };
}

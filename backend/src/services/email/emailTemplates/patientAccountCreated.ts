import { ENV } from "../../../config/env.js";
import { layout, type Email } from "./layout.js";

// PATIENT: the front desk registered them and set a password. The account
// works right away; the link lets the patient change to their own password.
export function patientAccountCreatedEmail(
  to: string,
  firstName: string,
  patientId: string,
  changePasswordLink: string,
  linkDays: number,
): Email {
  return {
    to,
    subject: `You're now registered at ${ENV.EMAIL_FROM_NAME}`,
    html: layout({
      preview: "Your patient account is ready. You can view your lab results and records online.",
      heading: "Welcome to the clinic",
      greeting: `Hi ${firstName},`,
      paragraphs: [
        "You're now registered as a patient. With your patient account you can view your laboratory results, prescriptions and visit history online.",
        "You can log in now with the password the front desk gave you. To choose your own password, use the button below.",
      ],
      details: [{ label: "Patient ID / Username", value: patientId }],
      button: { text: "Change your password", link: changePasswordLink },
      note: `The link works once and expires in ${linkDays} days. You can still log in at ${ENV.APP_URL}/login with the front desk password. Forgot your password? Visit the clinic front desk and they will reset it for you.`,
    }),
  };
}

import { ENV } from "../../../config/env.js";
import { layout, type Email } from "./layout.js";

// PATIENT: the front desk registered them. Nothing to confirm; it works right away.
export function patientAccountCreatedEmail(to: string, firstName: string, patientId: string): Email {
  return {
    to,
    subject: `You're now registered at ${ENV.EMAIL_FROM_NAME}`,
    html: layout({
      preview: "Your patient account is ready. You can view your lab results and records online.",
      heading: "Welcome to the clinic",
      greeting: `Hi ${firstName},`,
      paragraphs: [
        "You're now registered as a patient. With your patient account you can view your laboratory results, prescriptions and visit history online.",
        "The front desk gave you your password when you registered.",
      ],
      details: [{ label: "Patient ID / Username", value: patientId }],
      button: { text: "Open patient portal", link: `${ENV.APP_URL}/login` },
      note: "Forgot your password? Visit the clinic front desk and they will reset it for you.",
    }),
  };
}

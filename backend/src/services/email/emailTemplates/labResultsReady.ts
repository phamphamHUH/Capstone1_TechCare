import { ENV } from "../../../config/env.js";
import { layout, type Email } from "./layout.js";

// PATIENT: laboratory results are ready to view.
// Send through sendEmailToPatient so unverified patients get nothing:
//   sendEmailToPatient(patientId, (to, firstName) => labResultsReadyEmail(to, firstName))
export function labResultsReadyEmail(to: string, firstName: string): Email {
  return {
    to,
    subject: "Your laboratory results are ready",
    html: layout({
      preview: "Your laboratory results are ready. Log in to your patient account to view them.",
      heading: "Your results are ready",
      greeting: `Hi ${firstName},`,
      paragraphs: [
        "Your laboratory results have been released. Log in to your patient account to view them.",
        "If you have questions about your results, please talk to your doctor or contact the clinic.",
      ],
      button: { text: "View my results", link: `${ENV.APP_URL}/login` },
      note: "For your privacy, results are only shown after you log in. We never send them as attachments.",
    }),
  };
}

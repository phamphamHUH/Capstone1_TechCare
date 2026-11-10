import { ENV } from "../../../config/env.js";
import { layout, type Email } from "./layout.js";

// PATIENT: a laboratory result was released.
// Results themselves are never put in the email; the patient logs in to see them.
export function labResultsReadyEmail(to: string, firstName: string, testName: string): Email {
  return {
    to,
    subject: `Your ${testName} result is ready`,
    html: layout({
      preview: `Your ${testName} result has been released. Log in to your patient account to view it.`,
      heading: "Your result is ready",
      greeting: `Hi ${firstName},`,
      paragraphs: [
        "Your laboratory result has been released. Log in to your patient account to view it.",
        "If you have questions about your result, please talk to your doctor or contact the clinic.",
      ],
      details: [{ label: "Test", value: testName }],
      button: { text: "View my results", link: `${ENV.APP_URL}/login` },
      note: "For your privacy, results are only shown after you log in. We never send them by email.",
    }),
  };
}

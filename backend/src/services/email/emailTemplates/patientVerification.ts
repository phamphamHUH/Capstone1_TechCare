import { ENV } from "../../../config/env.js";
import { layout, type Email } from "./layout.js";

// PATIENT: verify email (or a changed email) to start receiving clinic emails
export function patientVerificationEmail(
  to: string,
  firstName: string,
  token: string,
  isNewEmail: boolean,
): Email {
  return {
    to,
    subject: isNewEmail ? "Confirm your new email" : `Verify your email for ${ENV.EMAIL_FROM_NAME}`,
    html: layout({
      preview: isNewEmail
        ? "Confirm this address to receive clinic emails here."
        : "Verify your email to get updates like when your lab results are ready.",
      heading: isNewEmail ? "Confirm your new email" : "Verify your email",
      greeting: `Hi ${firstName},`,
      paragraphs: [
        isNewEmail
          ? "Your email at the clinic was changed to this address. Confirm it to receive clinic emails here. Until then, we keep using your previous email."
          : "Confirm this is your email so the clinic can send you updates, like when your laboratory results are ready.",
        "Your patient account already works; this only turns on emails from the clinic.",
      ],
      button: {
        text: isNewEmail ? "Confirm new email" : "Verify email",
        link: `${ENV.APP_URL}/verify-email?token=${token}`,
      },
      note: "This link expires in 48 hours.",
    }),
  };
}

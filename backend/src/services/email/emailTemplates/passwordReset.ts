import { ENV } from "../../../config/env.js";
import { layout, type Email } from "./layout.js";

// EMPLOYEE: forgot password
export function passwordResetEmail(to: string, firstName: string, token: string): Email {
  return {
    to,
    subject: "Reset your TechCare password",
    html: layout({
      preview: "Use this link to reset your TechCare password. It expires in 30 minutes.",
      heading: "Reset your password",
      greeting: `Hi ${firstName},`,
      paragraphs: ["We received a request to reset your TechCare password. Click the button below to choose a new one."],
      button: { text: "Reset password", link: `${ENV.APP_URL}/reset-password?token=${token}` },
      note: "This link expires in 30 minutes and works once. If you didn't ask for this, ignore this email; your password won't change.",
    }),
  };
}

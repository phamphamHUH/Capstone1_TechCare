import { ENV } from "../../../config/env.js";
import { layout, type Email } from "./layout.js";

// EMPLOYEE: confirm email before the account can be used
export function employeeVerificationEmail(to: string, firstName: string, token: string): Email {
  return {
    to,
    subject: "Confirm your email to activate your TechCare account",
    html: layout({
      preview: "Confirm your email to activate your TechCare account.",
      heading: "Confirm your email",
      greeting: `Hi ${firstName},`,
      paragraphs: [
        "An administrator created a TechCare account for you. Confirm your email to activate it.",
        "Your administrator will give you your username and password.",
      ],
      button: { text: "Confirm email", link: `${ENV.APP_URL}/verify-email?token=${token}` },
      note: "This link expires in 48 hours. If you weren't expecting this, you can ignore this email.",
    }),
  };
}

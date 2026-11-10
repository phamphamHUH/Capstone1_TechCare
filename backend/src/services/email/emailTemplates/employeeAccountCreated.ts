import { ENV } from "../../../config/env.js";
import { layout, type Email } from "./layout.js";

// EMPLOYEE: an admin created their account. Nothing to confirm; it works right away.
export function employeeAccountCreatedEmail(
  to: string,
  firstName: string,
  username: string,
  role: string,
): Email {
  return {
    to,
    subject: "Your TechCare account is ready",
    html: layout({
      preview: `Your TechCare ${role} account has been created. You can log in now.`,
      heading: "Your account is ready",
      greeting: `Hi ${firstName},`,
      paragraphs: [
        "An administrator created a TechCare account for you. You can log in now.",
        "Your administrator will give you your password.",
      ],
      details: [
        { label: "Username", value: username },
        { label: "Role", value: role },
      ],
      button: { text: "Go to TechCare", link: `${ENV.APP_URL}/login` },
      note: "If you weren't expecting this account, please tell the clinic administrator.",
    }),
  };
}

import { ENV } from "../../../config/env.js";
import { layout, type Email } from "./layout.js";

// EMPLOYEE: an admin created their account, and either
// - sent a link so the employee creates their own password (setPasswordLink), or
// - set the password themselves and will hand it over (setPasswordLink = null).
export function employeeAccountCreatedEmail(
  to: string,
  firstName: string,
  username: string,
  role: string,
  setPasswordLink: { url: string; days: number } | null,
): Email {
  const details = [
    { label: "Username", value: username },
    { label: "Role", value: role },
  ];

  if (!setPasswordLink) {
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
        details,
        button: { text: "Go to TechCare", link: `${ENV.APP_URL}/login` },
        note: "If you weren't expecting this account, please tell the clinic administrator.",
      }),
    };
  }

  return {
    to,
    subject: "Create your TechCare password",
    html: layout({
      preview: `Your TechCare ${role} account is ready. Create your password to start.`,
      heading: "Your account is ready",
      greeting: `Hi ${firstName},`,
      paragraphs: [
        "An administrator created a TechCare account for you.",
        "To start, create your password with the button below. You can log in once it's set.",
      ],
      details,
      button: { text: "Create your password", link: setPasswordLink.url },
      note: `This link works once and expires in ${setPasswordLink.days} days. If it has expired, ask the clinic administrator for a new one. If you weren't expecting this account, please tell the administrator.`,
    }),
  };
}

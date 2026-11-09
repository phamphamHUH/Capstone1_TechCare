import { ENV } from "../../config/env.js";

// =========================
// EMAIL TEMPLATES
// =========================
// Every email the system sends. Each function returns { to, subject, html }
// for sendEmail(). Values are escaped so names can't inject HTML.

export type Email = {
  to: string;
  subject: string;
  html: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Same simple look for every email (inline styles; email apps ignore <style>).
function layout(heading: string, lines: string[], buttonText: string, link: string, note: string) {
  const paragraphs = lines
    .map((line) => `<p style="margin:0 0 14px;line-height:1.5">${escapeHtml(line)}</p>`)
    .join("");

  return `
    <div style="max-width:520px;margin:0 auto;padding:28px;font-family:Arial,sans-serif;color:#111827">
      <p style="margin:0 0 18px;font-weight:bold;color:#0284c7">${escapeHtml(ENV.EMAIL_FROM_NAME)}</p>
      <h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(heading)}</h1>
      ${paragraphs}
      <p style="margin:24px 0">
        <a href="${escapeHtml(link)}" style="background:#0284c7;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">${escapeHtml(buttonText)}</a>
      </p>
      <p style="font-size:13px;color:#6b7280">If the button doesn't work, open this link: ${escapeHtml(link)}</p>
      <p style="font-size:13px;color:#6b7280">${escapeHtml(note)}</p>
    </div>`;
}

// EMPLOYEE: confirm email before the account can be used
export function employeeVerificationEmail(to: string, firstName: string, token: string): Email {
  return {
    to,
    subject: "Confirm your email to activate your TechCare account",
    html: layout(
      "Confirm your email",
      [
        `Hi ${firstName},`,
        "An administrator created a TechCare account for you. Confirm your email to activate it.",
        "Your administrator will give you your username and password.",
      ],
      "Confirm email",
      `${ENV.APP_URL}/verify-email?token=${token}`,
      "This link expires in 48 hours. If you weren't expecting this, you can ignore it.",
    ),
  };
}

// PATIENT: verify email (or a changed email) to start receiving clinic emails
export function patientVerificationEmail(
  to: string,
  firstName: string,
  token: string,
  isNewEmail: boolean,
): Email {
  return {
    to,
    subject: isNewEmail ? "Confirm your new email" : "Verify your email for Reyna G Diagnostic Clinic",
    html: layout(
      isNewEmail ? "Confirm your new email" : "Verify your email",
      [
        `Hi ${firstName},`,
        isNewEmail
          ? "Your email at the clinic was changed to this address. Confirm it to receive clinic emails here. Until then, we keep using your previous email."
          : "Confirm this is your email so the clinic can send you updates, like when your laboratory results are ready.",
        "Your patient account already works; this only turns on emails from the clinic.",
      ],
      isNewEmail ? "Confirm new email" : "Verify email",
      `${ENV.APP_URL}/verify-email?token=${token}`,
      "This link expires in 48 hours.",
    ),
  };
}

// EMPLOYEE: forgot password
export function passwordResetEmail(to: string, firstName: string, token: string): Email {
  return {
    to,
    subject: "Reset your TechCare password",
    html: layout(
      "Reset your password",
      [`Hi ${firstName},`, "We received a request to reset your TechCare password."],
      "Reset password",
      `${ENV.APP_URL}/reset-password?token=${token}`,
      "This link expires in 30 minutes and works once. If you didn't ask for this, ignore this email.",
    ),
  };
}

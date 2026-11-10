import { useEffect, useState } from "react";
import api from "../../../lib/axios";

type EmailStatus = {
  email: string;
  is_verified: boolean;
  pending_email: string | null; // new email waiting to be confirmed
};

// Yellow banner at the top of the patient portal.
// Shows while the patient's email isn't verified (no emails from the clinic)
// or while a changed email hasn't been confirmed yet. Hidden otherwise.
function EmailVerificationBanner() {
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadStatus() {
      try {
        const response = await api.get("/api/patient/email-status");
        setStatus(response.data);
      } catch (error) {
        console.error("Error loading email status:", error);
      }
    }
    loadStatus();
  }, []);

  async function resendLink() {
    try {
      const response = await api.post("/api/patient/verification-email");
      setMessage(response.data.message);
    } catch (error: unknown) {
      setMessage(
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Something went wrong",
      );
    }
  }

  if (!status) return null;
  if (status.is_verified && !status.pending_email) return null;

  return (
    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p>
        {status.pending_email
          ? `Please confirm your new email (${status.pending_email}). Until then, clinic emails still go to ${status.email}.`
          : `Your email (${status.email}) isn't verified yet, so you won't receive emails from the clinic. Your account still works normally.`}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={resendLink}
          className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold cursor-pointer hover:bg-amber-100"
        >
          Send verification link
        </button>
        {message && <span className="text-xs">{message}</span>}
      </div>
    </div>
  );
}

export default EmailVerificationBanner;

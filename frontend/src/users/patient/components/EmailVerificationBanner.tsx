import { useEffect, useState } from "react";
import api from "../../../lib/axios";
import { LoadingSpinner } from "../../../components/LoadingScreen";

type EmailStatus = {
  email: string;
  is_verified: boolean;
  pending_email: string | null; // new email waiting to be confirmed
};

// Yellow banner at the top of the patient portal.
// Shows while the patient's email isn't verified (no emails from the clinic)
// or while a changed email hasn't been confirmed yet. Hidden otherwise.
function EmailVerificationBanner({ refreshKey = 0 }: { refreshKey?: number }) {
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

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
  }, [refreshKey]);

  async function resendLink() {
    setSending(true);
    setMessage(null);
    try {
      const response = await api.post("/api/patient/verification-email");
      setMessage(response.data.message);
    } catch (error: unknown) {
      setMessage(
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Something went wrong",
      );
    } finally {
      setSending(false);
    }
  }

  if (!status) return null;
  if (status.is_verified && !status.pending_email) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="min-w-0 flex-1 basis-96 break-words">
        {status.pending_email
          ? `Please confirm your new email (${status.pending_email}). Until then, clinic emails still go to ${status.email}.`
          : `Your email (${status.email}) isn't verified yet, so you won't receive emails from the clinic. Your account still works normally.`}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={resendLink}
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium cursor-pointer hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending && <LoadingSpinner size={16} />}
          {sending ? "Sending..." : "Send verification link"}
        </button>
        {message && (
          <span role="status" className="text-sm">
            {message}
          </span>
        )}
      </div>
    </div>
  );
}

export default EmailVerificationBanner;

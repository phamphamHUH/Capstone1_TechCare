import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Loader2 } from "lucide-react";
import axios from "axios";
import api from "../lib/axios";
import AuthCard from "./components/AuthCard";

const buttonClass =
  "w-full h-11 bg-sky-700 hover:bg-sky-800 disabled:opacity-70 text-white font-medium rounded-md flex items-center justify-center gap-2 cursor-pointer";

// Opened from the link in a verification email (employees and patients).
// The user has to press the button; the page doesn't confirm on its own,
// so email scanners that open links can't confirm by accident.
function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    token ? null : "This link is incomplete. Open the link from your email again.",
  );

  async function handleConfirm() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.post("/api/auth/verify-email", { token });
      setSuccessMessage(response.data.message);
    } catch (error: unknown) {
      setErrorMessage(
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (successMessage) {
    return (
      <AuthCard title="Email confirmed">
        <p className="mb-6 rounded-md bg-green-50 px-3 py-2.5 text-sm text-green-800">
          {successMessage}
        </p>
        <Link to="/login" className={buttonClass}>
          Go to login
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Confirm your email">
      {errorMessage && (
        <p role="alert" className="mb-5 rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-800">
          {errorMessage}
        </p>
      )}

      <p className="mb-6 text-sm text-gray-700">
        Press the button below to confirm that this email address is yours.
      </p>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={loading || !token}
        className={buttonClass}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "Confirming…" : "Confirm email"}
      </button>

      <p className="mt-5 text-center text-sm">
        <Link to="/login" className="text-sky-800 hover:underline">
          Back to login
        </Link>
      </p>
    </AuthCard>
  );
}

export default VerifyEmailPage;

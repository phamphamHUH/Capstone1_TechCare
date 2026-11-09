import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { Loader2 } from "lucide-react";
import axios from "axios";
import api from "../lib/axios";
import AuthCard from "./components/AuthCard";

const inputClass =
  "h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base text-gray-900 focus:border-sky-700 focus:outline-none focus:ring-1 focus:ring-sky-700";
const buttonClass =
  "w-full h-11 bg-sky-700 hover:bg-sky-800 disabled:opacity-70 text-white font-medium rounded-md flex items-center justify-center gap-2 cursor-pointer";

// Opened from the link in the password reset email (staff only).
function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    token ? null : "This link is incomplete. Open the link from your email again.",
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("The passwords don't match.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.post("/api/auth/reset-password", { token, password });
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
      <AuthCard title="Password changed">
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
    <AuthCard title="Set a new password">
      {errorMessage && (
        <p role="alert" className="mb-5 rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-800">
          {errorMessage}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-gray-800 mb-1.5">
            New password (at least 8 characters)
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-800 mb-1.5">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <button type="submit" disabled={loading || !token} className={buttonClass}>
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Saving…" : "Change password"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm">
        <Link to="/forgot-password" className="text-sky-800 hover:underline">
          Request a new link
        </Link>
      </p>
    </AuthCard>
  );
}

export default ResetPasswordPage;

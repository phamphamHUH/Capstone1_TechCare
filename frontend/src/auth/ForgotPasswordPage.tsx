import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Loader2 } from "lucide-react";
import axios from "axios";
import api from "../lib/axios";
import AuthCard from "./components/AuthCard";

const inputClass =
  "h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base text-gray-900 focus:border-sky-700 focus:outline-none focus:ring-1 focus:ring-sky-700";
const buttonClass =
  "w-full h-11 bg-sky-700 hover:bg-sky-800 disabled:opacity-70 text-white font-medium rounded-md flex items-center justify-center gap-2 cursor-pointer";

// "Forgot password?" from the login page. For staff only;
// patients reset their password at the clinic front desk.
function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.post("/api/auth/forgot-password", { email: email.trim() });
      setSentMessage(response.data.message);
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

  return (
    <AuthCard title="Forgot password">
      {sentMessage ? (
        <p className="rounded-md bg-sky-50 px-3 py-2.5 text-sm text-sky-900">{sentMessage}</p>
      ) : (
        <>
          <p className="mb-5 text-sm text-gray-700">
            For clinic staff. Enter your work email and we'll send you a link to reset your password.
          </p>

          {errorMessage && (
            <p role="alert" className="mb-5 rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-800">
              {errorMessage}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-800 mb-1.5">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            <button type="submit" disabled={loading} className={buttonClass}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        </>
      )}

      <p className="mt-5 text-center text-sm">
        <Link to="/login" className="text-sky-800 hover:underline">
          Back to login
        </Link>
      </p>
    </AuthCard>
  );
}

export default ForgotPasswordPage;

import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import axios from "axios";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import api from "../lib/axios";
import ErrorMessage from "../components/ErrorMessage";
import LoadingScreen, { LoadingSpinner } from "../components/LoadingScreen";
import ClinicSlideshow from "./components/ClinicSlideshow";

// Same rule as the backend (utils/password.ts).
const MIN_PASSWORD_LENGTH = 8;

const inputClass =
  "h-11 w-full rounded-md border border-gray-300 bg-white px-3 pr-11 text-base text-gray-900 focus:border-sky-700 focus:outline-none focus:ring-1 focus:ring-sky-700";

type LinkInfo = {
  account_type: "user" | "patient";
  first_name: string;
  username: string;
};

const messageOf = (error: unknown, fallback: string) =>
  axios.isAxiosError(error) && typeof error.response?.data?.message === "string"
    ? error.response.data.message
    : fallback;

// Opened from the account-created email: /set-password?token=...
// Staff create their first password here; patients change the one the
// front desk gave them. The link works once.
function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [info, setInfo] = useState<LinkInfo | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function check() {
      try {
        const response = await api.post("/api/auth/password-link/check", { token });
        if (!ignore) setInfo(response.data);
      } catch (error) {
        if (!ignore) {
          setLinkError(messageOf(error, "This link is invalid or has expired."));
        }
      }
    }
    check();
    return () => {
      ignore = true;
    };
  }, [token]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setFormError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setFormError("The passwords don't match.");
      return;
    }
    setSaving(true);
    try {
      const response = await api.post("/api/auth/password-link", { token, password });
      setDoneMessage(response.data.message);
    } catch (error) {
      setFormError(messageOf(error, "The password couldn't be saved. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  const isStaff = info?.account_type === "user";
  const heading = isStaff ? "Create your password" : "Change your password";

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-gray-100 p-4 sm:p-6">
      <ClinicSlideshow />

      <main className="relative z-10 w-full max-w-md rounded-md border border-gray-200 bg-white/90 p-6 backdrop-blur-sm sm:p-8">
        <img
          src="/assets/images/reyna-g-logo.png"
          alt="Reyna G Diagnostic Laboratory"
          className="mb-4 h-16 object-contain"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />

        {!info && !linkError && <LoadingScreen message="Checking your link..." />}

        {linkError && (
          <>
            <h1 className="text-2xl font-semibold text-gray-900">Link not valid</h1>
            <ErrorMessage className="mt-4">{linkError}</ErrorMessage>
            <Link to="/login" className="mt-6 inline-block text-sm text-sky-700 hover:underline">
              Go to login
            </Link>
          </>
        )}

        {info && doneMessage && (
          <div className="text-center">
            <CheckCircle2 size={44} className="mx-auto text-green-600" />
            <h1 className="mt-3 text-2xl font-semibold text-gray-900">All set</h1>
            <p className="mt-2 text-sm text-gray-700">{doneMessage}</p>
            <Link
              to="/login"
              className="mt-6 flex h-11 w-full items-center justify-center rounded-md bg-sky-700 text-base font-medium text-white hover:bg-sky-800"
            >
              Go to login
            </Link>
          </div>
        )}

        {info && !doneMessage && (
          <>
            <h1 className="text-2xl font-semibold text-gray-900">{heading}</h1>
            <p className="mt-1 text-sm text-gray-700">
              Hi {info.first_name}.{" "}
              {isStaff
                ? "Choose the password you'll use to log in to TechCare."
                : "Choose your own password. The one from the front desk stops working after this."}
            </p>
            <p className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
              Username: <span className="font-semibold">{info.username}</span>
            </p>

            {formError && <ErrorMessage className="mt-4">{formError}</ErrorMessage>}

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              {/* Lets password managers save the username with the password. */}
              <input type="text" autoComplete="username" value={info.username} readOnly hidden />

              <div>
                <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-gray-800">
                  New password
                </label>
                <div className="relative flex items-center">
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={MIN_PASSWORD_LENGTH}
                    required
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 cursor-pointer text-gray-500 hover:text-gray-800"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">At least {MIN_PASSWORD_LENGTH} characters.</p>
              </div>

              <div>
                <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-gray-800">
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-sky-700 text-base font-medium text-white hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving && <LoadingSpinner size={16} />}
                {saving ? "Saving…" : isStaff ? "Create password" : "Change password"}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

export default SetPasswordPage;

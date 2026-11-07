import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import axios from "axios";
import api from "../lib/axios";
import ClinicSlideshow from "./components/ClinicSlideshow";
import LoginVideo from "./components/LoginVideo";

const inputClass =
  "h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base text-gray-900 focus:border-sky-700 focus:outline-none focus:ring-1 focus:ring-sky-700";

function LoginPage() {
  const [identifier, setIdentifier] = useState(
    () => localStorage.getItem("remembered_user") ?? ""
  );
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(
    () => localStorage.getItem("remembered_user") !== null
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showResetHelp, setShowResetHelp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const navigate = useNavigate();

  async function handleLogin(e: FormEvent) {
    if (e) e.preventDefault();

    if (!identifier.trim() || !password) {
      setErrorMessage("Please enter both email/username and password.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.post("/api/auth/login", {
        username: identifier.trim(),
        password,
      });

      if (response.data.message !== "Login successful") {
        setErrorMessage(response.data.message || "Invalid credentials.");
        return;
      }

      if (rememberMe) {
        localStorage.setItem("remembered_user", identifier.trim());
      } else {
        localStorage.removeItem("remembered_user");
      }

      const { token, user } = response.data;
      const role = user.role;

      sessionStorage.setItem("user", JSON.stringify(user));
      sessionStorage.setItem("token", token);
      sessionStorage.setItem("role", role);

      navigate(`/${role}`);
    } catch (error: unknown) {
      console.error("Login error:", error);

      if (axios.isAxiosError(error)) {
        setErrorMessage(
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to log in. Please check your connection or credentials."
        );
      } else {
        setErrorMessage(
          "Failed to log in. Please check your connection or credentials."
        );
      }
    } finally {
      setLoading(false);
    }
  };
  /// This is just to wake up the backend since we are using free tier hosting that sleeps on inactivity.
  useEffect(() => {
    async function wakeUpBackend() {
      try {
        await api.get("/api/auth/ping");
        console.log("Backend is awake and responding.");
      } catch (error) {
        console.error("Backend wake-up error:", error);
      }
    }
    wakeUpBackend();
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-gray-100 flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <ClinicSlideshow />

      <div className="relative z-10 w-full max-w-6xl bg-white/45 backdrop-blur-sm rounded-lg border border-gray-200 p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

        <LoginVideo />

        <div className="w-full flex items-center justify-center px-4 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">

            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Welcome back
                </h1>
                <p className="text-gray-800 text-sm mt-1">
                  Please sign in to continue.
                </p>
              </div>

              <img
                src="/assets/images/reyna-g-logo.png"
                alt="Reyna G Diagnostic Laboratory"
                className="h-20 shrink-0 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>

            {errorMessage && (
              <p
                role="alert"
                className="mb-5 rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-800"
              >
                {errorMessage}
              </p>
            )}

            <form onSubmit={handleLogin} className="space-y-5">

              <div>
                <label
                  htmlFor="login-identifier"
                  className="block text-sm font-medium text-gray-800 mb-1.5"
                >
                  Email or username
                </label>

                <input
                  id="login-identifier"
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-gray-800 mb-1.5"
                >
                  Password
                </label>

                <div className="relative flex items-center">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`${inputClass} pr-11`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-gray-500 hover:text-gray-800 cursor-pointer"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={18} strokeWidth={1.5} />
                    ) : (
                      <Eye size={18} strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-sky-700"
                    />

                    <span className="text-sm text-gray-800">Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowResetHelp((shown) => !shown)}
                    aria-expanded={showResetHelp}
                    className="text-sm text-sky-800 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                {showResetHelp && (
                  <p className="mt-2 text-sm text-gray-800">
                    Please contact the administrator or front desk to reset your
                    password.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-sky-700 hover:bg-sky-800 disabled:opacity-70 disabled:cursor-not-allowed text-white text-base font-medium rounded-md flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Signing in…" : "Log in"}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-gray-800">
              No account? Visit the front desk for registration.
            </p>

          </div>
        </div>

      </div>
    </div>
  );
}

export default LoginPage;

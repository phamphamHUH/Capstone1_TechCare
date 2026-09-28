import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import axios from "axios";
import api from "../lib/axios";
import ClinicSlideshow from "./components/ClinicSlideshow";

function LoginPage() {
  const [identifier, setIdentifier] = useState(
    () => localStorage.getItem("remembered_user") ?? ""
  );
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(
    () => localStorage.getItem("remembered_user") !== null
  );
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleLogin = async (e?: FormEvent) => {
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

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans">
      <div className="w-full max-w-6xl bg-white rounded-[32px] shadow-xl border border-gray-100 p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">

        <div className="w-full h-full flex flex-col justify-center">
          <ClinicSlideshow />
        </div>

        <div className="w-full flex items-center justify-center py-4 sm:py-8 px-4 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">

            <div className="flex flex-col items-center justify-center mb-6">
              <img
                src="/assets/reyna-g-logo.png"
                alt="Reyna G Diagnostic Laboratory"
                className="h-20 sm:h-24 object-contain mb-1"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>

            <div className="text-left mb-6">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                Welcome Back!
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Please sign in to Continue
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>

                <div className="relative flex items-center">
                  <div className="absolute left-4 text-gray-400 pointer-events-none">
                    <Mail size={20} strokeWidth={1.5} />
                  </div>

                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="lebronjames@reynag.com"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-300 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all text-sm sm:text-base"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>

                <div className="relative flex items-center">
                  <div className="absolute left-4 text-gray-400 pointer-events-none">
                    <Lock size={20} strokeWidth={1.5} />
                  </div>

                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-12 pr-12 py-3.5 bg-white border border-gray-300 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all text-sm sm:text-base"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={20} strokeWidth={1.5} />
                    ) : (
                      <Eye size={20} strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-5 h-5 rounded-md border-gray-300 text-sky-500 focus:ring-sky-400 cursor-pointer accent-sky-500"
                  />

                  <span className="text-sm font-medium text-gray-700">
                    Remember Me
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() =>
                    alert(
                      "Please contact the administrator or front desk to reset your password."
                    )
                  }
                  className="text-sm font-semibold text-gray-800 hover:text-sky-600 hover:underline transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-4 px-6 bg-[#38aef4] hover:bg-[#2fa0e4] active:bg-[#258ecf] disabled:opacity-70 text-white font-bold rounded-2xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2 text-sm tracking-wider uppercase cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>LOG IN</span>
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-xs sm:text-sm text-gray-500">
              No account? Visit the front desk for registration.
            </p>

          </div>
        </div>

      </div>
    </div>
  );
}

export default LoginPage;
import { useState } from "react";
import { useNavigate } from "react-router";
import LeftSideBackground from "./components/LeftSideBackground";
import api from "../lib/axios";
import ErrorMessage from "../components/ErrorMessage";

function SignupPage() {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const signup = async () => {
    if (submitting) return;
    setError("");
    if (!username || !password || !role) {
      setError("Please fill out all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post("/api/auth/sign-up", {
        username,
        password,
        role,
      });
      if (!response.data.user) {
        setError(
          response.data.message ||
            "Unable to create your account. Please try again.",
        );
        return;
      }
      navigate(`/${response.data.user.role}`);
    } catch {
      setError("Unable to create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <LeftSideBackground />

      {/* RIGHT SIDE */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-gray-100">
        <div className="w-105 bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl p-8 border border-white/40">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800">Create Account</h2>

            <p className="text-sm text-gray-500 mt-1">Sign up to get started</p>
          </div>

          {error && <ErrorMessage className="mb-4">{error}</ErrorMessage>}
          <div className="space-y-4">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full px-4 py-3 rounded-xl border border-gray-200
                         focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200
                         outline-none transition"
            />

            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 rounded-xl border border-gray-200
                         focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200
                         outline-none transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-sm text-indigo-500 hover:text-indigo-600"
            >
              {showPassword ? "Hide Password" : "Show Password"}
            </button>

            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200
                         focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200
                         outline-none transition bg-white"
            >
              <option value="">Select Role</option>
              <option value="doctor">Doctor</option>
              <option value="admin">Admin</option>
              <option value="patient">Patient</option>
              <option value="frontdesk-staff">Front Desk Staff</option>
              <option value="laboratory-staff">Laboratory Staff</option>
            </select>

            <button
              disabled={submitting}
              onClick={signup}
              className="w-full py-3 rounded-md font-semibold text-white
                         bg-sky-500 hover:bg-sky-600
                         active:scale-[0.98]
                         transition shadow-md"
            >
              Sign Up
            </button>
          </div>

          <p className="text-xs text-center text-gray-400 mt-5">
            Already have an account?{" "}
            <span
              className="text-indigo-500 cursor-pointer"
              onClick={() => navigate("/login")}
            >
              Login
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;

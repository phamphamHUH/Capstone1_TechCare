import { Navigate, Route, Routes } from "react-router";
import LoginPage from "./auth/LoginPage";
import SignupPage from "./auth/SignupPage";
import Admin from "./users/admin/Admin";
import Doctor from "./users/doctor/Doctor";
import FrontdeskStaff from "./users/frontdesk_staff/FrontdeskStaff";
import PatientInformation from "./users/patient/PatientInformation";
import QueueTracking from "./queue/QueueTracking";
import LaboratoryStaff from "./users/laboratory_staff/LaboratoryStaff";
import ProtectedRoute from "./lib/ProtectedRoute";
function App() {
  return (
    <div className="select-none">
      <Routes>
        <Route path="/about" element={<div>About</div>} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/sign-up" element={<SignupPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor"
          element={
            <ProtectedRoute allowedRoles={["doctor"]}>
              <Doctor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient"
          element={
            <ProtectedRoute allowedRoles={["patient"]}>
              <PatientInformation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/laboratory-staff"
          element={
            <ProtectedRoute allowedRoles={["laboratory-staff"]}>
              <LaboratoryStaff />
            </ProtectedRoute>
          }
        />
        <Route
          path="/frontdesk-staff"
          element={
            <ProtectedRoute allowedRoles={["frontdesk-staff"]}>
              <FrontdeskStaff />
            </ProtectedRoute>
          }
        />
        {/* Public-facing display, intentionally not gated */}
        <Route path="/queue-tracking" element={<QueueTracking />} />
      </Routes>
    </div>
  );
}

export default App;

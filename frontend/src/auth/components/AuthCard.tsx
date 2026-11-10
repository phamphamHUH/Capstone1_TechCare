import type { ReactNode } from "react";
import ClinicSlideshow from "./ClinicSlideshow";

type AuthCardProps = {
  title: string;
  children: ReactNode;
};

// Card used by the verify email / forgot password / reset password pages.
// Same background as the login page.
function AuthCard({ title, children }: AuthCardProps) {
  return (
    <div className="relative min-h-screen w-full bg-gray-100 flex items-center justify-center p-4">
      <ClinicSlideshow />

      <div className="relative z-10 w-full max-w-md bg-white rounded-lg border border-gray-200 p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          <img
            src="/assets/images/reyna-g-logo.png"
            alt="Reyna G Diagnostic Laboratory"
            className="h-16 shrink-0 object-contain"
          />
        </div>

        {children}
      </div>
    </div>
  );
}

export default AuthCard;

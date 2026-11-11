import { LoadingSpinner } from "./LoadingScreen";
import { RotateCw } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import NotificationBell from "./NotificationBell";

type HeaderProps = {
  page: string;
  loading: boolean;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  loadData: () => void | Promise<void>;
};

function Header({ page, loading, open, setOpen, loadData }: HeaderProps) {
  const rawRole = sessionStorage.getItem("role") ?? "";

  const role =
    rawRole === "laboratory-staff" || rawRole === "frontdesk-staff"
      ? rawRole.replace("-", " ") // "laboratorystaff" / "frontdeskstaff"
      : rawRole;

  // Queue notifications are only for doctors and laboratory staff.
  const hasNotifications = role === "doctor" || role === "laboratory-staff";

  return (
    <header className="flex items-center justify-between h-24 gap-4 mb-6 px-6 border-b border-gray-300">
      <div className="flex items-center gap-5 min-w-0">
        <button
          type="button"
          onClick={() => setOpen((previous) => !previous)}
          aria-label={open ? "Close sidebar" : "Open sidebar"}
          aria-expanded={open}
          className="text-2xl cursor-pointer hover:scale-105 active:scale-95"
        >
          ☰
        </button>

        <div className="flex flex-col min-w-0">
          <h1 className="text-lg font-semibold truncate">{page}</h1>
          <h2 className="text-sm text-gray-500 capitalize">{role}</h2>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {hasNotifications && <NotificationBell basePath="/api/notifications" />}

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
          aria-label={loading ? "Refreshing data" : "Reload data"}
          title="Reload data"
          className="flex items-center justify-center w-10 h-10 rounded-md border border-gray-300 text-gray-600 cursor-pointer transition-colors hover:bg-gray-50 hover:text-sky-600 active:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <LoadingSpinner size={18} />
          ) : (
            <RotateCw size={18} strokeWidth={1.75} />
          )}
        </button>
      </div>
    </header>
  );
}

export default Header;

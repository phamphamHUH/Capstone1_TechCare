import { LoadingSpinner } from "./LoadingScreen";
import { RotateCw } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import NotificationBell from "./NotificationBell";
import { useSidebarNav } from "./sidebar/sidebarNav";

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

  // Queue notifications: doctors and lab staff use the staff endpoint,
  // patients their own. Check rawRole: `role` above is for display only.
  const notificationsPath =
    rawRole === "patient"
      ? "/api/patient/notifications"
      : rawRole === "doctor" || rawRole === "laboratory-staff"
        ? "/api/notifications"
        : null;

  // Sidebar collapsed: its nav moves into the header (desktop only; on
  // phones the ☰ button opens the sidebar drawer instead).
  const nav = useSidebarNav();
  const showNav = !open && nav !== null;

  return (
    <header className="flex items-center justify-between h-16 sm:h-24 gap-3 sm:gap-4 mb-4 sm:mb-6 px-4 sm:px-6 border-b border-gray-300">
      <div className="flex items-center gap-3 sm:gap-5 min-w-0 lg:shrink-0">
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
          <h1 className="text-base sm:text-lg font-semibold truncate">{page}</h1>
          <h2 className="text-xs sm:text-sm text-gray-500 capitalize truncate">{role}</h2>
        </div>
      </div>

      {showNav && (
        <nav
          aria-label="Main"
          className="hidden lg:flex flex-1 min-w-0 items-center gap-1 overflow-x-auto"
        >
          {nav.navItems.map((item) => {
            const active = nav.page === item.page;
            return (
              <button
                type="button"
                key={item.page}
                onClick={() => nav.setPage(item.page)}
                aria-current={active ? "page" : undefined}
                title={item.label}
                className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap cursor-pointer transition-colors ${
                  active
                    ? "bg-sky-100 text-sky-600"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {item.icon}
                <span className="hidden lg:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      <div className="flex items-center gap-2 shrink-0">
        {notificationsPath && <NotificationBell basePath={notificationsPath} />}

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

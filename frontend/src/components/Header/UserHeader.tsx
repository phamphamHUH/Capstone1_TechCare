import { ChevronUp, LogOut, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import api from "../../lib/axios";

// Profile card shown at the bottom of the sidebar.
// Clicking it opens a small menu with the Logout button.
function UserHeader() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutStatus, setLogoutStatus] = useState("Logout");
  const menuRef = useRef<HTMLDivElement>(null);

  const storedUser = sessionStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  // Close the menu when clicking anywhere outside of it.
  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  async function handleLogout() {
    try {
      setLogoutStatus("Logging out...");

      if (user?.user_id) {
        await api.patch("/api/auth/logout", {
          user_id: user.user_id,
        });
      }
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      sessionStorage.clear();
      window.location.href = "/login";
      setLogoutStatus("Logout");
    }
  }

  if (!user) {
    return (
      <button
        onClick={() => navigate("/login")}
        className="w-full px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 cursor-pointer"
      >
        Login
      </button>
    );
  }

  const fullName = `${user.first_name} ${user.middle_name ? `${user.middle_name} ` : ""}${user.last_name}`;

  return (
    <div ref={menuRef} className="relative">
      {/* Dropdown menu (opens upward) */}
      {menuOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-700 cursor-pointer transition-colors hover:bg-red-50"
          >
            <LogOut size={18} strokeWidth={1.5} />
            <span>{logoutStatus}</span>
          </button>
        </div>
      )}

      {/* Profile card */}
      <button
        type="button"
        onClick={() => setMenuOpen((previous) => !previous)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left cursor-pointer transition-colors hover:bg-gray-100 ${
          menuOpen ? "bg-gray-100" : ""
        }`}
      >
        {user.profile_photo ? (
          <img
            src={user.profile_photo}
            alt="profile"
            className="w-10 h-10 shrink-0 rounded-full border object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="w-10 h-10 shrink-0 rounded-full border bg-gray-100 text-gray-500 flex items-center justify-center"
          >
            <UserRound size={20} strokeWidth={1.5} />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-sm font-semibold">{fullName}</p>
          <p className="truncate text-xs text-gray-500">{user.email}</p>
        </div>

        <ChevronUp
          size={18}
          strokeWidth={1.5}
          className={`shrink-0 text-gray-500 transition-transform ${
            menuOpen ? "" : "rotate-180"
          }`}
        />
      </button>
    </div>
  );
}

export default UserHeader;

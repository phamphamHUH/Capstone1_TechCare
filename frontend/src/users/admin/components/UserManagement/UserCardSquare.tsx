import { useEffect, useRef, useState } from "react";
import { AtSign, Clock, Flag, Hash, MoreHorizontal } from "lucide-react";
import type { User } from "../../../../interface/User";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  doctor: "Doctor",
  "laboratory-staff": "Laboratory Staff",
  "frontdesk-staff": "Front Desk Staff",
  patient: "Patient",
};
const roleLabel = (role: string) => ROLE_LABELS[role] ?? role;

type Props = {
  user: User;
  setSelectedUser: React.Dispatch<React.SetStateAction<User>>;
  setShowUserProfile: React.Dispatch<React.SetStateAction<boolean>>;
};

// "09:00:00" -> "9:00 AM"
function formatTime(time?: string | null) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function UserCardSquare({
  user,
  setSelectedUser,
  setShowUserProfile,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fullName = [user.first_name, user.middle_name, user.last_name, user.suffix]
    .filter(Boolean)
    .join(" ");
  const initials = `${user.first_name?.charAt(0) || ""}${user.last_name?.charAt(0) || ""}`;
  const shift =
    user.shift_start && user.shift_end
      ? `${formatTime(user.shift_start)} - ${formatTime(user.shift_end)}`
      : "—";

  const openProfile = () => {
    setSelectedUser(user);
    setShowUserProfile(true);
  };

  // Close the ... menu when clicking elsewhere
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  return (
    <div
      className="relative w-full cursor-pointer rounded-2xl border border-gray-300 bg-white p-4 shadow-sm transition hover:shadow-md"
      onClick={openProfile}
    >
      {/* Top row: status badge + menu */}
      <div className="flex items-center justify-between">
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            user.active ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              user.active ? "bg-white" : "bg-gray-400"
            }`}
          />
          {user.active ? "Active" : "Inactive"}
        </span>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-label="More options"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <MoreHorizontal size={18} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-7 z-10 w-36 overflow-hidden rounded-lg border border-gray-200 bg-white text-xs shadow-lg">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  openProfile();
                }}
                className="block w-full px-3 py-2 text-left hover:bg-gray-50"
              >
                View Profile
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  setSelectedUser(user);
                  setShowUserProfile(true);
                }}
                className="block w-full px-3 py-2 text-left hover:bg-gray-50"
              >
                Edit Details
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Avatar */}
      <div className="mt-2 flex justify-center">
        {user.profile_photo ? (
          <img
            src={user.profile_photo}
            alt={fullName}
            className="h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-200 text-2xl font-semibold text-gray-500">
            {initials}
          </div>
        )}
      </div>

      {/* Name + role */}
      <h2 className="mt-3 truncate text-center text-sm font-bold text-gray-900">
        {fullName}
      </h2>
      <p className="text-center text-xs text-gray-600">{roleLabel(user.role)}</p>

      {/* Details */}
      <div className="mt-3 space-y-1.5 rounded-lg bg-gray-100 px-3 py-2.5 text-[11px] text-gray-700">
        <p className="flex items-center gap-2">
          <Hash size={12} className="shrink-0 text-gray-500" />
          <span className="truncate">{user.user_id}</span>
        </p>
        <p className="flex items-center gap-2">
          <Flag size={12} className="shrink-0 text-gray-500" />
          <span className="truncate">{user.department || "Not assigned"}</span>
          <Clock size={12} className="ml-1 shrink-0 text-gray-500" />
          <span className="truncate">{shift}</span>
        </p>
        <p className="flex items-center gap-2">
          <AtSign size={12} className="shrink-0 text-gray-500" />
          <span className="truncate">{user.email}</span>
        </p>
      </div>
    </div>
  );
}

export default UserCardSquare;
import { AtSign, Clock, Flag, Hash } from "lucide-react";
import type { User } from "../../../../interface/User";
import UserCardMenu from "./UserCardMenu";
import { getUserDisplay, roleLabel } from "./userCardUtils";

type Props = {
  user: User;
  setSelectedUser: React.Dispatch<React.SetStateAction<User>>;
  setShowUserProfile: React.Dispatch<React.SetStateAction<boolean>>;
};

function UserCardSquare({
  user,
  setSelectedUser,
  setShowUserProfile,
}: Props) {
  const { fullName, initials, shift } = getUserDisplay(user);

  const openProfile = () => {
    setSelectedUser(user);
    setShowUserProfile(true);
  };

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

        <UserCardMenu onViewProfile={openProfile} onEditDetails={openProfile} />
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

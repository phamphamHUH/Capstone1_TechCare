import { AtSign, Clock, Flag, Hash } from "lucide-react";
import type { User } from "../../../../interface/User";
import UserCardMenu from "./UserCardMenu";
import { getUserDisplay, roleLabel } from "./userCardUtils";

type Props = {
  user: User;
  setSelectedUser: React.Dispatch<React.SetStateAction<User>>;
  setShowUserProfile: React.Dispatch<React.SetStateAction<boolean>>;
};

function UserCardRow({ user, setSelectedUser, setShowUserProfile }: Props) {
  const { fullName, initials, shift } = getUserDisplay(user);

  const openProfile = () => {
    setSelectedUser(user);
    setShowUserProfile(true);
  };

  return (
    <div
      className="flex w-full flex-wrap sm:flex-nowrap cursor-pointer items-center gap-3 sm:gap-4 rounded-md border border-gray-300 bg-white px-4 py-3 shadow-sm transition hover:shadow-md"
      onClick={openProfile}
    >
      {/* Avatar */}
      {user.profile_photo ? (
        <img
          src={user.profile_photo}
          alt={fullName}
          className="h-11 w-11 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-500">
          {initials}
        </div>
      )}

      {/* Name + role */}
      <div className="min-w-0 flex-1 sm:w-48 sm:flex-none sm:shrink-0">
        <h2 className="truncate text-sm font-bold text-gray-900">{fullName}</h2>
        <p className="truncate text-xs text-gray-600">{roleLabel(user.role)}</p>
      </div>

      {/* Details */}
      <div className="order-last basis-full sm:order-none sm:basis-auto grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-1 text-xs text-gray-700 md:grid-cols-2 xl:grid-cols-4">
        <p className="flex min-w-0 items-center gap-2">
          <Hash size={12} className="shrink-0 text-gray-500" />
          <span className="truncate">{user.user_id}</span>
        </p>
        <p className="flex min-w-0 items-center gap-2">
          <Flag size={12} className="shrink-0 text-gray-500" />
          <span className="truncate">{user.department || "Not assigned"}</span>
        </p>
        <p className="flex min-w-0 items-center gap-2">
          <Clock size={12} className="shrink-0 text-gray-500" />
          <span className="truncate">{shift}</span>
        </p>
        <p className="flex min-w-0 items-center gap-2">
          <AtSign size={12} className="shrink-0 text-gray-500" />
          <span className="truncate">{user.email}</span>
        </p>
      </div>

      {/* Status */}
      <span
        className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
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
  );
}

export default UserCardRow;

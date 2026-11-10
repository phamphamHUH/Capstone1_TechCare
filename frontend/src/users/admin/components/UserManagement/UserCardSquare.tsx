import type { User } from "../../../../interface/User";
import { Phone } from "lucide-react";

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
  const fullName = [
    user.first_name,
    user.middle_name,
    user.last_name,
    user.suffix,
  ]
    .filter(Boolean)
    .join(" ");

  const initials = `${user.first_name?.charAt(0) || ""}${
    user.last_name?.charAt(0) || ""
  }`;

  return (
    <div
      className="w-full max-w-sm rounded-3xl bg-white p-2 shadow-md cursor-pointer"
      onClick={() => {
        setSelectedUser(user);
        setShowUserProfile(true);
      }}
    >
      {/* Profile Image */}
      <div className="relative h-64 w-full overflow-hidden rounded-[1.4rem] bg-gray-100">
        {user.profile_photo ? (
          <img
            src={user.profile_photo}
            alt={fullName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-200 text-5xl font-semibold text-gray-500">
            {initials}
          </div>
        )}

        {/* Online / Active indicator */}
        <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow">
          <div
            className={`h-3 w-3 rounded-full ${
              user.active ? "bg-green-500" : "bg-gray-400"
            }`}
          />
        </div>
      </div>

      {/* Information */}
      <div className="px-3 pb-3 pt-4">
        {/* Name */}
        <h2 className="text-lg font-semibold text-gray-900">
          {fullName}
        </h2>

        {/* Role */}
        <p className="mt-1 text-sm text-gray-500">
          {user.role}
          {user.department && ` • ${user.department}`}
        </p>

        {/* User ID */}
        <p className="mt-2 line-clamp-2 text-sm leading-5 text-gray-500">
          {user.user_id}
        </p>

        {/* Email */}
        <p className="mt-2 line-clamp-2 text-sm leading-5 text-gray-500">
          {user.email}
        </p>

        {/* Stats */}
        <div className="mt-4 flex items-center gap-5 text-sm text-gray-500">
          {/* Contact */}
          <div className="flex items-center gap-1">
            <Phone className="w-4" />
            <span>{user.contact_number}</span>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-1">
            <span
              className={`h-2 w-2 rounded-full ${
                user.active ? "bg-green-500" : "bg-gray-400"
              }`}
            />

            <span>
              {user.active ? "Active" : "Not Active"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserCardSquare;
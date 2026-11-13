import { useState } from "react";
import { UserRound } from "lucide-react";
import type { AccountUser } from "../../interface/Account";
import { photoOf } from "./SidebarUserMenu/AccountSettingsModal/utils/accountFields";

type ProfileAvatarProps = {
  user: AccountUser;
  /** Overrides the saved photo, e.g. a local preview of a picked file. */
  src?: string | null;
  /** Width and height in px. */
  size: number;
  iconSize: number;
  className?: string;
};

// Round profile photo, or a person icon when there is none or the saved
// link no longer loads (instead of the browser's broken-image alt text).
function ProfileAvatar({ user, src, size, iconSize, className = "" }: ProfileAvatarProps) {
  const photo = src || photoOf(user);
  const [brokenSrc, setBrokenSrc] = useState("");
  const box = { width: size, height: size };

  if (photo && photo !== brokenSrc) {
    return (
      <img
        src={photo}
        alt="Profile"
        style={box}
        onError={() => setBrokenSrc(photo)}
        className={`shrink-0 rounded-full border border-gray-300 object-cover ${className}`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      style={box}
      className={`flex shrink-0 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-gray-500 ${className}`}
    >
      <UserRound size={iconSize} strokeWidth={1.5} />
    </div>
  );
}

export default ProfileAvatar;

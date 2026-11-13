import { useRef, useState } from "react";
import { Camera, UserRound } from "lucide-react";
import { LoadingSpinner } from "../../../LoadingScreen";
import { fullName, isPatient, photoOf, type AccountUser } from "./utils/accountFields";

const MAX_BYTES = 5 * 1024 * 1024; // same limit as the server's multer config
const TYPES = ["image/jpeg", "image/png", "image/webp"];

type ProfilePhotoProps = {
  user: AccountUser;
  /** Local preview of a picked photo that is saved when Done is pressed. */
  preview: string | null;
  uploading: boolean;
  onPick: (file: File) => void;
  onInvalid: (message: string) => void;
};

function ProfilePhoto({ user, preview, uploading, onPick, onInvalid }: ProfilePhotoProps) {
  const input = useRef<HTMLInputElement>(null);
  const photo = preview || photoOf(user);
  // A saved link that no longer loads shows the placeholder instead of alt text.
  const [brokenSrc, setBrokenSrc] = useState("");
  const broken = !!photo && brokenSrc === photo;

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!TYPES.includes(file.type)) {
      onInvalid("Choose a JPG, PNG or WEBP image.");
    } else if (file.size > MAX_BYTES) {
      onInvalid("The photo must be 5 MB or smaller.");
    } else {
      onPick(file);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-20 shrink-0">
        {photo && !broken ? (
          <img
            src={photo}
            alt="Profile"
            onError={() => setBrokenSrc(photo)}
            className="size-20 rounded-full border border-gray-300 object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex size-20 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-gray-500"
          >
            <UserRound size={36} strokeWidth={1.5} />
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white">
            <LoadingSpinner size={22} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-gray-900">{fullName(user)}</p>
        <p className="truncate text-xs text-gray-500">
          {isPatient(user) ? "Patient" : String(user.department || user.role || "")}
        </p>
        <button
          type="button"
          disabled={uploading}
          onClick={() => input.current?.click()}
          className="mt-2 inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-gray-300 px-3 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Camera size={15} strokeWidth={1.7} />
          {uploading ? "Uploading..." : "Change photo"}
        </button>
        {preview && !uploading && (
          <p className="mt-1 text-xs text-gray-500">Press Done to save the new photo.</p>
        )}
        <input
          ref={input}
          type="file"
          accept={TYPES.join(",")}
          className="hidden"
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

export default ProfilePhoto;

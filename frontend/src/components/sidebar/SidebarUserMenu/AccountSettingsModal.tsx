import { useEffect, useState } from "react";
import axios from "axios";
import { Settings } from "lucide-react";
import UniversalModal from "../../UniversalModal";
import api from "../../../lib/axios";
import { applyTheme, type Theme } from "../../../lib/theme";
import AccountDetails from "./AccountSettingsModal/AccountDetails";
import ProfilePhoto from "./AccountSettingsModal/ProfilePhoto";
import ThemePicker from "./AccountSettingsModal/ThemePicker";
import type { AccountUser } from "./AccountSettingsModal/utils/accountFields";

type AccountSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  user: AccountUser;
  onUserChange: (user: AccountUser) => void;
};

function errorText(cause: unknown, fallback: string) {
  return (axios.isAxiosError(cause) && cause.response?.data?.message) || fallback;
}

// The signed-in account's own settings: view details, change the profile
// photo and pick the UI theme (saved on the account, so it follows them).
function AccountSettingsModal({
  isOpen,
  onClose,
  user,
  onUserChange,
}: AccountSettingsModalProps) {
  const [uploading, setUploading] = useState(false);
  // A picked photo waits here (with a local preview) until Done is pressed.
  const [pendingPhoto, setPendingPhoto] = useState<{ file: File; preview: string } | null>(
    null,
  );
  const [savingTheme, setSavingTheme] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the session copy and the menu in step with the server.
  function saveUser(next: AccountUser) {
    const merged = { ...user, ...next };
    sessionStorage.setItem("user", JSON.stringify(merged));
    onUserChange(merged);
  }

  // Refresh details when opened (the login copy can be out of date).
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    api
      .get<{ user: AccountUser }>("/api/auth/me")
      .then(({ data }) => {
        if (cancelled) return;
        const merged = { ...user, ...data.user };
        sessionStorage.setItem("user", JSON.stringify(merged));
        onUserChange(merged);
      })
      .catch(() => {
        // Keep showing the details saved at login.
      });
    return () => {
      cancelled = true;
    };
    // Only on open; user/onUserChange change as a result of this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function replacePending(file: File | null) {
    if (pendingPhoto) URL.revokeObjectURL(pendingPhoto.preview);
    setPendingPhoto(file ? { file, preview: URL.createObjectURL(file) } : null);
  }

  function pickPhoto(file: File) {
    setError(null);
    replacePending(file);
  }

  async function uploadPhoto(file: File) {
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", file); // must match upload.single("image")
      const { data } = await api.patch<{ user: AccountUser }>("/api/auth/me", form);
      saveUser(data.user);
      return true;
    } catch (cause) {
      setError(errorText(cause, "The photo could not be uploaded. Please try again."));
      return false;
    } finally {
      setUploading(false);
    }
  }

  async function changeTheme(theme: Theme) {
    const previous = (user.theme as Theme | undefined) ?? "light";
    if (theme === previous) return;
    setError(null);
    applyTheme(theme);
    saveUser({ ...user, theme });
    setSavingTheme(true);
    try {
      await api.patch("/api/auth/me", { theme });
    } catch (cause) {
      applyTheme(previous);
      saveUser({ ...user, theme: previous });
      setError(errorText(cause, "The theme could not be saved. Please try again."));
    } finally {
      setSavingTheme(false);
    }
  }

  // Closing with X / overlay discards an unsaved photo.
  function close() {
    setError(null);
    replacePending(null);
    onClose();
  }

  // Done saves the picked photo (if any); stays open if the upload fails.
  async function done() {
    if (pendingPhoto && !(await uploadPhoto(pendingPhoto.file))) return;
    close();
  }

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={close}
      title="Account settings"
      description="Your account details, profile photo and display theme."
      icon={<Settings size={30} strokeWidth={1.7} />}
      error={error}
      closeOnOverlayClick
      className="max-w-[600px]"
      busy={uploading}
      actions={[{ label: "Done", onClick: done, pendingLabel: "Saving..." }]}
    >
      <div className="space-y-5">
        <ProfilePhoto
          user={user}
          preview={pendingPhoto?.preview ?? null}
          uploading={uploading}
          onPick={pickPhoto}
          onInvalid={setError}
        />

        <section aria-labelledby="account-details-heading">
          <h3
            id="account-details-heading"
            className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            Details
          </h3>
          <AccountDetails user={user} />
        </section>

        <section aria-labelledby="account-theme-heading">
          <h3
            id="account-theme-heading"
            className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            Theme
          </h3>
          <ThemePicker
            value={(user.theme as Theme | undefined) ?? "light"}
            onChange={changeTheme}
            disabled={savingTheme}
          />
        </section>
      </div>
    </UniversalModal>
  );
}

export default AccountSettingsModal;

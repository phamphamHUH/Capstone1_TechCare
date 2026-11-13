import { useEffect, useState } from "react";
import axios from "axios";
import { Settings } from "lucide-react";
import UniversalModal from "../../UniversalModal";
import api from "../../../lib/axios";
import { applyTheme, type Theme } from "../../../lib/theme";
import AccountDetails from "./AccountSettingsModal/AccountDetails";
import ProfilePhoto from "./AccountSettingsModal/ProfilePhoto";
import ThemePicker from "./AccountSettingsModal/ThemePicker";
import type { AccountUser } from "../../../interface/Account";

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
  // A picked theme is previewed right away but only saved on Done.
  const [pendingTheme, setPendingTheme] = useState<Theme | null>(null);
  const [error, setError] = useState<string | null>(null);
  const savedTheme = (user.theme as Theme | undefined) ?? "light";

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

  // Preview only: the page switches theme now, the account is updated on Done.
  function pickTheme(theme: Theme) {
    setError(null);
    applyTheme(theme);
    setPendingTheme(theme === savedTheme ? null : theme);
  }

  // Send the picked photo and/or theme in one request.
  async function saveChanges(photo: File | null, theme: Theme | null) {
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      if (photo) form.append("image", photo); // must match upload.single("image")
      if (theme) form.append("theme", theme);
      const { data } = await api.patch<{ user: AccountUser }>("/api/auth/me", form);
      saveUser(data.user);
      return true;
    } catch (cause) {
      setError(errorText(cause, "Your changes could not be saved. Please try again."));
      return false;
    } finally {
      setUploading(false);
    }
  }

  // Closing with X / overlay discards unsaved changes (the previewed theme
  // goes back to the saved one). After a successful Done, nothing reverts.
  function close(discard = true) {
    setError(null);
    replacePending(null);
    if (discard && pendingTheme) applyTheme(savedTheme);
    setPendingTheme(null);
    onClose();
  }

  // Done saves the picked photo and theme; stays open if saving fails.
  async function done() {
    if (pendingPhoto || pendingTheme) {
      const saved = await saveChanges(pendingPhoto?.file ?? null, pendingTheme);
      if (!saved) return;
    }
    close(false);
  }

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={() => close()}
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
            value={pendingTheme ?? savedTheme}
            onChange={pickTheme}
            disabled={uploading}
          />
        </section>
      </div>
    </UniversalModal>
  );
}

export default AccountSettingsModal;

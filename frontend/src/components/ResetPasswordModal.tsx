import { useState, type FormEvent } from "react";
import { X } from "lucide-react";

type ResetPasswordModalProps = {
  name: string; // whose password is being reset
  onClose: () => void;
  onSave: (password: string) => Promise<void>;
};

// Used by the admin (employees) and the front desk (patients):
// staff type the new password twice and give it to the person.
function ResetPasswordModal({ name, onClose, onSave }: ResetPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("The passwords don't match.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    await onSave(password);
    setSaving(false);
  }

  const inputClass =
    "h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-sky-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Reset password</h2>
            <p className="text-sm text-gray-500">{name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{errorMessage}</p>
        )}

        <label className="mb-1.5 block text-sm font-medium">New password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`${inputClass} mb-4`}
        />

        <label className="mb-1.5 block text-sm font-medium">Confirm new password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputClass}
        />

        <p className="mt-2 text-xs text-gray-500">At least 8 characters. Give the new password to the person directly.</p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm cursor-pointer hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white cursor-pointer hover:bg-sky-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Reset password"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ResetPasswordModal;

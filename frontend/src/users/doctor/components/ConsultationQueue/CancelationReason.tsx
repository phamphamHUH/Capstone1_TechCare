import { useState } from "react";
import UniversalModal from "../../../../components/UniversalModal";

const MAX_LENGTH = 255;
const SKIP_REASON = "Skipped 3 times without responding";
const OTHER = "Other";

const REASONS = [
  SKIP_REASON,
  "Patient left the clinic",
  "Patient asked to cancel",
  "Wrong service or doctor",
  OTHER,
];

type Props = {
  queueId: string;
  patientName?: string | null;
  // Preselects the "skipped 3 times" reason when that's why it's being cancelled
  skipsExhausted?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
};

function CancelationReason({
  queueId,
  patientName,
  skipsExhausted = false,
  onClose,
  onConfirm,
}: Props) {
  const [choice, setChoice] = useState(skipsExhausted ? SKIP_REASON : "");
  const [otherText, setOtherText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isOther = choice === OTHER;

  async function confirm() {
    const reason = isOther ? otherText.trim() : choice;

    if (!choice) {
      setError("Select a reason for cancelling.");
      return;
    }
    if (!reason) {
      setError("Describe the reason for cancelling.");
      return;
    }
    if (reason.length > MAX_LENGTH) {
      setError(`Reason must not exceed ${MAX_LENGTH} characters.`);
      return;
    }

    setError(null);
    await onConfirm(reason);
  }

  return (
    <UniversalModal
      isOpen
      type="danger"
      title="Cancel this consultation?"
      description={`${patientName || "This patient"} (${queueId}). This can't be undone.`}
      error={error}
      onClose={onClose}
      actions={[
        { label: "Keep consultation", onClick: onClose },
        {
          label: "Cancel consultation",
          variant: "danger",
          pendingLabel: "Cancelling...",
          onClick: confirm,
        },
      ]}
    >
      <fieldset className="space-y-2">
        <legend className="mb-2 text-xs font-medium text-[#5c7b9f]">
          Reason for cancelling
        </legend>

        {REASONS.map((reason) => (
          <label
            key={reason}
            className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm ${
              choice === reason
                ? "border-red-300 bg-red-50 text-[#0b4278]"
                : "border-[#dce8f6] text-[#0b4278] hover:bg-sky-50"
            }`}
          >
            <input
              type="radio"
              name="cancel-reason"
              value={reason}
              checked={choice === reason}
              onChange={() => {
                setChoice(reason);
                setError(null);
              }}
              className="h-4 w-4 accent-red-500"
            />
            {reason}
          </label>
        ))}

        {isOther && (
          <div>
            <textarea
              autoFocus
              value={otherText}
              onChange={(e) => {
                setOtherText(e.target.value);
                setError(null);
              }}
              maxLength={MAX_LENGTH}
              rows={3}
              placeholder="Describe the reason"
              className="mt-1 w-full resize-none rounded-md border border-[#dce8f6] p-2 text-sm outline-none focus:border-sky-400"
            />
            <p className="text-right text-[11px] text-gray-400">
              {otherText.length}/{MAX_LENGTH}
            </p>
          </div>
        )}
      </fieldset>
    </UniversalModal>
  );
}

export default CancelationReason;

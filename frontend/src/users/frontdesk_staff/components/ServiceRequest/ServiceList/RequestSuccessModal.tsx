import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

type RequestSuccessModalProps = {
  requestId?: string;
  serviceCount: number;
  onClose: () => void;
};

function RequestSuccessModal({
  requestId,
  serviceCount,
  onClose,
}: RequestSuccessModalProps) {
  // close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Request submitted"
      >
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-green-100 text-green-600">
          <CheckCircle2 size={32} />
        </div>

        <h2 className="text-lg font-bold">Request Submitted</h2>
        <p className="mt-1 text-sm text-gray-500">
          {serviceCount} laboratory service{serviceCount === 1 ? "" : "s"} added
          successfully.
        </p>

        {requestId && (
          <p className="mt-3 text-xs text-gray-500">
            Request ID:{" "}
            <span className="font-bold text-gray-800">{requestId}</span>
          </p>
        )}

        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="mt-5 w-full cursor-pointer rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold
                     text-white hover:bg-blue-700"
        >
          Done
        </button>
      </div>
    </div>
  );
}

export default RequestSuccessModal;

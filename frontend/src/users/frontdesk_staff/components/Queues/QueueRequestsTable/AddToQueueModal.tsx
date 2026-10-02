import { useEffect, useState } from "react";
import { X } from "lucide-react";
import api from "#lib/axios";
import type { QueueRequests } from "../../../../../interface/Queue";

type AddToQueueModalProps = {
  request: QueueRequests;
  onClose: () => void;
  onSubmitted: () => void;
};

function AddToQueueModal({
  request,
  onClose,
  onSubmitted,
}: AddToQueueModalProps) {
  const [isPriority, setIsPriority] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await api.post("/api/fdstaff/queues", {
        record_type: request.record_type,
        record_id: request.record_id,
        is_priority: isPriority,
      });
      onSubmitted();
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Failed to add to queue.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const options = [
    { value: false, label: "Regular", hint: "Standard queue order" },
    {
      value: true,
      label: "Priority",
      hint: "Senior citizen, PWD, pregnant, etc.",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Add to queue"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Add to Queue</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer text-gray-500 hover:text-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 rounded-xl bg-gray-50 p-3 text-sm">
          <p className="font-bold text-gray-800">{request.patient_name}</p>
          <p className="text-xs text-gray-500">{request.patient_id}</p>
          <p className="mt-2 text-gray-700">{request.service_name}</p>
        </div>

        <p className="mb-2 text-xs font-semibold text-gray-600">
          Is the patient a priority?
        </p>
        <div className="flex flex-col gap-2">
          {options.map((o) => (
            <label
              key={o.label}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 px-4 py-2
                         has-checked:border-sky-500 has-checked:bg-sky-50"
            >
              <div className="text-sm">
                <p className="font-bold">{o.label}</p>
                <p className="text-xs text-gray-500">{o.hint}</p>
              </div>
              <input
                type="radio"
                name="priority"
                checked={isPriority === o.value}
                onChange={() => setIsPriority(o.value)}
                className="size-4 cursor-pointer accent-sky-500"
              />
            </label>
          ))}
        </div>

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {submitting ? "Adding..." : "Add to Queue"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddToQueueModal;

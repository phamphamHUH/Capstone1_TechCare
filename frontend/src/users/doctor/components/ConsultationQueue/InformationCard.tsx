import EmptyState from "../../../../components/EmptyState";
import ErrorMessage from "../../../../components/ErrorMessage";
import LoadingScreen from "../../../../components/LoadingScreen";
import { useEffect, useState } from "react";
import { X, FileText, Info } from "lucide-react";
import api from "../../../../lib/axios";
import type { ConsultationQueueDetail } from "../../../../interface/ConsultationQueue";

type InformationCardProps = {
  onClose: () => void;
  queueIdCard: string | null;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

function InformationCard({ onClose, queueIdCard }: InformationCardProps) {
  const [detail, setDetail] = useState<ConsultationQueueDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    if (!queueIdCard) return;

    let cancelled = false;

    async function fetchDetail() {
      setDetailLoading(true);
      setDetailError("");
      setDetail(null);

      try {
        const res = await api.get<{ details: ConsultationQueueDetail }>(
          `/api/doctor/consultation-queues/${encodeURIComponent(queueIdCard!)}/details`,
        );
        if (!cancelled) setDetail(res.data.details);
      } catch (err) {
        if (cancelled) return;
        const message =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ||
          "Consultation queue details could not be loaded.";
        setDetailError(message);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }

    fetchDetail();

    return () => {
      cancelled = true;
    };
  }, [queueIdCard]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const status = detail?.queue_status?.toLowerCase();

  const patientInitials = detail
    ? detail.patient_name
        .split(/\s+/)
        .filter(Boolean)
        .filter((_, i, arr) => i === 0 || i === arr.length - 1)
        .map((w) => w.charAt(0).toUpperCase())
        .join("")
    : "";

  const noteText = detail
    ? status === "serving"
      ? `Patient is currently being served for ${detail.consultation_type} ${detail.service_name} consultation.`
      : status === "completed"
        ? `This ${detail.consultation_type} ${detail.service_name} consultation is completed.`
        : `Patient is currently waiting in queue for ${detail.consultation_type} ${detail.service_name} consultation.`
    : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex h-8/9 w-full max-w-4xl flex-col overflow-hidden rounded-md bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Consultation details"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-8 py-5">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">
              {detail ? `Consultation - ${detail.queue_id}` : "Consultation"}
            </h1>
            {detail && (
              <>
                <span
                  className={`rounded-full px-3 py-0.5 text-[11px] font-semibold ${
                    status === "serving"
                      ? "bg-green-100 text-green-700"
                      : status === "completed"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-sky-100 text-sky-700"
                  }`}
                >
                  {detail.queue_status}
                </span>
                <span
                  className={`rounded-full px-3 py-0.5 text-[11px] font-semibold ${
                    detail.is_priority
                      ? "bg-red-100 text-red-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {detail.is_priority ? "Priority" : "Non-priority"}
                </span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex items-center justify-center overflow-y-auto bg-gray-50 px-8 py-5">
          {detailError && <ErrorMessage>{detailError}</ErrorMessage>}
          {detailLoading ? (
            <LoadingScreen message="Loading consultation..." />
          ) : detail ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* PATIENT CARD */}
              <div className="rounded-md border border-gray-200 bg-white px-6 py-3">
                <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-sky-100 text-sm font-bold text-sky-600">
                    {patientInitials}
                  </div>
                  <div>
                    <h2 className="font-bold">{detail.patient_name}</h2>
                    <p className="text-xs text-gray-500">{detail.patient_id}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-gray-500">
                      Age
                    </p>
                    <p className="font-semibold">{detail.age} Yrs</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-gray-500">
                      Sex
                    </p>
                    <p className="font-semibold">{detail.sex}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-gray-500">
                      Blood Type
                    </p>
                    <p className="font-semibold">
                      {detail.blood_type ?? "Unknown"}
                    </p>
                  </div>
                </div>

                <h3 className="mt-4 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  Contact & Background
                </h3>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Contact Number</p>
                    <p className="font-semibold">{detail.contact_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Birthdate</p>
                    <p className="font-semibold">
                      {formatDate(detail.birthdate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Civil Status</p>
                    <p className="font-semibold">{detail.civil_status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Guardian</p>
                    <p className="font-semibold">
                      {detail.guardian_name ?? "N/A"}
                    </p>
                  </div>
                </div>

                <h3 className="mt-5 border-t border-gray-200 pt-4 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  Clinical Information
                </h3>
                <div className="mt-2 text-sm">
                  <div className="flex items-center justify-between border-b border-gray-200 py-1">
                    <p className="text-xs text-gray-500">Allergies</p>
                    <p className="font-semibold">
                      {detail.allergies || "None"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-200 py-1">
                    <p className="text-xs text-gray-500">Existing Conditions</p>
                    <p className="font-semibold">
                      {detail.existing_conditions || "None"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <p className="text-xs text-gray-500">Current Medications</p>
                    <p className="font-semibold">
                      {detail.current_medications || "None"}
                    </p>
                  </div>
                </div>
              </div>

              {/* QUEUE & REQUEST CARD */}
              <div className="h-fit rounded-md border border-gray-200 bg-white px-6 py-3">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-4">
                  <FileText size={16} className="text-sky-500" />
                  <h2 className="font-bold">Queue & Request Details</h2>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Request ID</p>
                    <p className="font-semibold">
                      {detail.consultation_record_id}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Type</p>
                    <p className="font-semibold">{detail.consultation_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Record Status</p>
                    <p className="font-semibold">
                      {detail.consultation_status}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Service Name</p>
                    <p className="font-semibold">{detail.service_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Category</p>
                    <p className="font-semibold">{detail.service_category}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Room</p>
                    <p className="font-semibold">{detail.room}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Queue Number</p>
                    <p className="font-semibold text-sky-600">
                      #{detail.queue_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Priority Level</p>
                    <p className="font-semibold">
                      {detail.is_priority ? "Priority" : "Non-priority"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-end justify-between border-t border-gray-200 pt-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Request Date & Time</p>
                    <p className="font-semibold">
                      {formatDateTime(detail.requested_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="mb-1 text-xs text-gray-500">Payment Status</p>
                    <span
                      className={`rounded-full px-3 py-0.5 text-[11px] font-semibold ${
                        detail.is_paid
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {detail.is_paid ? "Paid" : "Unpaid"}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex items-start gap-2 rounded-md bg-sky-50 px-4 py-3 text-xs text-sky-700">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  <p>{noteText}</p>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState message="Select a queue entry to view its details." />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-gray-100 bg-white px-8 py-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default InformationCard;

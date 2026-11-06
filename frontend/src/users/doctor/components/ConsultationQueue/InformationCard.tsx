import { useEffect, useState } from "react";
import { X, UserRound, FileText } from "lucide-react";
import api from "../../../../lib/axios";
import type { ConsultationQueueDetail } from "../../../../interface/ConsultationQueue";

type InformationCardProps = {
  onClose: () => void;
  queueIdCard: string | null;
};

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
            ?.data?.message || "Unable to fetch data.";
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

  const status = detail?.queue_status?.toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <main className="relative rounded-lg shadow-lg w-full">
        <div className="fixed flex flex-col h-full max-h-4/5 w-full max-w-3/4 rounded-lg border bg-gray-300 shadow-xl top-1/2 right-1/2 z-50 translate-x-1/2 -translate-y-1/2 overflow-hidden">
          <div className="flex justify-between items-center w-full px-8 py-6 bg-white shadow-xs">
            <div className="flex items-center gap-5">
              <h1 className="text-2xl font-semibold">
                {detail ? `Consultation - ${detail.queue_id}` : "Consultation"}
              </h1>
              {detail && (
                <>
                  <div
                    className={`border rounded-xl px-3 py-1 text-sm ${
                      status === "serving"
                        ? "text-green-600 bg-green-100 border-green-600"
                        : status === "completed"
                          ? "text-yellow-600 bg-yellow-100 border-yellow-600"
                          : "text-blue-600 bg-blue-100 border-blue-600"
                    }`}
                  >
                    {detail.queue_status}
                  </div>
                  <div
                    className={`border rounded-xl px-3 py-1 text-sm ${
                      detail.is_priority
                        ? "text-red-600 bg-red-100 border-red-600"
                        : "text-blue-600 bg-blue-100 border-blue-600"
                    }`}
                  >
                    {detail.is_priority ? "Priority" : "Non-priority"}
                  </div>
                </>
              )}
            </div>
            <button type="button" onClick={onClose} aria-label="Close">
              <X size={20} className="cursor-pointer" />
            </button>
          </div>

          <div className="w-full h-full px-5 py-3 overflow-y-auto">
            {detailLoading ? (
              <div className="rounded-xl border border-gray-200 bg-gray-100 p-4 text-sm">
                Loading consultation...
              </div>
            ) : detailError ? (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
              >
                {detailError}
              </div>
            ) : detail ? (
              <div className="flex w-full h-full gap-6">
                {/* PATIENT INFORMATION */}
                <div className="w-full h-full max-w-3/7 rounded-lg shadow-sm bg-white">
                  <div className="flex items-center shadow-xs px-3 py-2 gap-2">
                    <UserRound size={20} />
                    <h1 className="text-xl font-semibold">
                      Patient Information
                    </h1>
                  </div>
                  <div className="flex flex-col text-sm px-6 py-5 gap-3">
                    <div className="flex items-center gap-12">
                      <div>
                        <p className="font-semibold">{detail.patient_name}</p>
                        <p className="text-xs">{detail.patient_id}</p>
                      </div>
                      <div>
                        <p className="font-semibold">Age</p>
                        <p className="text-xs">{detail.age} Years Old</p>
                      </div>
                      <div>
                        <p className="font-semibold">Sex</p>
                        <p className="text-xs">{detail.sex}</p>
                      </div>
                    </div>

                    <div className="flex items-start w-full gap-2 px-1">
                      <div className="w-1/2 flex flex-col gap-3">
                        <h2 className="text-lg font-semibold">
                          Contact Information
                        </h2>
                        <div className="flex flex-col gap-2">
                          <div>
                            <p className="font-semibold">Contact Number</p>
                            <p className="text-xs">{detail.contact_number}</p>
                          </div>
                          <div>
                            <p className="font-semibold">Guardian</p>
                            <p className="text-xs">
                              {detail.guardian_name ?? "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold">Relationship</p>
                            <p className="text-xs">
                              {detail.guardian_relationship ?? "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold">Guardian Contact</p>
                            <p className="text-xs">
                              {detail.guardian_contact ?? "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="w-1/2 flex flex-col gap-3">
                        <h2 className="text-lg font-semibold">
                          Additional Information
                        </h2>
                        <div className="flex flex-col gap-2">
                          <div>
                            <p className="font-semibold">Birthdate</p>
                            <p className="text-xs">
                              {new Date(detail.birthdate).toLocaleDateString(
                                "en-PH",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold">Blood Type</p>
                            <p className="text-xs">
                              {detail.blood_type ?? "Unknown"}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold">Civil Status</p>
                            <p className="text-xs">{detail.civil_status}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col w-full px-1 gap-2">
                      <h1 className="text-lg font-semibold">
                        Clinical Information
                      </h1>
                      <div>
                        <p className="font-semibold">Allergies</p>
                        <p className="text-xs">{detail.allergies ?? "None"}</p>
                      </div>
                      <div>
                        <p className="font-semibold">Existing Conditions</p>
                        <p className="text-xs">
                          {detail.existing_conditions ?? "None"}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold">Current Medications</p>
                        <p className="text-xs">
                          {detail.current_medications ?? "None"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CONSULTATION INFORMATION */}
                <div className="w-full h-full max-w-4/7 rounded-lg flex flex-col gap-3">
                  <div className="shadow-sm bg-white">
                    <div className="flex items-center shadow-xs px-3 py-2 gap-2">
                      <FileText size={20} />
                      <h1 className="text-xl font-semibold">
                        Consultation Information
                      </h1>
                    </div>
                    <div className="grid grid-cols-3 gap-5 px-6 py-5 text-sm">
                      <div>
                        <p className="font-semibold">Consultation Record ID</p>
                        <p className="text-xs">
                          {detail.consultation_record_id}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold">Type</p>
                        <p className="text-xs">{detail.consultation_type}</p>
                      </div>
                      <div>
                        <p className="font-semibold">Record Status</p>
                        <p className="text-xs">{detail.consultation_status}</p>
                      </div>
                      <div>
                        <p className="font-semibold">Service</p>
                        <p className="text-xs">{detail.service_name}</p>
                      </div>
                      <div>
                        <p className="font-semibold">Category</p>
                        <p className="text-xs">{detail.service_category}</p>
                      </div>
                      <div>
                        <p className="font-semibold">Room</p>
                        <p className="text-xs">{detail.room}</p>
                      </div>
                      <div>
                        <p className="font-semibold">Queue Number</p>
                        <p className="text-xs">{detail.queue_number}</p>
                      </div>
                      <div>
                        <p className="font-semibold">Requested At</p>
                        <p className="text-xs">
                          {formatDateTime(detail.requested_at)}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold">Payment</p>
                        <p className="text-xs">
                          {detail.is_paid ? "Paid" : "Unpaid"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-100 p-4 text-sm text-slate-700">
                Select a queue entry to view its details.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default InformationCard;

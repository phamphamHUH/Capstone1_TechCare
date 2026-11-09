import EmptyState from "../../../../components/EmptyState";
import ErrorMessage from "../../../../components/ErrorMessage";
import LoadingScreen from "../../../../components/LoadingScreen";
import { useEffect, useState } from "react";
import { X, UserRound, FileText } from "lucide-react";
import api from "../../../../lib/axios";
import calculateAge from "../../../../utils/calculateAge";
import type { LaboratoryRequestDetail } from "../../../../interface/LabRequestDetail";

type InformationCardProps = {
  onClose: () => void;
  queueIdCard: string | null;
  room: string;
};

function InformationCard({ onClose, queueIdCard, room }: InformationCardProps) {
  const [requestDetail, setRequestDetail] =
    useState<LaboratoryRequestDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!queueIdCard) return;

    let cancelled = false;

    async function fetchLabRequestDetail() {
      setDetailLoading(true);
      setDetailError("");
      setSelectedItemId(null);
      setRequestDetail(null);

      try {
        const res = await api.get(
          `/api/labstaff/laboratory-queues/${encodeURIComponent(queueIdCard!)}/request`,
          { params: { room } },
        );
        if (!cancelled) setRequestDetail(res.data);
      } catch (err) {
        if (cancelled) return;
        const message =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ||
          "Laboratory request details could not be loaded.";
        setDetailError(message);
        setRequestDetail(null);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }

    fetchLabRequestDetail();

    return () => {
      cancelled = true;
    };
  }, [queueIdCard, room]);

  const status = requestDetail?.request.status?.toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* shadow/backdrop behind the card */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <main className="relative rounded-lg shadow-lg w-full">
        <div className="fixed flex flex-col h-full max-h-4/5 w-full max-w-3/4 rounded-lg border bg-gray-300 shadow-xl top-1/2 right-1/2 z-50 translate-x-1/2 -translate-y-1/2 overflow-hidden">
          <div className="flex justify-between items-center w-full px-8 py-6 bg-white shadow-xs">
            <div className="flex items-center gap-5">
              <h1 className="text-2xl font-semibold">
                {requestDetail
                  ? `Laboratory Request - ${requestDetail.request.request_id}`
                  : "Laboratory Request"}
              </h1>
              {requestDetail && (
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
                    {requestDetail.request.status}
                  </div>
                  <div
                    className={`border rounded-xl px-3 py-1 text-sm ${
                      requestDetail.request.is_priority
                        ? "text-red-600 bg-red-100 border-red-600"
                        : "text-blue-600 bg-blue-100 border-blue-600"
                    }`}
                  >
                    {requestDetail.request.is_priority
                      ? "Priority"
                      : "Non-priority"}
                  </div>
                </>
              )}
            </div>
            <X
              size={20}
              onClick={onClose}
              className="cursor-pointer"
              aria-label="Close"
            />
          </div>

          <div className="w-full h-full px-5 py-3 overflow-y-auto">
            {detailError && <ErrorMessage>{detailError}</ErrorMessage>}
            {detailLoading ? (
              <LoadingScreen message="Loading laboratory request..." />
            ) : requestDetail ? (
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
                    <div className="flex items-center gap-20">
                      <div>
                        <p className="font-semibold">
                          {`${requestDetail.request.last_name}, ${requestDetail.request.first_name} ${requestDetail.request.middle_name ?? ""} ${requestDetail.request.suffix ?? ""}`.trim()}
                        </p>
                        <p className="text-xs">
                          {requestDetail.request.patient_id}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold">Age</p>
                        <p className="text-xs">
                          {`${calculateAge(requestDetail.request.birthdate)} Years Old`}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold">Sex</p>
                        <p className="text-xs">{requestDetail.request.sex}</p>
                      </div>
                    </div>

                    <div className="flex items-start w-full gap-2 px-1">
                      <div className="w-1/2 flex flex-col gap-3">
                        <h2 className="text-lg font-semibold">
                          Contact Information
                        </h2>
                        <div className="flex flex-col gap-2">
                          <div>
                            <p className="font-semibold">Email</p>
                            <p className="text-xs">
                              {requestDetail.request.email}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold">Contact Number</p>
                            <p className="text-xs">
                              {requestDetail.request.contact_number}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold">Address</p>
                            <p className="text-xs">
                              {requestDetail.request.address}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold">
                              Emergency Contact Person
                            </p>
                            <p className="text-xs">
                              {requestDetail.request.emergency_contact_name ??
                                "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold">Emergency Contact</p>
                            <p className="text-xs">
                              {requestDetail.request.emergency_contact ?? "N/A"}
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
                              {requestDetail.request.birthdate}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold">Bloodtype</p>
                            <p className="text-xs">
                              {requestDetail.request.blood_type ?? "Unknown"}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold">Height</p>
                            <p className="text-xs">Height</p>
                          </div>
                          <div>
                            <p className="font-semibold">Weight</p>
                            <p className="text-xs">Weight</p>
                          </div>
                          <div>
                            <p className="font-semibold">Temperature</p>
                            <p className="text-xs">Temperature</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col w-full h-full px-1">
                      <h1 className="text-lg font-semibold">
                        Clinical Information
                      </h1>
                      <div className="flex gap-8">
                        <div>
                          <p className="font-semibold">Allergies</p>
                          <p className="text-xs">Allergy 1, Allergy 2</p>
                        </div>
                        <div>
                          <p className="font-semibold">Fasting Status</p>
                          <p className="text-xs">Good</p>
                        </div>
                        <div>
                          <p className="font-semibold">Pregnancy Status</p>
                          <p className="text-xs">Good</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* REQUEST INFORMATION */}
                <div className="w-full h-full max-w-4/7 rounded-lg flex flex-col gap-3">
                  <div className="shadow-sm bg-white">
                    <div className="flex items-center shadow-xs px-3 py-2 gap-2">
                      <FileText size={20} />
                      <h1 className="text-xl font-semibold">
                        Request Information
                      </h1>
                    </div>
                    <div className="px-6 py-5">
                      <div className="flex items-center gap-20">
                        <div>
                          <p className="font-semibold">Requested By:</p>
                          <p className="text-xs">
                            {requestDetail.request.requested_by ?? "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold">
                            Consultation Record ID
                          </p>
                          <p className="text-xs">
                            {requestDetail.request.consultation_record_id ??
                              "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold">Performed By:</p>
                          <p className="text-xs">
                            {requestDetail.items.find(
                              (i) => i.in_current_room && i.processed_by,
                            )?.processed_by ?? "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <table className="table-fixed w-full">
                      <thead>
                        <tr>
                          <th>Item ID</th>
                          <th>Service Name</th>
                          <th>Room</th>
                          <th>Status</th>
                          <th>Created At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requestDetail.items.map((item) => {
                          const disabled = !item.in_current_room;
                          const selected = selectedItemId === item.lab_item_id;

                          return (
                            <tr
                              key={item.lab_item_id}
                              aria-disabled={disabled}
                              tabIndex={disabled ? -1 : 0}
                              title={
                                disabled
                                  ? `Handled in ${item.service.room}`
                                  : undefined
                              }
                              onClick={
                                disabled
                                  ? undefined
                                  : () => setSelectedItemId(item.lab_item_id)
                              }
                              onKeyDown={
                                disabled
                                  ? undefined
                                  : (e) => {
                                      if (e.key === "Enter")
                                        setSelectedItemId(item.lab_item_id);
                                    }
                              }
                              className={
                                disabled
                                  ? "cursor-not-allowed bg-gray-50 text-gray-400 opacity-60"
                                  : `cursor-pointer hover:bg-blue-50 ${
                                      selected ? "bg-blue-100" : ""
                                    }`
                              }
                            >
                              <td className="text-xs">{item.lab_item_id}</td>
                              <td className="text-xs">
                                {item.service.service_name}
                              </td>
                              <td className="text-xs">
                                {disabled
                                  ? `${item.service.room} (other room)`
                                  : item.service.room}
                              </td>
                              <td className="text-xs">{item.status}</td>
                              <td className="text-xs">{item.created_at}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState message="Select a request to view its patient and laboratory details." />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default InformationCard;

import LoadingScreen from "../../../../components/LoadingScreen";
import { useEffect, useState } from "react";
import { X, UserRound } from "lucide-react";
import api from "../../../../lib/axios";
import type { LaboratoryRequestDetail } from "../../../../interface/LabRequestDetail";

type InformationCardProps = {
  onClose: () => void;
  queueIdCard: string | null;
};

function RequestCard({ onClose, queueIdCard }: InformationCardProps) {
  const [requestDetail, setRequestDetail] =
    useState<LaboratoryRequestDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    if (!queueIdCard) return;

    async function fetchLabRequestDetail() {
      setDetailLoading(true);
      setDetailError("");

      try {
        const labRequestDetailResponse = await api.get(
          `api/labstaff/laboratory-requests/${queueIdCard}`,
        );
        setRequestDetail(labRequestDetailResponse.data);
      } catch (err) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || "Unable to fetch data.";
        setDetailError(message);
        setRequestDetail(null);
      } finally {
        setDetailLoading(false);
      }
    }

    fetchLabRequestDetail();
  }, [queueIdCard]);

  return (
    <div className="absolute z-50 flex items-center justify-center">
      <main className="rounded-lg shadow-lg w-full max-w-lg">
        <div className=" flex flex-col h-full max-h-4/5 w-full max-w-6xl rounded-lg border bg-gray-300 shadow-xl  overflow-hidden">
          <div className="flex justify-between items-center w-full px-8 py-6 bg-white shadow-xs">
            <div className="flex items-center gap-5">
              <h1 className="text-2xl font-semibold">
                {`Laboratory Request - ${requestDetail?.request.request_id}`}
              </h1>
              <div
                className={`border rounded-xl px-3 py-1 text-sm ${
                  requestDetail?.request.status === "Serving"
                    ? "text-green-600 bg-green-100 border-green-600"
                    : requestDetail?.request.status === "Completed"
                      ? "text-yellow-600 bg-yellow-100 border-yellow-600"
                      : "text-blue-600 bg-blue-100 border-blue-600"
                } `}
              >
                {requestDetail?.request.status}
              </div>
              <div
                className={`border rounded-xl px-3 py-1 text-sm ${requestDetail?.request.is_priority ? "text-red-600 bg-red-100 border-red-600" : "text-blue-600 bg-blue-100 border-blue-600"}`}
              >
                {requestDetail?.request.is_priority
                  ? "Priority"
                  : "Non-priority"}
              </div>
            </div>
            <X size={20} onClick={onClose} className="cursor-pointer" />
          </div>
          <div className="w-full h-full px-5 py-3">
            {detailError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {detailError}
              </div>
            ) : null}
            {detailLoading ? (
              <LoadingScreen message="Loading laboratory requests..." />
            ) : requestDetail ? (
              <div className="flex w-full-h-full gap-6">
                <div className="w-full h-full max-w-1/3 rounded-lg shadow-sm bg-white ">
                  <div className="flex items-center shadow-xs px-3 py-2">
                    <UserRound size={20} />
                    <h1 className="text-lg font-semibold">
                      Patient Information
                    </h1>
                  </div>
                  <div className="flex flex-col text-sm px-4 py-3 gap-2">
                    <div>
                      <p className="font-semibold">Patient ID</p>
                      <p>{requestDetail.request.patient_id}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Patient Name</p>
                      <p>
                        {`${requestDetail.request.last_name}, ${requestDetail.request.first_name} ${requestDetail.request.middle_name} ${requestDetail.request.suffix}`}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold">Date of Birth</p>
                      <p>{requestDetail.request.birthdate}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Sex</p>
                      <p>{requestDetail.request.sex}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Blood Type</p>
                      <p>{requestDetail.request.blood_type ?? "N/A"}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Contact</p>
                      <p>{requestDetail.request.contact_number}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Email</p>
                      <p>{requestDetail.request.email}</p>
                    </div>
                  </div>
                </div>
                {/* <div className="w-2/3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h1 className="text-lg font-semibold mb-3">
                    Laboratory Request Information
                  </h1>
                  <div className="space-y-2 text-sm text-slate-700">
                    <div>
                      <p className="font-semibold">Request ID</p>
                      <p>{labRequest.request_id}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Test Type</p>
                      <p>{labRequest.test_type}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Status</p>
                      <p>{labRequest.status}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Requested At</p>
                      <p>
                        {new Date(labRequest.requested_at).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold">Doctor ID</p>
                      <p>{labRequest.doctor_id ?? "N/A"}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Results</p>
                      <p>
                        {labRequest.results
                          ? JSON.stringify(labRequest.results)
                          : "No results yet."}
                      </p>
                    </div>
                  </div>
                </div> */}
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-100 p-4 text-sm text-slate-700">
                Select a request to view its patient and laboratory details.
              </div>
            )}
          </div>
        </div>
        <div></div>
      </main>
    </div>
  );
}

export default RequestCard;

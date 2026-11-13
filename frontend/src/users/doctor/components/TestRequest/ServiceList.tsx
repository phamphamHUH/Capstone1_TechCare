import { useRef, useState } from "react";
import { Syringe, Trash2, Plus, CheckCircle2 } from "lucide-react";
import api from "#lib/axios";
import type { Service } from "../../../../interface/Service";
import ConfirmDialog from "../../../../components/ConfirmDialog";
import UniversalModal from "#components/UniversalModal";

type ServiceListProps = {
  services: Service[];
  activeTab: string;
  selectedServices: string[];
  patientId: string | null;
  // The active consultation the tests are ordered from.
  consultationRecordId: string | null;
  onToggleService: (serviceId: string) => void;
  onClearAll: () => void;
  onSubmitted?: () => void | Promise<void>;
};

function ServiceList({
  services,
  activeTab,
  selectedServices,
  patientId,
  consultationRecordId,
  onToggleService,
  onClearAll,
  onSubmitted,
}: ServiceListProps) {
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);
  const [removing, setRemoving] = useState<Service | null>(null);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    requestId?: string;
    count: number;
  } | null>(null);
  const isLabRequest = activeTab === "laboratory" || activeTab === "imaging";

  const servicesList = selectedServices
    .map((id) => services.find((service) => service.service_id === id))
    .filter((service): service is Service => service !== undefined);

  const initialTotalPrice = servicesList.reduce(
    (total, service) => total + Number(service.price),
    0,
  );

  const canSubmit = !!patientId && selectedServices.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (pending.current) return;
    if (!patientId) return setError("Please select a patient first.");
    if (selectedServices.length === 0)
      return setError("Select at least one service.");

    try {
      pending.current = true;
      setSubmitting(true);
      setError(null);

      const body =
        activeTab === "package"
          ? {
              patient_id: patientId,
              consultation_record_id: consultationRecordId,
              packages: selectedServices.map((package_id) => ({
                package_id,
              })),
            }
          : {
              patient_id: patientId,
              consultation_record_id: consultationRecordId,
              services: selectedServices.map((service_id) => ({
                service_id,
              })),
            };

      const res = await api.post("/api/doctor/test-requests", body);

      setSuccess({
        requestId: (Array.isArray(res.data.request)
          ? res.data.request[0]
          : res.data.request
        )?.request_id,
        count: selectedServices.length,
      });

      setSuccess({
        requestId: res.data.consultation_record?.consultation_record_id,
        count: 1,
      });

      onClearAll();
      void onSubmitted?.();
    } catch (err) {
      console.error("Error submitting request:", err);
      setError(
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Failed to submit request.",
      );
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  };
  return (
    <>
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between mb-5 pb-5 border-b border-gray-200">
          <h1 className="font-bold text-lg">
            {isLabRequest
              ? `Selected ${activeTab === "imaging" ? "Imaging" : "Laboratory"} Services (${servicesList.length})`
              : `Selected Packages (${servicesList.length})`}
          </h1>
          {servicesList.length > 0 && (
            <button
              type="button"
              onClick={() => setClearing(true)}
              disabled={submitting}
              className="text-xs text-blue-500 underline tracking-wider cursor-pointer transition-all
                       hover:text-blue-600 active:scale-99 active:text-blue-700"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 h-96 overflow-y-auto">
          {servicesList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 gap-1">
              <div className="p-3 rounded-md bg-blue-50 text-blue-600 mb-2">
                <Syringe size={20} />
              </div>
              <p className="text-sm font-bold">No services selected yet.</p>
              <p className="text-xs text-gray-500">
                Select your preferred services on the left to add.
              </p>
            </div>
          ) : (
            servicesList.map((service) => (
              <div
                key={service.service_id}
                className="flex items-center justify-between border border-gray-200 rounded-md px-4 py-2"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-md bg-blue-50 text-blue-600">
                    <Syringe size={20} />
                  </div>
                  <div className="text-xs">
                    <h1 className="font-bold">{service.service_name}</h1>
                    <div className="flex gap-2">
                      <h2>{service.service_category}</h2>
                      <h2>₱{service.price}</h2>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRemoving(service)}
                  disabled={submitting}
                  aria-label={`Remove ${service.service_name}`}
                  className="text-gray-500 hover:text-red-500 cursor-pointer p-1 rounded-md hover:bg-pink-100"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div
        className={`border-t mt-5 border-gray-200 py-3 flex items-center ${servicesList.length > 0 ? "justify-between" : "justify-end"}`}
      >
        {error ? (
          <p className="text-xs text-red-500">{error}</p>
        ) : initialTotalPrice > 0 ? (
          <h1 className="font-semibold">
            Initial Total Price: ₱
            {initialTotalPrice.toLocaleString("en-PH", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </h1>
        ) : null}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="text-xs font-bold cursor-pointer text-white px-3 py-2 rounded-md flex items-center justify-center
                     bg-blue-600 gap-1 hover:bg-blue-700
                     disabled:cursor-not-allowed disabled:bg-gray-300 disabled:hover:bg-gray-300"
        >
          <Plus size={15} />
          {submitting ? "Submitting..." : "Submit Request"}
        </button>
      </div>
      {removing && (
        <ConfirmDialog
          tone="warning"
          title="Remove Service?"
          confirmLabel="Remove"
          description={`Are you sure you want to remove "${removing.service_name}" from the selected services?`}
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            onToggleService(removing.service_id);
            setRemoving(null);
          }}
        />
      )}
      {clearing && (
        <ConfirmDialog
          tone="warning"
          title="Discard Changes?"
          confirmLabel="Discard Changes"
          cancelLabel="Keep Editing"
          description="Clear all selected services? This will discard the current service selection."
          onCancel={() => setClearing(false)}
          onConfirm={() => {
            onClearAll();
            setClearing(false);
          }}
        />
      )}
      {success && (
        <UniversalModal
          isOpen
          type="success"
          title="Request Submitted"
          description={
            `${success.count} ${activeTab} service${success.count === 1 ? "" : "s"} added successfully.` +
            (success.requestId ? ` Request ID: ${success.requestId}` : "")
          }
          icon={<CheckCircle2 size={36} />}
          closeOnOverlayClick
          onClose={() => setSuccess(null)}
          actions={[{ label: "Done", onClick: () => setSuccess(null) }]}
        />
      )}
    </>
  );
}

export default ServiceList;

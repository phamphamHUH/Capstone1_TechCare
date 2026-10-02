import { useState } from "react";
import { Syringe, Trash2, Plus } from "lucide-react";
import api from "#lib/axios";
import type { Service } from "../../../../interface/Service";
import RequestSuccessModal from "./ServiceList/RequestSuccessModal";

type ServiceListProps = {
  services: Service[];
  activeTab: string;
  selectedServices: string[];
  patientId: string | null;
  onToggleService: (serviceId: string) => void;
  onClearAll: () => void;
  onSubmitted?: () => void;
};

function ServiceList({
  services,
  activeTab,
  selectedServices,
  patientId,
  onToggleService,
  onClearAll,
  onSubmitted,
}: ServiceListProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    requestId?: string;
    count: number;
  } | null>(null);

  const servicesList = services.filter((service) =>
    selectedServices.includes(service.service_id),
  );

  const canSubmit = !!patientId && selectedServices.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!patientId) return setError("Please select a patient first.");
    if (selectedServices.length === 0)
      return setError("Select at least one service.");

    try {
      setSubmitting(true);
      setError(null);

      const res = await api.post("/api/fdstaff/laboratory-requests", {
        patient_id: patientId,
        services: selectedServices.map((service_id) => ({ service_id })),
      });

      setSuccess({
        requestId: res.data.request?.request_id,
        count: selectedServices.length,
      });

      onClearAll();
    } catch (err) {
      console.error("Error submitting request:", err);
      setError(
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Failed to submit request.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-5 pb-5 border-b border-gray-200">
          <h1 className="font-bold text-lg">
            {activeTab === "laboratory"
              ? `Selected Laboratory Services (${servicesList.length})`
              : "Select Consultation Service"}
          </h1>
          {servicesList.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs text-blue-500 underline tracking-wider cursor-pointer transition-all
                       hover:text-blue-600 active:scale-99 active:text-blue-700"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 max-h-85 overflow-y-scroll">
          {servicesList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 gap-1">
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 mb-2">
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
                className="flex items-center justify-between border border-gray-200 rounded-2xl px-4 py-2"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                    <Syringe size={20} />
                  </div>
                  <div className="text-xs">
                    <h2 className="font-bold">{service.service_name}</h2>
                    <p>{service.service_category}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleService(service.service_id)}
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

      <div className="border-t mt-5 border-gray-200 py-5 flex items-center justify-end gap-4">
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="text-xs font-bold cursor-pointer text-white px-3 py-2 rounded-lg flex items-center justify-center
                     bg-blue-600 gap-1 hover:bg-blue-700
                     disabled:cursor-not-allowed disabled:bg-gray-300 disabled:hover:bg-gray-300"
        >
          <Plus size={15} />
          {submitting ? "Submitting..." : "Submit Request"}
        </button>
      </div>
      {success && (
        <RequestSuccessModal
          requestId={success.requestId}
          serviceCount={success.count}
          onClose={() => {
            setSuccess(null);
            onSubmitted?.();
          }}
        />
      )}
    </>
  );
}

export default ServiceList;

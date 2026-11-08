import { useState } from "react";
import ServiceModal from "./ServicesModal";
import RoomSummaryPanel, {
  type ServiceStatusFilter,
} from "../../../../components/RoomSummaryPanel";
import type { Service } from "../../../../interface/Service";

type RequestSummaryProps = {
  services: Service[];
  room: string;
};

function RequestSummary({ services, room }: RequestSummaryProps) {
  // null = closed; otherwise the status filter the modal opens with.
  const [serviceFilter, setServiceFilter] = useState<ServiceStatusFilter | null>(null);

  return (
    <>
      <RoomSummaryPanel
        roomLabel={room}
        onViewServices={setServiceFilter}
      />

      {/* SERVICE MODAL FOR SERVICES OFFERED IN SPECIFIC ROOM */}
      {serviceFilter && (
        <ServiceModal
          services={services}
          room={room}
          initialFilter={serviceFilter}
          onClose={() => setServiceFilter(null)}
        />
      )}
    </>
  );
}

export default RequestSummary;

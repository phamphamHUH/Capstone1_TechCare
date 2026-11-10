import { useState } from "react";
import ServiceModal from "./ServiceModal";
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
        roomLabel={
          room.split("-")[0] === "LAB"
            ? `Laboratory ${room.split("-")[1]}`
            : room
        }
        onViewServices={setServiceFilter}
      />

      {/* SERVICE MODAL FOR SERVICES OFFERED IN SPECIFIC LAB ROOM */}
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

import { useState } from "react";
import ServiceModal from "./ServicesModal";
import RoomSummaryPanel from "../../../../components/RoomSummaryPanel";
import type { Queue } from "../../../../interface/Queue";
import type { Service } from "../../../../interface/Service";

type RequestSummaryProps = {
  services: Service[];
  queues: Queue[];
  room: string;
};

function RequestSummary({ services, queues, room }: RequestSummaryProps) {
  const [openServiceModal, setOpenServiceModal] = useState(false);

  return (
    <>
      <RoomSummaryPanel
        services={services}
        queues={queues}
        roomLabel={room}
        onViewServices={() => setOpenServiceModal(true)}
      />

      {/* SERVICE MODAL FOR SERVICES OFFERED IN SPECIFIC ROOM */}
      {openServiceModal && (
        <ServiceModal
          services={services}
          room={room}
          onClose={() => setOpenServiceModal(false)}
        />
      )}
    </>
  );
}

export default RequestSummary;

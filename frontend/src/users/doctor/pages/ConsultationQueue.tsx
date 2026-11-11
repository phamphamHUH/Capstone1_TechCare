import { useEffect, useState } from "react";
import RequestSummary from "../components/ConsultationQueue/RequestSummary";
import ConsultationQueuePanel from "../components/ConsultationQueue/ConsultationQueuePanel";
import type { QueueEntry } from "../../../interface/Queue";
import type { Service } from "../../../interface/Service";
import InformationCard from "../components/ConsultationQueue/InformationCard";
import { connectQueueStream } from "../../../services/queue-sse/connectQueueStream";

type ConsultationQueueProps = {
  services: Service[];
  queues: QueueEntry[];
  room: string;
  loadData: () => Promise<void>;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
  error: string | null;
  queueLoadFailed?: boolean;
  setSelectedQueue: React.Dispatch<React.SetStateAction<QueueEntry | null>>;
};

function ConsultationQueue({
  services,
  queues,
  room,
  loadData,
  loading,
  error,
  queueLoadFailed,
  setSelectedQueue,
}: ConsultationQueueProps) {
  const [openQueueAccordion, setOpenQueueAccordion] = useState<string | null>(
    null,
  );
  const [openInformationCard, setOpenInformationCard] = useState(false);
  const [queueIdCard, setQueueIdCard] = useState<string | null>(null);

  useEffect(() => {
    const closeQueueStream = connectQueueStream({
      onQueueChanged: loadData,
    });

    return closeQueueStream;
  }, [loadData]);

  return (
    <div className="px-4 sm:px-6 overflow-x-auto flex flex-col space-y-6 z-0">
      <RequestSummary services={services} room={room} />
      <ConsultationQueuePanel
        queues={queues}
        services={services}
        loading={loading}
        error={error}
        loadFailed={queueLoadFailed}
        room={room}
        loadData={loadData}
        openQueueAccordion={openQueueAccordion}
        setOpenQueueAccordion={setOpenQueueAccordion}
        setOpenInformationCard={setOpenInformationCard}
        setQueueIdCard={setQueueIdCard}
        setSelectedQueue={setSelectedQueue}
      />
      {openInformationCard && (
        <InformationCard
          onClose={() => setOpenInformationCard(false)}
          queueIdCard={queueIdCard}
        />
      )}
    </div>
  );
}

export default ConsultationQueue;

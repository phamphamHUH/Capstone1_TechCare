import Header from "../../../components/Header";
import RequestSummary from "../components/LaboratoryRequests/RequestSummary";
import LaboratoryQueuePanel from "../components/LaboratoryRequests/LaboratoryQueuePanel";
import { useEffect, useState } from "react";
import InformationCard from "../components/LaboratoryRequests/InformationCard";
import type { QueueEntry } from "../../../interface/Queue";
import type { Service } from "../../../interface/Service";
import { connectQueueStream } from "../../../services/queue-sse/connectQueueStream";

type LaboratoryRequestsProps = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  queues: QueueEntry[];
  services: Service[];
  loading: boolean;
  error: string | null;
  queueLoadFailed?: boolean;
  loadData: (background?: boolean) => Promise<void>;
  room: string;
};

function LaboratoryRequests({
  open,
  setOpen,
  queues,
  services,
  loading,
  error,
  queueLoadFailed,
  loadData,
  room,
}: LaboratoryRequestsProps) {
  const [openInformationCard, setOpenInformationCard] = useState(false);
  const [queueIdCard, setQueueIdCard] = useState<string | null>(null);
  const [openQueueAccordion, setOpenQueueAccordion] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const closeQueueStream = connectQueueStream({
      onQueueChanged: () => loadData(true),
    });

    return closeQueueStream;
  }, [loadData]);

  return (
    <main className="flex-1 min-w-0 border-gray-300">
      <Header
        page="Laboratory Requests"
        loading={loading}
        open={open}
        setOpen={setOpen}
        loadData={loadData}
      />
      <div className="px-4 sm:px-6 pb-6 flex flex-col space-y-6 z-0">
        <RequestSummary services={services} room={room} />
        <LaboratoryQueuePanel
          queues={queues}
          services={services}
          loading={loading}
          error={error}
          loadFailed={queueLoadFailed}
          setOpenQueueAccordion={setOpenQueueAccordion}
          openQueueAccordion={openQueueAccordion}
          setOpenInformationCard={setOpenInformationCard}
          setQueueIdCard={setQueueIdCard}
          room={room}
          loadData={loadData}
        />
        {openInformationCard && (
          <InformationCard
            onClose={() => setOpenInformationCard(false)}
            queueIdCard={queueIdCard}
            room={room}
          />
        )}
      </div>
    </main>
  );
}

export default LaboratoryRequests;

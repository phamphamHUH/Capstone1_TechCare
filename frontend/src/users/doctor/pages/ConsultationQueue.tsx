import Header from "#components/Header";
import React from "react";

type ConsultationQueueProps = {
  loadData: () => Promise<void>;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
};

function ConsultationQueue({
  loadData,
  open,
  setOpen,
  loading,
}: ConsultationQueueProps) {
  return (
    <main className="flex-1 min-w-0 ">
      <Header
        open={open}
        loading={loading}
        setOpen={setOpen}
        loadData={loadData}
        page="Consultation Queue"
      />
      ConsultationQueue
    </main>
  );
}

export default ConsultationQueue;

import Header from "#components/Header";
import React from "react";
import ConsultationWorkspace from "../components/Consultation/ConsultationWorkspace";

type LaboratoryRequestProps = {
  loadData: () => Promise<void>;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
};

function LaboratoryRequest({
  loadData,
  open,
  setOpen,
  loading,
}: LaboratoryRequestProps) {
  return (
    <main className="flex-1 min-w-0 ">
      <Header
        open={open}
        loading={loading}
        setOpen={setOpen}
        loadData={loadData}
        page="Laboratory Request"
      />
      <div className="p-6 md:p-8">
        <ConsultationWorkspace initialTab="laboratory-request" />
      </div>
    </main>
  );
}

export default LaboratoryRequest;

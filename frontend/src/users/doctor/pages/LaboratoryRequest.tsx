import React, { useEffect } from "react";
import ConsultationWorkspace from "../components/laboratoryRequest/ConsultationWorkspace";

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
  useEffect(() => {
      async function action() {
        await loadData();
      }
      action();
    }, [loadData]);
  return (
    <main className="flex-1 min-w-0 ">

      <div className="p-6 md:p-8">
        <ConsultationWorkspace initialTab="laboratory-request" />
      </div>
    </main>
  );
}

export default LaboratoryRequest;

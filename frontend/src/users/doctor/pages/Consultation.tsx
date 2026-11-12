import React, { useEffect } from "react";
import PrescriptionManager from "../components/laboratoryRequest/ConsultationWorkspace";

type ConsultationProps = {
  loadData: () => Promise<void>;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
};

function Consultation({
  loadData,
}: ConsultationProps) {
  useEffect(() => {
    async function action() {
      await loadData();
    }
    action();
  }, [loadData]);


  return (
    <main className="flex-1 min-w-0 bg-gray-50/50 min-h-screen overflow-y-auto">
  

      <div className="p-4 sm:p-6 md:p-8">
        <PrescriptionManager />
      </div>
    </main>
  );
}

export default Consultation;
export { Consultation as PrescriptionPage };

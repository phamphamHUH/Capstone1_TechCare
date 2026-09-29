import Header from "#components/Header";
import React from "react";
import PrescriptionManager from "../components/prescription/PrescriptionManager";

type ConsultationProps = {
  loadData: () => Promise<void>;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
};

function Consultation({
  loadData,
  open,
  setOpen,
  loading,
}: ConsultationProps) {
  return (
    <main className="flex-1 min-w-0 bg-gray-50/50 min-h-screen overflow-y-auto">
      <Header
        open={open}
        loading={loading}
        setOpen={setOpen}
        loadData={loadData}
        page="Consultation"
      />

      <div className="p-6 md:p-8">
        <PrescriptionManager />
      </div>
    </main>
  );
}

export default Consultation;
export { Consultation as PrescriptionPage };

import React from "react";
import Header from "../../../components/Header";

type MedicalHistoryProps = {
  loadData: () => Promise<void>;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
};

function MedicalHistory({
  loadData,
  open,
  setOpen,
  loading,
}: MedicalHistoryProps) {
  return (
    <main className="flex-1 min-w-0 ">
      <Header
        open={open}
        loading={loading}
        setOpen={setOpen}
        loadData={loadData}
        page="Medical History"
      />
      MedicalHistory
    </main>
  );
}

export default MedicalHistory;

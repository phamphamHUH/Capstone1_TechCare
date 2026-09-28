import Header from "#components/Header";
import React from "react";

type DigitizedDocumentProps = {
  loadData: () => Promise<void>;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
};

function DigitizedDocument({
  loadData,
  open,
  setOpen,
  loading,
}: DigitizedDocumentProps) {
  return (
    <main className="flex-1 min-w-0 ">
      <Header
        open={open}
        loading={loading}
        setOpen={setOpen}
        loadData={loadData}
        page="Digitized Document"
      />
      DigitizedDocument
    </main>
  );
}

export default DigitizedDocument;

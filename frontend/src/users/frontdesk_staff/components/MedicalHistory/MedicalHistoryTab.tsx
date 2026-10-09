import React, { useState } from "react";
import HistoryPanel from "./MedicalHistoryTab/HistoryPanel";
import VisitDetails from "./MedicalHistoryTab/VisitDetails";
import type { HistoryRecord } from "../../../../interface/HistoryRecord";

type MedicalHistoryTabProps = {
  patientId: string | null;
};

function MedicalHistoryTab({ patientId }: MedicalHistoryTabProps) {
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(
    null,
  );
  return (
    <div className="grid grid-cols-7 gap-5 px-6 mt-5 mb-5">
      <div className="col-span-5 border shadow-lg rounded-xl px-5 py-6 border-gray-200">
        <HistoryPanel
          patientId={patientId}
          setSelectedRecord={setSelectedRecord}
        />
      </div>
      <div className="col-span-2 border shadow-lg rounded-xl px-5 py-6 border-gray-200">
        <VisitDetails selectedRecord={selectedRecord} />
      </div>
    </div>
  );
}

export default MedicalHistoryTab;

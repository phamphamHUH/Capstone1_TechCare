import React, { useState } from "react";
import type { QueueEntry } from "../../../interface/Queue";
import { formatAge, formatDateTime } from "../../../utils/formats";
import calculateAge from "../../../utils/calculateAge";
import MedicalHistoryTab from "../components/ActiveConsultation/MedicalHistoryTab";
import Overview from "../components/ActiveConsultation/Overview";

type ActiveConsultationProps = {
  selectedQueue: QueueEntry | null;
};

export type ConsultationTabs =
  | "overview"
  | "medical-history"
  | "laboratory-results"
  | "file-attachments"
  | "prescription";

function ActiveConsultation({ selectedQueue }: ActiveConsultationProps) {
  const [activeTab, setActiveTab] = useState<ConsultationTabs>("overview");

  const initials = (selectedQueue?.patient_name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word, i, arr) =>
      i === 0 || i === arr.length - 1 ? word.charAt(0).toUpperCase() : "",
    )
    .join("");

  const consultationTabs: {
    id: ConsultationTabs;
    label: string;
  }[] = [
    { id: "overview", label: "Overview" },
    { id: "medical-history", label: "Medical History" },
    { id: "laboratory-results", label: "Laboratory Results" },
    { id: "file-attachments", label: "File Attachments" },
  ];

  return (
    <div className="px-6 overflow-x-auto flex flex-col space-y-6 z-0">
      {selectedQueue ? (
        <>
          {/* HEADER */}
          <section className="rounded-md border border-gray-200 bg-white p-4">
            {/* PATIENT HEADER */}
            <div className="flex justify-between">
              <div className="flex gap-5 text-xs">
                <div className="relative h-15 w-15 overflow-hidden rounded-full bg-sky-50">
                  {selectedQueue.image_url ? (
                    <img
                      src={selectedQueue.image_url}
                      alt={selectedQueue.patient_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-sky-50 text-3xl font-semibold text-gray-500">
                      {initials}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <p className="text-xl font-semibold">
                      {selectedQueue.patient_name}
                    </p>
                    <p className="text-gray-500 font-light">
                      ID: {selectedQueue.patient_id}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-gray-600">
                    <p>{selectedQueue.sex}</p>
                    <span>•</span>
                    <p>
                      {formatAge(
                        selectedQueue.birthdate,
                        calculateAge(selectedQueue.birthdate),
                      )}
                    </p>
                    <span>•</span>
                    <p>DOB: {formatDateTime(selectedQueue.birthdate)?.date}</p>
                    <span>•</span>
                    <p>{selectedQueue.contact_number}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 h-fit mt-3 text-xs">
                {selectedQueue.is_priority && (
                  <span className="rounded-full bg-orange-100 px-3 py-0.5 text-orange-700">
                    Priority
                  </span>
                )}
                {selectedQueue.is_pwd && (
                  <span className="rounded-full bg-orange-100 px-3 py-0.5 text-orange-700">
                    PWD
                  </span>
                )}
                {calculateAge(selectedQueue.birthdate) >= 60 && (
                  <span className="rounded-full bg-orange-100 px-3 py-0.5 text-orange-700">
                    Senior
                  </span>
                )}
              </div>
            </div>

            {/* QUEUE INFORMATION */}
            <div className="flex items-center gap-3 text-sm text-gray-600 mt-3 font-semibold">
              <p>{selectedQueue.queue_id}</p>
              <span>•</span>
              <p>{selectedQueue.consultation_record_id}</p>
              <span>•</span>
              <p>{selectedQueue.room}</p>
              <span>•</span>
              <p>In Consultation</p>
            </div>

            {/* CONSULTATION TABS */}
            <div className="mt-6">
              <nav className="flex gap-6">
                {consultationTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-3 text-sm font-medium transition-colors cursor-pointer border-b-2 ${
                      activeTab === tab.id
                        ? "border-sky-600 text-sky-600"
                        : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </section>
          {/* TAB CONTENT */}
          <section>
            {activeTab === "overview" && (
              <Overview
                key={selectedQueue?.consultation_record_id}
                selectedQueue={selectedQueue}
                onProceed={() => setActiveTab("prescription")}
              />
            )}
            {activeTab === "medical-history" && (
              <MedicalHistoryTab patientId={selectedQueue.patient_id} />
            )}
            {activeTab === "laboratory-results" && <div>lab</div>}
            {activeTab === "file-attachments" && <div>file</div>}
            {activeTab === "prescription" && <div>prescription</div>}
          </section>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <span className="text-2xl text-yellow-600">!</span>
          </div>

          <h3 className="text-base font-semibold text-gray-700">
            No Active Consultation
          </h3>

          <p className="mt-1 max-w-sm text-sm text-gray-500">
            There is currently no patient being served. Accept a patient from
            the consultation queue to begin a consultation.
          </p>
        </div>
      )}
    </div>
  );
}

export default ActiveConsultation;

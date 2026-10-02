import { useCallback, useState } from "react";
import { User, Phone, Home } from "lucide-react";
import type { Patient } from "../../../../interface/Patient";
import calculateAge from "../../../../utils/calculateAge";
import PatientSearchModal from "./RequestFooter/PatientSearchModal";

type RequestFooterProps = {
  patient: Patient | null;
  onSelectPatient: (patient: Patient) => void;
};

function RequestFooter({ patient, onSelectPatient }: RequestFooterProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const closeModal = useCallback(() => setModalOpen(false), []);

  const handleSelect = (p: Patient) => {
    onSelectPatient(p);
    setModalOpen(false);
  };

  const fullName = patient
    ? [patient.first_name, patient.middle_name, patient.last_name]
        .filter(Boolean)
        .join(" ")
    : "";

  const initials = `${patient?.first_name?.charAt(0) ?? ""}${
    patient?.last_name?.charAt(0) ?? ""
  }`;

  // TODO: replace with real patient fields
  const isSeniorCitizen = true;
  const isPWD = false;

  return (
    <>
      <div className="flex justify-between border mx-8 mt-5 px-5 py-3 border-gray-200 rounded-xl shadow-xl">
        {patient ? (
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-full bg-gray-100">
              {patient.image_url ? (
                <img
                  src={patient.image_url}
                  alt={fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-200 text-3xl font-semibold text-gray-500">
                  {initials}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex gap-2 items-center">
                <h1 className="font-bold text-xl">{fullName}</h1>
                {isSeniorCitizen && (
                  <h1 className="rounded-full text-xs bg-sky-100 px-3 py-0.5 text-sky-600">
                    Senior Citizen
                  </h1>
                )}
                {isPWD && (
                  <h1 className="rounded-full bg-orange-100 px-3 py-0.5 text-orange-600">
                    PWD
                  </h1>
                )}
              </div>
              <div className="flex gap-5 text-xs">
                <h1>{`${patient.patient_id} `}</h1>
                <h1>{`${patient.sex} `}</h1>
                <h1>{`${calculateAge(patient.birthdate)} years old `}</h1>
                <h1>
                  DOB:{" "}
                  {new Date(patient.birthdate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "Asia/Manila",
                  })}
                </h1>
              </div>
              <div className="flex gap-3 text-sm ">
                <div className="flex gap-1 items-center">
                  <Phone size={13} />
                  <h1>{patient.contact_number}</h1>
                </div>
                <div className="flex gap-1 items-center">
                  <Home size={15} />
                  <h1>{patient.address}</h1>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center text-sm text-gray-500">
            Please select a patient
          </div>
        )}

        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="border border-blue-300 text-blue-300 text-sm px-5 py-2 rounded-lg flex items-center gap-2 cursor-pointer transition-all
                       hover:border-blue-500 hover:text-blue-500 hover:scale-101 active:border-blue-900 active:text-blue-900 active:scale-100"
          >
            <User size={15} />
            {patient ? "Change Patient" : "Select Patient"}
          </button>
        </div>
      </div>

      {modalOpen && (
        <PatientSearchModal onClose={closeModal} onSelect={handleSelect} />
      )}
    </>
  );
}

export default RequestFooter;

import { useSearchParams } from "react-router";
import type { Patient } from "../../../../interface/Patient";
import calculateAge from "../../../../utils/calculateAge";

type PatientTableProps = {
  patients: Patient[];
  onEdit?: (patient: Patient) => void;
};

function PatientTable({ patients, onEdit }: PatientTableProps) {
  const [, setSearchParams] = useSearchParams();

  const handleViewHistory = (patientId: string) => {
    setSearchParams({
      page: "patient-medical-history",
      patient_id: patientId,
    });
  };
  return (
    <div className="max-h-105 overflow-auto bg-white">
      <table className="w-full text-sm">
        <colgroup>
          <col className="w-8/35" />
          <col className="w-5/35" />
          <col className="w-5/35" />
          <col className="w-7/35" />
          <col className="w-2/35" />
          <col className="w-4/35" />
          <col className="w-4/35" />
        </colgroup>
        <thead className="sticky top-0 z-10 text-gray-500 bg-gray-100">
          <tr className="border-b border-gray-100">
            <th className="px-4 py-2 text-left font-medium">Patient Name</th>
            <th className="px-4 py-2 text-left font-medium">Contact Details</th>
            <th className="px-4 py-2 text-left font-medium">Address</th>
            <th className="px-4 py-2 text-center font-medium">Age</th>
            <th className="px-4 py-2 text-center font-medium">Gender</th>
            <th className="px-4 py-2 text-center font-medium">
              Health Records
            </th>
            <th className="px-4 py-2 text-center font-medium">Edit Info</th>
          </tr>
        </thead>
        <tbody>
          {patients.length > 0 ? (
            patients.map((patient) => {
              const fullName = `${patient.first_name} ${patient.last_name}`;
              const age = calculateAge(patient.birthdate);
              const initials = `${patient?.first_name?.charAt(0) ?? ""}${
                patient?.last_name?.charAt(0) ?? ""
              }`;
              const birthday = patient.birthdate
                ? new Date(patient.birthdate).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    timeZone: "UTC",
                  })
                : "—";
              return (
                <tr
                  key={patient.id}
                  className="border-t border-gray-100 transition-colors hover:bg-gray-50"
                >
                  <td className="px-4 py-1 flex items-center gap-5">
                    <div className="relative h-10 w-10 overflow-hidden rounded-full bg-gray-100">
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
                    <div>
                      <div className="font-medium text-gray-900">
                        {fullName}
                      </div>
                      <div className="text-xs text-gray-400">
                        {patient.patient_id}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-1">
                    <div className="text-gray-700">
                      {patient.contact_number}
                    </div>
                    <div className="text-xs text-gray-400">{patient.email}</div>
                  </td>

                  <td className="px-4 py-1 text-gray-700">
                    <div>{patient.address}</div>
                  </td>

                  <td className="px-4 py-1 text-gray-700 text-center">
                    <div>{age} years old</div>
                    <div className="text-xs text-gray-400">{birthday}</div>
                  </td>

                  <td className="px-4 py-1 text-gray-700 text-center">
                    {patient.sex}
                  </td>

                  <td className="px-4 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleViewHistory(patient.patient_id)}
                      className="underline cursor-pointer"
                    >
                      View
                    </button>
                  </td>

                  <td className="px-4 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => onEdit?.(patient)}
                      className="underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                No patients found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default PatientTable;

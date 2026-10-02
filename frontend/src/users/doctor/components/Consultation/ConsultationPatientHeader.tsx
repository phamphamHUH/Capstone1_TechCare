import calculateAge from "../../../../utils/calculateAge";
import type { ConsultationPatient, WorkspaceTab } from "./types.ts";
import { WORKSPACE_TABS } from "./types.ts";

function formatDob(birthdate: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthdate);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(birthdate);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type Props = {
  patient: ConsultationPatient;
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
};

export default function ConsultationPatientHeader({ patient, activeTab, onTabChange }: Props) {
  const fullName = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix]
    .filter(Boolean)
    .join(" ");
  const age = calculateAge(patient.birthdate);
  const initials = `${patient.first_name.charAt(0)}${patient.last_name.charAt(0)}`.toUpperCase();
  const isSenior = !Number.isNaN(age) && age >= 60;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-xs px-6 pt-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-sky-100 text-sky-600 text-lg font-semibold flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900">{fullName}</h2>
              <span className="text-[10px] text-gray-400">ID: {patient.patient_id}</span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5 flex flex-wrap items-center gap-x-2">
              <span>
                {patient.sex}, {Number.isNaN(age) ? "—" : age} Years Old
              </span>
              <span className="text-gray-300">•</span>
              <span>DOB: {formatDob(patient.birthdate)}</span>
              <span className="text-gray-300">•</span>
              <span>{patient.contact_number}</span>
            </p>
          </div>
        </div>

        {isSenior && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold px-3 py-1 rounded-full bg-sky-100 text-sky-600">
              Senior Citizen
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-6 mt-4 overflow-x-auto" role="tablist">
        {WORKSPACE_TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(tab.key)}
              className={`pb-2.5 text-xs whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                active
                  ? "border-sky-500 text-sky-500 font-semibold"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

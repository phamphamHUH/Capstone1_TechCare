import type { ActivityTab } from "../../../../interface/Activity";

type Props = {
  activeTab: ActivityTab;
  onChange: (tab: ActivityTab) => void;
};

const TABS: { key: ActivityTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "user", label: "Staff" },
  { key: "patient", label: "Patients" },
];

function ActivityTabs({ activeTab, onChange }: Props) {
  return (
    <div className="flex gap-6 border-b border-gray-200 mb-4">
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;

        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
              isActive
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default ActivityTabs;

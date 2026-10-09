type HistoryTab =
  | "overview"
  | "medical-history"
  | "laboratory-requests"
  | "laboratory-results"
  | "files-and-attachments";

type Props = {
  activeTab: HistoryTab;
  onChange: (tab: HistoryTab) => void;
};

const TABS: { key: HistoryTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "medical-history", label: "Medical History" },
  { key: "laboratory-requests", label: "Laboratory Requests" },
  { key: "laboratory-results", label: "Laboratory Results" },
  { key: "files-and-attachments", label: "Files and Attachments" },
];

function HistoryTabs({ activeTab, onChange }: Props) {
  return (
    <div className="flex gap-2 border rounded-xl px-3 py-1 bg-white shadow-lg border-gray-200 mt-5 mx-6">
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;

        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`py-2 px-3 text-sm border-b-2 -mb-px rounded-xl transition-all cursor-pointer ${
              isActive
                ? "bg-sky-500 text-white"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default HistoryTabs;

import type { BillingTab } from "../../../../interface/Billing";
import { Clock, Receipt, type LucideIcon } from "lucide-react";

type BillingTabsProps = {
  activeTab: BillingTab;
  onChange: (tab: BillingTab) => void;
};

const TABS: { key: BillingTab; label: string; icon: LucideIcon }[] = [
  { key: "billing-queue", label: "Billing Queue", icon: Receipt },
  { key: "payment-history", label: "Payment History", icon: Clock },
];

function BillingTabs({ activeTab, onChange }: BillingTabsProps) {
  return (
    <div className="flex gap-1">
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        const Icon = tab.icon;

        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-lg border-t border-r border-l transition-colors cursor-pointer ${
              isActive
                ? "bg-blue-500 border-blue-500 text-white"
                : "border-gray-200  hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default BillingTabs;

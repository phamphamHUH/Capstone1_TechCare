import React from "react";
import { Clipboard, Syringe } from "lucide-react";

type ServiceTypeTabsProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onClearAll: () => void;
};

function ServiceTypeTabs({
  activeTab,
  setActiveTab,
  onClearAll,
}: ServiceTypeTabsProps) {
  const cards = [
    {
      service_type: "laboratory",
      mainHeading: "Laboratory Services",
      subHeading: "Request Laboratory tests and diagnosis",
      icon: Syringe,
    },
    {
      service_type: "consultation",
      mainHeading: "Consultation Services",
      subHeading: "Request Consultation or Specialist Service",
      icon: Clipboard,
    },
  ];

  return (
    <div className="flex gap-5 px-8 mt-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            className={`flex items-center border w-90 justify-center gap-5 py-3 rounded-3xl cursor-pointer shadow-md 
                      hover:text-blue-600 hover:border-blue-200 hover:scale-101 active:scale-100 active:text-blue-600 
                      ${activeTab === card.service_type ? "text-blue-400 " : "border-gray-200"}`}
            key={index}
            onClick={() => {
              onClearAll();
              setActiveTab(card.service_type);
            }}
          >
            <Icon size={25} />
            <div>
              <h1 className="text-lg font-bold">{card.mainHeading}</h1>
              <h3 className="text-sm">{card.subHeading}</h3>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ServiceTypeTabs;

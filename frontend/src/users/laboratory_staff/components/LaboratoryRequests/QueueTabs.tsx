import { type Dispatch, type SetStateAction } from "react";

export type MainFilter =
  | "all"
  | "priority"
  | "waiting"
  | "serving"
  | "completed"
  | "skipped";

type MainFilterValue = {
  label: string;
  value: MainFilter;
};

type QueueStatusTabsProps = {
  mainFilterValues: MainFilterValue[];
  activeMainFilter: MainFilter;
  mainFilterCounts: Record<string, number>;
  onClick: (value: MainFilter) => void;
  setOpenQueueAccordion: Dispatch<SetStateAction<string | null>>;
};

function QueueTabs({
  mainFilterValues,
  activeMainFilter,
  mainFilterCounts,
  onClick,
  setOpenQueueAccordion,
}: QueueStatusTabsProps) {
  return (
    <div
      role="tablist"
      className="flex w-full justify-around h-10 items-end overflow-x-auto overflow-y-hidden border-b border-gray-300"
    >
      {mainFilterValues.map((mainFilter) => {
        const isActive = activeMainFilter === mainFilter.value;

        return (
          <button
            key={mainFilter.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              onClick(mainFilter.value);
              setOpenQueueAccordion(null);
            }}
            className={`shrink-0 whitespace-nowrap px-3 sm:px-5 py-1 text-sm ${
              isActive
                ? "text-blue-600 border-b border-blue-600"
                : "text-gray-900"
            }`}
          >
            {mainFilter.label} ({mainFilterCounts[mainFilter.value] ?? 0})
          </button>
        );
      })}
    </div>
  );
}

export default QueueTabs;

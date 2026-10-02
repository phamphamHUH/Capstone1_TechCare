import { ChevronDown, Search } from "lucide-react";
import type { PriorityFilter } from "../../../../interface/Queue";

type QueueFiltersProps = {
  search: string;
  setSearch: (value: string) => void;
  serviceFilter: string;
  setServiceFilter: (value: string) => void;
  serviceOptions: string[];
  priority: PriorityFilter;
  setPriority: (value: PriorityFilter) => void;
};

function QueueFilters({
  search,
  setSearch,
  serviceFilter,
  setServiceFilter,
  serviceOptions,
  priority,
  setPriority,
}: QueueFiltersProps) {
  return (
    <div className="mb-4 flex w-full flex-wrap items-center gap-2">
      <div className="relative min-w-55 flex-1 basis-70">
        <Search
          size={17}
          strokeWidth={1.5}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="h-9 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-100"
        />
      </div>

      <label className="relative shrink-0">
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="h-9 min-w-27.5 appearance-none rounded-lg border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-600 outline-none focus:border-sky-400"
        >
          <option value="all">Module</option>
          {serviceOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
      </label>

      <label className="relative shrink-0">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as PriorityFilter)}
          className="h-9 min-w-25.5 appearance-none rounded-lg border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-600 outline-none focus:border-sky-400"
        >
          <option value="all">Priority: All</option>
          <option value="yes">Priority: Yes</option>
          <option value="none">Priority: None</option>
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
      </label>
    </div>
  );
}

export default QueueFilters;

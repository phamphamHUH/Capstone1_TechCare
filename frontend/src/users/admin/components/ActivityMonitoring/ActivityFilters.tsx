import { ChevronDown,Search } from "lucide-react";
import type { SortOrder, SeverityFilter } from "../../../../interface/Activity";

type ActivityFiltersProps = {
  search: string;
  setSearch: (value: string) => void;
  sort: SortOrder;
  setSort: (value: SortOrder) => void;
  moduleFilter: string;
  setModuleFilter: (value: string) => void;
  moduleOptions: string[];
  severity: SeverityFilter;
  setSeverity: (value: SeverityFilter) => void;
};

function ActivityFilters({
  search,
  setSearch,
  sort,
  setSort,
  moduleFilter,
  setModuleFilter,
  moduleOptions,
  severity,
  setSeverity,
}: ActivityFiltersProps) {
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
        value={sort}
        onChange={(e) => setSort(e.target.value as SortOrder)}
        className="h-9 min-w-25 appearance-none rounded-lg border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-600 outline-none focus:border-sky-400"
      >
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
      </select>
      <ChevronDown
          size={15}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
      </label>

      <label className="relative shrink-0">
      <select
        value={moduleFilter}
        onChange={(e) => setModuleFilter(e.target.value)}
        className="h-9 min-w-27.5 appearance-none rounded-lg border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-600 outline-none focus:border-sky-400"
      >
        <option value="all">Module</option>
        {moduleOptions.map((name) => (
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
        value={severity}
        onChange={(e) => setSeverity(e.target.value as SeverityFilter)}
        className="h-9 min-w-25.5 appearance-none rounded-lg border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-600 outline-none focus:border-sky-400"
      >
        <option value="all">Severity</option>
        <option value="critical">Critical</option>
        <option value="low">Low</option>
      </select>
      <ChevronDown
          size={15}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
      </label>
    </div>
  );
}

export default ActivityFilters;

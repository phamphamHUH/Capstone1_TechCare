import { ChevronDown, Search } from "lucide-react";
import type { SortOrder } from "../../../../../interface/Service";

type ServiceFiltersProps = {
  search: string;
  setSearch: (value: string) => void;
  sort: SortOrder;
  setSort: (value: SortOrder) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  categoryOptions: string[];
};

function ServiceFilters({
  search,
  setSearch,
  sort,
  setSort,
  categoryFilter,
  setCategoryFilter,
  categoryOptions,
}: ServiceFiltersProps) {
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
          <option value="a-z">Sort: A-Z</option>
          <option value="z-a">Sort: Z-A</option>
          <option value="newest">Sort: Newest</option>
          <option value="oldest">Sort: Oldest</option>
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
      </label>

      <label className="relative shrink-0">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 min-w-27.5 appearance-none rounded-lg border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-600 outline-none focus:border-sky-400"
        >
          <option value="all">Category: All</option>
          {categoryOptions.map((name) => (
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
    </div>
  );
}

export default ServiceFilters;

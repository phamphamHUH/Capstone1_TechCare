import EmptyState from "../../../../components/EmptyState";
import ServiceFilters from "./ServiceFilters";
import type { SortOrder, Service } from "../../../../interface/Service";
import { Syringe, ChevronDown, Search } from "lucide-react";

type Pagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

type ServiceSelectionPanelProps = {
  services: Service[];
  activeTab: string;
  search: string;
  setSearch: (value: string) => void;
  sort: SortOrder;
  setSort: (value: SortOrder) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  categoryOptions: string[];
  onToggleService: (serviceId: string) => void;
  selectedServices: string[];
  pagination: Pagination;
  onPageChange: (page: number) => void;
  loadFailed?: boolean;
};

function ServiceSelectionPanel({
  services,
  activeTab,
  search,
  setSearch,
  sort,
  setSort,
  categoryFilter,
  setCategoryFilter,
  categoryOptions,
  onToggleService,
  selectedServices,
  pagination,
  onPageChange,
  loadFailed,
}: ServiceSelectionPanelProps) {
  const { page, limit, total, total_pages } = pagination;

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  // up to 5 page buttons, centered on the current page
  const start = Math.max(1, Math.min(page - 2, total_pages - 4));
  const end = Math.min(total_pages, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <>
      <div>
        <h1 className="font-bold text-lg mb-3">
          {activeTab === "laboratory"
            ? "Select Laboratory Services"
            : "Select Consultation Service"}
        </h1>
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
        <h1 className="font-bold text-lg mb-3">Services</h1>

        {services.length === 0 ? (
          <EmptyState
            message={
              loadFailed ? "Services are unavailable." : "No services found."
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-2">
            {services.map((service) => (
              <label
                key={service.id}
                htmlFor={service.service_id}
                className="flex items-center justify-between border border-gray-200 px-4 py-2 rounded-2xl cursor-pointer transition-all
                hover:border-blue-300 hover:scale-101 active:scale-100 active:bg-gray-50
               has-checked:border-sky-500 has-checked:bg-sky-50 has-checked:text-blue-500"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-sky-100 rounded-xl">
                    <Syringe size={20} />
                  </div>
                  <div className="text-xs">
                    <h1 className="font-bold">{service.service_name}</h1>
                    <div className="flex gap-2">
                      <h2>{service.service_category}</h2>
                      <h2>₱{service.price}</h2>
                    </div>
                  </div>
                </div>

                <input
                  className="appearance-none size-6 rounded-md border border-gray-600 cursor-pointer
                 checked:bg-sky-200 checked:border-sky-200"
                  type="checkbox"
                  name={service.service_name}
                  id={service.service_id}
                  checked={selectedServices.includes(service.service_id)}
                  onChange={() => onToggleService(service.service_id)}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-8 text-xs text-gray-500">
        <span>
          Showing {from} - {to} of {total} services
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center
                       hover:bg-gray-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            &lt;
          </button>

          {pages.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer ${
                p === page
                  ? "bg-sky-500 text-white font-bold shadow-xs"
                  : "border border-gray-200 hover:bg-gray-100"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            disabled={page >= total_pages}
            onClick={() => onPageChange(page + 1)}
            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center
                       hover:bg-gray-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            &gt;
          </button>
        </div>
      </div>
    </>
  );
}

export default ServiceSelectionPanel;

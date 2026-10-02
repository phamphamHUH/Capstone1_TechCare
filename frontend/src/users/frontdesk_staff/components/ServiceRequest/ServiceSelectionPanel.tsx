import ServiceFilters from "./ServiceList/ServiceFilters";
import type { SortOrder, Service } from "../../../../interface/Service";
import { Syringe } from "lucide-react";

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
        <ServiceFilters
          search={search}
          setSearch={setSearch}
          sort={sort}
          setSort={setSort}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          categoryOptions={categoryOptions}
        />
        <h1 className="font-bold text-lg mb-3">Services</h1>

        {services.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">
            No services found.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-2">
            {services.map((service) => (
              <label
                key={service.id}
                htmlFor={service.service_id}
                className="flex items-center justify-between border border-gray-200 px-4 py-2 rounded-2xl cursor-pointer transition-all
                hover:border-blue-300 hover:scale-101 active:scale-100 active:bg-gray-50
               has-checked:border-sky-500 has-checked:bg-sky-50 has-checked:text-blue-600"
              >
                <div className="flex items-center gap-3">
                  <Syringe size={20} />
                  <div className="text-xs">
                    <h1 className="font-bold">{service.service_name}</h1>
                    <h2>{service.service_category}</h2>
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

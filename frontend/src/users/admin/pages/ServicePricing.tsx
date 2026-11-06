import AddService from "../components/ServicePricing/AddService";
import { PlusIcon, Search, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

type Service = {
  id: number;
  service_id: string;
  service_name: string;
  service_category: string;
  service_type: string;
  price: number;
  room: string;
  active: boolean;
};

type ServicePricingProps = {
  services: Service[];
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadData(): Promise<void>;
  loading: boolean;
};

type ServiceFilter =
  | "all"
  | "consultation"
  | "laboratory"
  | "imaging"
  | "packages";
type StatusFilter = "all" | "active" | "inactive";

const PAGE_SIZE = 15;

const labelClass = "relative w-48 shrink-0";
const selectClass =
  "h-9 w-full appearance-none rounded-sm border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-600 outline-none focus:border-sky-400";
const chevronClass =
  "pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400";

const tabClass = (selected: boolean) =>
  `flex items-center gap-2 border px-3 py-1 rounded-xl cursor-pointer ${
    selected
      ? "border-sky-500 bg-sky-500 text-white"
      : "border-gray-300 hover:bg-gray-50 text-gray-500"
  }`;

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(price);
}

function ServicePricing({ services, loadData }: ServicePricingProps) {
  const [search, setSearch] = useState("");
  const [showAddService, setShowAddService] = useState(false);
  const [servicesFilter, setServicesFilter] = useState<ServiceFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  const filteredService = services.filter((service) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      service.service_name.toLowerCase().includes(term) ||
      service.service_id.toString().toLowerCase().includes(term);

    const matchesType =
      servicesFilter === "all" ||
      service.service_type.toLowerCase() === servicesFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? service.active : !service.active);

    return matchesSearch && matchesType && matchesStatus;
  });

  const activeServicesCount = services.filter(
    (service) => service.active,
  ).length;
  const inactiveServicesCount = services.length - activeServicesCount;

  // Pagination
  const total = filteredService.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, total);
  const pageServices = filteredService.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  // Any filter change goes back to page 1.
  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const changeServicesFilter = (value: ServiceFilter) => {
    setServicesFilter(value);
    setPage(1);
  };
  const changeStatusFilter = (value: StatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="flex-1 min-w-0">
      <div className="px-6 mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Services and Packages List</h1>
          <p className="text-sm font-light">
            Manage service status, pricing and info.
          </p>
        </div>

        <button
          className="border px-4 py-3 h-fit text-sm flex items-center gap-2 font-medium text-white bg-sky-500 rounded-md cursor-pointer"
          onClick={() => setShowAddService(true)}
        >
          <span>Add Service</span>
          <PlusIcon size={20} />
        </button>
      </div>

      {showAddService && (
        <AddService
          onClose={() => setShowAddService(false)}
          loadData={loadData}
        />
      )}

      <div className="mx-6 border py-4 rounded-2xl border-gray-300">
        {/* TABS */}
        <div className="flex gap-2 px-2 mb-4 text-sm">
          <button
            type="button"
            onClick={() => changeStatusFilter("all")}
            className={tabClass(statusFilter === "all")}
          >
            All: {services.length}
          </button>

          <button
            type="button"
            onClick={() => changeStatusFilter("active")}
            className={tabClass(statusFilter === "active")}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
            Active: {activeServicesCount}
          </button>

          <button
            type="button"
            onClick={() => changeStatusFilter("inactive")}
            className={tabClass(statusFilter === "inactive")}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-gray-500" />
            Inactive: {inactiveServicesCount}
          </button>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3 px-2">
          <div className="relative min-w-60 flex-1 basis-70">
            <Search
              size={17}
              strokeWidth={1.5}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => changeSearch(e.target.value)}
              placeholder="Search by service name or ID..."
              className="h-9 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-100"
            />
          </div>

          <label className={labelClass}>
            <select
              value={servicesFilter}
              onChange={(e) =>
                changeServicesFilter(e.target.value as ServiceFilter)
              }
              className={selectClass}
            >
              <option value="all">All Service Type</option>
              <option value="consultation">Consultation</option>
              <option value="laboratory">Laboratory</option>
              <option value="imaging">Imaging</option>
              <option value="packages">Packages</option>
            </select>
            <ChevronDown size={15} className={chevronClass} />
          </label>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  ID
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Service Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Service Category
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Service Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Room
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">
                  Price
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {pageServices.map((service) => (
                <tr
                  key={service.service_id}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-gray-500">
                    {service.service_id}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {service.service_name}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {service.service_category}
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600">
                    {service.service_type}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{service.room}</td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {formatPrice(service.price)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {service.active ? "Active" : "Inactive"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <button className="border border-sky-600 px-2 py-1 rounded-md text-sky-600 cursor-pointer">
                      View/Edit
                    </button>
                  </td>
                </tr>
              ))}

              {pageServices.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    No services found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between px-4 pt-4 text-xs text-gray-500">
            <span>
              Showing {from} - {to} of {total} services
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                &lt;
              </button>

              {pages.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg ${
                    p === currentPage
                      ? "bg-sky-500 font-bold text-white shadow-xs"
                      : "border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                &gt;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ServicePricing;

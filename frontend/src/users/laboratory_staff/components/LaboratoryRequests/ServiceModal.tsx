import {
  X,
  FlaskConical,
  Layers,
  CircleCheckBig,
  CircleMinus,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Service } from "../../../../interface/Service";

type ServiceModalProps = {
  services: Service[];
  room: string;
  onClose: () => void;
  // Status filter to open with (set by clicking a number on the room summary).
  initialFilter?: "all" | "active" | "inactive";
};

const PAGE_SIZE = 10;

function ServiceModal({
  services,
  room,
  onClose,
  initialFilter = "all",
}: ServiceModalProps) {
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>(initialFilter);
  const [page, setPage] = useState(1);

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesSearch =
        service.service_name.toLowerCase().includes(search.toLowerCase()) ||
        service.service_id.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        serviceFilter === "all" ||
        (serviceFilter === "active" && service.active) ||
        (serviceFilter === "inactive" && !service.active);

      return matchesSearch && matchesStatus;
    });
  }, [services, search, serviceFilter]);

  // Pagination
  const total = filteredServices.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, total);
  const pageServices = filteredServices.slice(
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
  const changeServiceFilter = (value: string) => {
    setServiceFilter(value);
    setPage(1);
  };

  const serviceStats = [
    {
      filter: "all",
      label: "Total Services",
      count: services.length,
      icon: Layers,
      color: "text-sky-500",
    },
    {
      filter: "active",
      label: "Active Services",
      count: services.filter((service) => service.active).length,
      icon: CircleCheckBig,
      color: "text-green-500",
    },
    {
      filter: "inactive",
      label: "Inactive Services",
      count: services.filter((service) => !service.active).length,
      icon: CircleMinus,
      color: "text-slate-400",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-5/11 flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-100 p-3 mt-1">
              <FlaskConical
                size={25}
                strokeWidth={1.5}
                className="text-sky-600"
              />
            </div>

            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold ">Services List</h1>
              <p className="text-xs font-light text-gray-500">
                Manage the laboratory services available in this room.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 transition hover:text-gray-700 cursor-pointer"
          >
            <X size={21} />
          </button>
        </div>

        {/* Room information and statistics */}
        <div className="mx-6 mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-sky-100 bg-sky-50 px-5 py-4">
          <div>
            <p className="mb-1 text-xs text-gray-500">Room</p>
            <h2 className="text-lg font-bold ">{room}</h2>
          </div>

          {/* The counts are the status filter: click one to show only those services. */}
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter by status">
            {serviceStats.map((stat) => {
              const Icon = stat.icon;
              const selected = serviceFilter === stat.filter;

              return (
                <button
                  key={stat.label}
                  type="button"
                  onClick={() => changeServiceFilter(stat.filter)}
                  aria-pressed={selected}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-left cursor-pointer transition-colors ${
                    selected
                      ? "bg-white shadow-sm ring-1 ring-sky-300"
                      : "hover:bg-white/70"
                  }`}
                >
                  <Icon size={20} strokeWidth={1.8} className={stat.color} />

                  <div>
                    <p className="font-semibold text-gray-800">{stat.count}</p>
                    <p
                      className={`whitespace-nowrap text-[11px] ${
                        selected ? "font-medium text-sky-700" : "text-gray-500"
                      }`}
                    >
                      {stat.label}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="mx-6 mt-5 flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(e) => changeSearch(e.target.value)}
              placeholder="Search service name or service ID..."
              className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>
        </div>

        {/* Services table */}
        <div className="mx-6 mt-5 min-h-0 overflow-auto rounded-lg">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[20%]" />
              <col className="w-[35%]" />
              <col className="w-[30%]" />
              <col className="w-[15%]" />
            </colgroup>

            <thead className="sticky top-0 z-10 bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                  Service ID
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                  Service Name
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                  Service Category
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {pageServices.map((service) => (
                <tr
                  key={service.service_id}
                  className="border-b border-gray-100 transition hover:bg-gray-50"
                >
                  <td className="px-3 py-2 text-left text-gray-700">
                    {service.service_id}
                  </td>

                  <td className="px-3 py-2 text-left font-medium text-gray-800">
                    {service.service_name}
                  </td>

                  <td className="px-3 py-2 text-left font-medium text-gray-800">
                    {service.service_category}
                  </td>

                  <td className="px-3 py-2 text-left">
                    <span
                      className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                        service.active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {service.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}

              {pageServices.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-gray-400"
                  >
                    No services found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mb-6 mt-3 px-6">
          {total > 0 && (
            <div className="flex items-center justify-between text-xs text-gray-500">
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
    </div>
  );
}

export default ServiceModal;

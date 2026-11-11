import EmptyState from "../../../../components/EmptyState";
import { useMemo, useState } from "react";
import type { ServiceCatalogItem } from "../../../../interface/Analytics";
import {
  formatDateTime,
  formatNumber,
  formatPeso,
  serviceTypeColor,
  serviceTypeLabel,
} from "./utils/formatters";

type CatalogFilter = "all" | "consultation" | "laboratory" | "unused" | "inactive";

const FILTERS: { value: CatalogFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "consultation", label: "Consultation" },
  { value: "laboratory", label: "Laboratory" },
  { value: "unused", label: "No orders" },
  { value: "inactive", label: "Inactive" },
];

// Header cells stay visible while the table body scrolls. The bottom line is
// drawn with a shadow because borders don't stick with the header.
const headCell =
  "sticky top-0 z-10 bg-white py-3 font-medium shadow-[inset_0_-1px_0_var(--color-gray-200)]";

type ServiceCatalogTableProps = {
  services: ServiceCatalogItem[];
};

// Every service with its price, status and how often it was ordered.
function ServiceCatalogTable({ services }: ServiceCatalogTableProps) {
  const [filter, setFilter] = useState<CatalogFilter>("all");

  const visible = useMemo(
    () =>
      services.filter((service) => {
        if (filter === "consultation" || filter === "laboratory")
          return service.service_type === filter;
        if (filter === "unused") return service.active && service.orders === 0;
        if (filter === "inactive") return !service.active;
        return true;
      }),
    [services, filter],
  );

  const maxOrders = Math.max(0, ...services.map((service) => service.orders));

  return (
    <div>
      <div className="flex flex-wrap gap-2 px-6 pb-4">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            aria-pressed={filter === option.value}
            className={`rounded-full border px-3 py-1 text-xs font-medium cursor-pointer transition-colors ${
              filter === option.value
                ? "border-sky-500 bg-sky-50 text-sky-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* The list scrolls inside the panel instead of making the page longer. */}
      <div className="max-h-112 overflow-auto border-t border-gray-200">
        <table className="min-w-[640px] w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className={`${headCell} px-6`}>Service</th>
              <th className={`${headCell} px-3`}>Room</th>
              <th className={`${headCell} px-3 text-right`}>Price</th>
              <th className={`${headCell} px-3`}>Status</th>
              <th className={`${headCell} w-1/4 min-w-36 px-3`}>Orders</th>
              <th className={`${headCell} px-6`}>Last ordered</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4"><EmptyState compact message="No services match this filter." /></td>
              </tr>
            ) : (
              visible.map((service) => (
                <tr key={service.service_id} className="border-b border-gray-100 last:border-0">
                  <td className="px-6 py-3">
                    <p className="font-medium text-gray-900">{service.service_name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: serviceTypeColor(service.service_type) }}
                      />
                      {serviceTypeLabel(service.service_type)}
                      {service.service_category && <> · {service.service_category}</>}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-gray-600">{service.room}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-gray-900">
                    {formatPeso(service.price)}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                        service.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {service.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 text-right tabular-nums text-gray-900">
                        {formatNumber(service.orders)}
                      </span>
                      <div className="h-2 flex-1 rounded bg-gray-100">
                        <div
                          className="h-full rounded"
                          style={{
                            width: `${maxOrders > 0 ? (service.orders / maxOrders) * 100 : 0}%`,
                            backgroundColor: serviceTypeColor(service.service_type),
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-gray-500">
                    {formatDateTime(service.last_ordered_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="border-t border-gray-200 px-6 py-3 text-xs text-gray-400">
        Showing {visible.length} of {services.length} services
      </p>
    </div>
  );
}

export default ServiceCatalogTable;

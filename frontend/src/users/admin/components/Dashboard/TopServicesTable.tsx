import EmptyState from "../../../../components/EmptyState";
import type { SalesByService } from "../../../../interface/Analytics";
import {
  formatNumber,
  formatPeso,
  serviceTypeColor,
  serviceTypeLabel,
} from "./formatters";

type TopServicesTableProps = {
  services: SalesByService[];
};

// Header cells stay visible while the table body scrolls. The bottom line is
// drawn with a shadow because borders don't stick with the header.
const headCell =
  "sticky top-0 z-10 bg-white py-3 font-medium shadow-[inset_0_-1px_0_var(--color-gray-200)]";

// Services sold, ranked by revenue, with a share-of-sales bar.
// The list scrolls inside the panel instead of making the page longer.
function TopServicesTable({ services }: TopServicesTableProps) {
  const total = services.reduce((sum, service) => sum + service.revenue, 0);
  const max = Math.max(0, ...services.map((service) => service.revenue));

  if (services.length === 0) {
    return <EmptyState message="No services sold in this period." />;
  }

  return (
    <div>
      <div className="max-h-96 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className={`${headCell} w-10 pl-6 pr-2 text-right`}>#</th>
              <th className={`${headCell} px-3`}>Service</th>
              <th className={`${headCell} px-3 text-right`}>Sold</th>
              <th className={`${headCell} px-3 text-right`}>Revenue</th>
              <th className={`${headCell} w-1/3 min-w-36 px-6`}>Share of sales</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service, index) => {
              const percent = total > 0 ? (service.revenue / total) * 100 : 0;

              return (
                <tr key={`${service.service_id}-${service.service_name}`} className="border-b border-gray-100 last:border-0">
                  <td className="pl-6 pr-2 py-3 text-right tabular-nums text-gray-400">{index + 1}</td>
                  <td className="px-3 py-3">
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
                  <td className="px-3 py-3 text-right tabular-nums text-gray-700">
                    {formatNumber(service.quantity)}
                  </td>
                  <td className="px-3 py-3 text-right font-medium tabular-nums text-gray-900">
                    {formatPeso(service.revenue)}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded bg-gray-100">
                        <div
                          className="h-full rounded"
                          style={{
                            width: `${max > 0 ? (service.revenue / max) * 100 : 0}%`,
                            backgroundColor: serviceTypeColor(service.service_type),
                          }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs tabular-nums text-gray-500">
                        {percent.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="border-t border-gray-200 px-6 py-3 text-xs text-gray-400">
        {services.length} {services.length === 1 ? "service" : "services"} sold
      </p>
    </div>
  );
}

export default TopServicesTable;

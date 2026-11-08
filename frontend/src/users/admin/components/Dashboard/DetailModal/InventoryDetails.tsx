import type { ServiceAnalytics, ServiceCatalogItem } from "../../../../../interface/Analytics";
import { BarList, DataTable, FigureRow, SectionTitle, type Column } from "./DetailParts";
import {
  formatDateTime,
  formatNumber,
  formatPeso,
  serviceTypeColor,
  serviceTypeLabel,
} from "../formatters";

export type InventoryDetailKind = "active" | "inactive" | "average-price" | "orders" | "not-ordered";

type InventoryDetailsProps = {
  kind: InventoryDetailKind;
  analytics: ServiceAnalytics;
};

const TYPES = ["consultation", "laboratory"];

const serviceCell = (service: ServiceCatalogItem) => (
  <>
    <p className="font-medium text-gray-900">{service.service_name}</p>
    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: serviceTypeColor(service.service_type) }} />
      {serviceTypeLabel(service.service_type)}
      {service.service_category && <> · {service.service_category}</>}
    </p>
  </>
);

const columns: Record<string, Column<ServiceCatalogItem>> = {
  service: { key: "service", header: "Service", render: serviceCell },
  room: { key: "room", header: "Room", render: (service) => <span className="text-gray-600">{service.room}</span> },
  price: { key: "price", header: "Price", align: "right", render: (service) => <span className="text-gray-900">{formatPeso(service.price)}</span> },
  orders: { key: "orders", header: "Orders", align: "right", render: (service) => formatNumber(service.orders) },
  last: {
    key: "last",
    header: "Last ordered",
    render: (service) => <span className="whitespace-nowrap text-gray-500">{formatDateTime(service.last_ordered_at)}</span>,
  },
};

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

// Content of the modal opened from a Service Inventory tile.
// Uses the catalog the dashboard already loaded, so nothing is fetched here.
function InventoryDetails({ kind, analytics }: InventoryDetailsProps) {
  const all = analytics.services;
  const active = all.filter((service) => service.active);
  const key = (service: ServiceCatalogItem) => service.service_id;

  if (kind === "active" || kind === "inactive") {
    const list = kind === "active" ? active : all.filter((service) => !service.active);
    const countOf = (type: string) => list.filter((service) => service.service_type === type).length;

    return (
      <>
        <FigureRow
          figures={[
            { label: kind === "active" ? "Active services" : "Inactive services", value: formatNumber(list.length), note: `Of ${all.length} total` },
            { label: "Consultation", value: formatNumber(countOf("consultation")) },
            { label: "Laboratory", value: formatNumber(countOf("laboratory")) },
            { label: "Orders in period", value: formatNumber(list.reduce((sum, service) => sum + service.orders, 0)) },
          ]}
        />
        {kind === "inactive" && (
          <p className="mx-6 mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
            Inactive services can't be requested. Turn them back on from Service Management.
          </p>
        )}
        <SectionTitle aside="By orders in the selected period">Services</SectionTitle>
        <DataTable
          rows={list}
          rowKey={key}
          empty={kind === "active" ? "No active services" : "No inactive services"}
          columns={[columns.service, columns.room, columns.price, columns.orders, columns.last]}
        />
      </>
    );
  }

  if (kind === "average-price") {
    const prices = active.map((service) => service.price);
    const byPrice = [...active].sort((a, b) => b.price - a.price);

    return (
      <>
        <FigureRow
          figures={[
            { label: "Average price", value: formatPeso(analytics.summary.average_price), note: "Active services" },
            { label: "Lowest", value: formatPeso(prices.length ? Math.min(...prices) : 0) },
            { label: "Highest", value: formatPeso(prices.length ? Math.max(...prices) : 0) },
            { label: "Active services", value: formatNumber(active.length) },
          ]}
        />

        <SectionTitle>Average price by service type</SectionTitle>
        <BarList
          rows={TYPES.map((type) => {
            const ofType = active.filter((service) => service.service_type === type);
            const value = average(ofType.map((service) => service.price));
            return {
              key: type,
              label: `${serviceTypeLabel(type)} · ${ofType.length} services`,
              value,
              display: formatPeso(value),
              color: serviceTypeColor(type),
            };
          })}
        />

        <SectionTitle aside="Highest first">Prices</SectionTitle>
        <DataTable rows={byPrice} rowKey={key} empty="No active services" columns={[columns.service, columns.room, columns.price, columns.orders]} />
      </>
    );
  }

  if (kind === "orders") {
    const ordered = all.filter((service) => service.orders > 0);
    const top = ordered[0];

    return (
      <>
        <FigureRow
          figures={[
            { label: "Orders", value: formatNumber(analytics.summary.total_orders), note: "Consultations + lab tests" },
            { label: "Services ordered", value: formatNumber(ordered.length), note: `Of ${all.length}` },
            { label: "Most ordered", value: top ? formatNumber(top.orders) : "—", note: top?.service_name },
            { label: "Average per service", value: ordered.length ? average(ordered.map((service) => service.orders)).toFixed(1) : "—" },
          ]}
        />

        <SectionTitle>Orders by service type</SectionTitle>
        <BarList
          rows={TYPES.map((type) => {
            const value = all.filter((service) => service.service_type === type).reduce((sum, service) => sum + service.orders, 0);
            return {
              key: type,
              label: serviceTypeLabel(type),
              value,
              display: formatNumber(value),
              color: serviceTypeColor(type),
            };
          })}
        />

        <SectionTitle aside="Most ordered first">Ordered services</SectionTitle>
        <DataTable rows={ordered} rowKey={key} empty="No orders in this period" columns={[columns.service, columns.room, columns.price, columns.orders, columns.last]} />
      </>
    );
  }

  // Not ordered: active services with no orders in the period.
  const unused = active
    .filter((service) => service.orders === 0)
    .sort((a, b) => (a.last_ordered_at ?? "").localeCompare(b.last_ordered_at ?? ""));
  const neverOrdered = unused.filter((service) => !service.last_ordered_at).length;

  return (
    <>
      <FigureRow
        figures={[
          { label: "Not ordered", value: formatNumber(unused.length), note: "Active, no orders in period" },
          { label: "Never ordered", value: formatNumber(neverOrdered) },
          { label: "Active services", value: formatNumber(active.length) },
          { label: "Share unused", value: active.length ? `${((unused.length / active.length) * 100).toFixed(0)}%` : "—" },
        ]}
      />
      <p className="mx-6 mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
        These services are offered but nobody ordered them in the selected period. Consider promoting them, repricing them, or turning them off in Service Management.
      </p>
      <SectionTitle aside="Longest since last order first">Services</SectionTitle>
      <DataTable rows={unused} rowKey={key} empty="Every active service was ordered in this period" columns={[columns.service, columns.room, columns.price, columns.last]} />
    </>
  );
}

export default InventoryDetails;

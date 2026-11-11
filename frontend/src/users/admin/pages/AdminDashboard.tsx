import ErrorMessage from "../../../components/ErrorMessage";
import EmptyState from "../../../components/EmptyState";
import LoadingScreen from "../../../components/LoadingScreen";
import LoadingRegion from "../../../components/LoadingRegion";
import { useCallback, useState, type ReactNode } from "react";
import {
  Banknote,
  Receipt,
  Calculator,
  BadgePercent,
  Hourglass,
  TrendingUp,
  PieChart,
  Trophy,
  Package,
  PackageCheck,
  PackageX,
  Tag,
  ShoppingCart,
  CircleSlash,
} from "lucide-react";

import type {
  AnalyticsRange,
  SalesAnalytics,
  ServiceAnalytics,
} from "../../../interface/Analytics";
import StatTile from "../components/Dashboard/StatTile";
import RevenueChart from "../components/Dashboard/RevenueChart";
import SalesBreakdown from "../components/Dashboard/SalesBreakdown";
import TopServicesTable from "../components/Dashboard/TopServicesTable";
import ServiceCatalogTable from "../components/Dashboard/ServiceCatalogTable";
import DetailModal, {
  type OpenDetail,
} from "../components/Dashboard/DetailModal";
import type { SalesDetailKind } from "../components/Dashboard/DetailModal/SalesDetails";
import type { InventoryDetailKind } from "../components/Dashboard/DetailModal/InventoryDetails";
import {
  RANGE_OPTIONS,
  formatNumber,
  formatPeso,
  formatPesoWhole,
  percentChange,
} from "../components/Dashboard/formatters";

type AdminDashboardProps = {
  range: AnalyticsRange;
  setRange: (range: AnalyticsRange) => void;
  sales: SalesAnalytics | null;
  services: ServiceAnalytics | null;
  loading: boolean;
  error: string | null;
};

const iconProps = { size: 20, strokeWidth: 1.5 };

// Admin dashboard: sales analytics and service catalog ("inventory") analytics.
function AdminDashboard({
  range,
  setRange,
  sales,
  services,
  loading,
  error,
}: AdminDashboardProps) {
  const rangeOption =
    RANGE_OPTIONS.find((option) => option.value === range) ?? RANGE_OPTIONS[2];
  const summary = sales?.summary;
  const catalog = services?.summary;

  const [openDetail, setOpenDetail] = useState<OpenDetail | null>(null);
  const closeDetail = useCallback(() => setOpenDetail(null), []);
  const openSales = (kind: SalesDetailKind) => () =>
    setOpenDetail({ group: "sales", kind });
  const openInventory = (kind: InventoryDetailKind) => () =>
    setOpenDetail({ group: "inventory", kind });

  const periodLabel = range === "today" ? "Today" : `Last ${rangeOption.label}`;

  return (
    <main className="min-w-0">
      <div className="space-y-6 px-6">
        {/* Range selector */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              Sales &amp; Service Analytics
            </h2>
            <p className="text-sm text-gray-500">
              Paid bills and service orders · Manila time
            </p>
          </div>

          <div
            role="group"
            aria-label="Date range"
            className="inline-flex rounded-md border border-gray-300 bg-white p-0.5"
          >
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRange(option.value)}
                aria-pressed={range === option.value}
                className={`rounded-md px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                  range === option.value
                    ? "bg-sky-500 font-medium text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {!sales && !services && loading && (
          <LoadingScreen message="Loading analytics…" />
        )}

        {/* ================= SALES ================= */}
        <LoadingRegion
          loading={loading && Boolean(sales || services)}
          message="Refreshing analytics..."
        >
          <div className="space-y-6">
            {error && !sales && <UnavailableAnalytics />}
            {summary && sales && (
              <>
                <section className="bg-white border border-gray-300 rounded-md overflow-hidden">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-gray-300">
                    <StatTile
                      icon={<Banknote {...iconProps} />}
                      label="Revenue"
                      onClick={openSales("revenue")}
                      value={formatPesoWhole(summary.revenue)}
                      caption={`vs ${rangeOption.previous}`}
                      change={percentChange(
                        summary.revenue,
                        summary.previous_revenue,
                      )}
                      changeLabel={`${rangeOption.previous}: ${formatPeso(summary.previous_revenue)}`}
                    />
                    <StatTile
                      icon={<Receipt {...iconProps} />}
                      label="Paid Bills"
                      onClick={openSales("paid-bills")}
                      value={formatNumber(summary.paid_bills)}
                      caption={`vs ${rangeOption.previous}`}
                      change={percentChange(
                        summary.paid_bills,
                        summary.previous_paid_bills,
                      )}
                      changeLabel={`${rangeOption.previous}: ${summary.previous_paid_bills}`}
                    />
                    <StatTile
                      icon={<Calculator {...iconProps} />}
                      label="Average Bill"
                      onClick={openSales("average-bill")}
                      value={formatPesoWhole(summary.average_bill)}
                      caption="Per paid bill"
                    />
                    <StatTile
                      icon={<BadgePercent {...iconProps} />}
                      label="Discounts Given"
                      onClick={openSales("discounts")}
                      value={formatPesoWhole(summary.discounts)}
                      caption={`From ${formatPesoWhole(summary.gross_sales)} gross`}
                    />
                    <StatTile
                      icon={<Hourglass {...iconProps} />}
                      label="Outstanding"
                      onClick={openSales("outstanding")}
                      value={formatPesoWhole(summary.pending_amount)}
                      caption={`${summary.pending_bills} unpaid ${summary.pending_bills === 1 ? "bill" : "bills"} now`}
                    />
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                  <Panel
                    className="xl:col-span-2"
                    icon={<TrendingUp {...iconProps} />}
                    title="Revenue Over Time"
                    subtitle={`Paid bills after discounts, by ${sales.bucket}`}
                  >
                    <div className="px-6 pt-10 pb-6">
                      <RevenueChart
                        timeline={sales.timeline}
                        bucket={sales.bucket}
                      />
                    </div>
                  </Panel>

                  <Panel
                    icon={<PieChart {...iconProps} />}
                    title="Sales Breakdown"
                    subtitle={periodLabel}
                  >
                    <div className="p-6">
                      <SalesBreakdown
                        serviceTypes={sales.service_types}
                        paymentMethods={sales.payment_methods}
                      />
                    </div>
                  </Panel>
                </div>

                <Panel
                  icon={<Trophy {...iconProps} />}
                  title="Top-Selling Services"
                  subtitle="Ranked by revenue, before discounts"
                >
                  <TopServicesTable services={sales.services} />
                </Panel>
              </>
            )}

            {/* ================= SERVICE CATALOG (INVENTORY) ================= */}
            {error && !services && <UnavailableAnalytics inventory />}
            {catalog && services && (
              <>
                <section className="bg-white border border-gray-300 rounded-md overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-300">
                    <div className="flex items-center gap-3">
                      <Package {...iconProps} />
                      <div>
                        <h2 className="text-lg font-semibold">
                          Service Inventory
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                          Services offered and how often each was ordered
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-gray-300">
                    <StatTile
                      icon={<PackageCheck {...iconProps} />}
                      label="Active Services"
                      onClick={openInventory("active")}
                      value={formatNumber(catalog.active_services)}
                      caption={`${catalog.consultation_services} consultation · ${catalog.laboratory_services} laboratory`}
                    />
                    <StatTile
                      icon={<PackageX {...iconProps} />}
                      label="Inactive Services"
                      onClick={openInventory("inactive")}
                      value={formatNumber(catalog.inactive_services)}
                      caption={`Of ${catalog.total_services} total`}
                    />
                    <StatTile
                      icon={<Tag {...iconProps} />}
                      label="Average Price"
                      onClick={openInventory("average-price")}
                      value={formatPesoWhole(catalog.average_price)}
                      caption="Across active services"
                    />
                    <StatTile
                      icon={<ShoppingCart {...iconProps} />}
                      label="Orders"
                      onClick={openInventory("orders")}
                      value={formatNumber(catalog.total_orders)}
                      caption="Consultations + lab tests"
                    />
                    <StatTile
                      icon={<CircleSlash {...iconProps} />}
                      label="Not Ordered"
                      onClick={openInventory("not-ordered")}
                      value={formatNumber(catalog.unused_active_services)}
                      caption="Active services with no orders"
                    />
                  </div>
                </section>

                <Panel
                  icon={<Package {...iconProps} />}
                  title="Service Catalog"
                  subtitle="Sorted by orders in the selected period"
                  bodyClassName="pt-4"
                >
                  <ServiceCatalogTable services={services.services} />
                </Panel>
              </>
            )}
          </div>
        </LoadingRegion>
      </div>
      {/* Tile detail modal */}
      {openDetail && (
        <DetailModal
          detail={openDetail}
          range={range}
          periodLabel={periodLabel}
          previousLabel={rangeOption.previous}
          sales={sales}
          services={services}
          onClose={closeDetail}
        />
      )}
    </main>
  );
}

type PanelProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

function UnavailableAnalytics({ inventory = false }: { inventory?: boolean }) {
  const metrics = inventory
    ? [
        { icon: PackageCheck, label: "Active Services" },
        { icon: PackageX, label: "Inactive Services" },
        { icon: Tag, label: "Average Price" },
        { icon: ShoppingCart, label: "Orders" },
        { icon: CircleSlash, label: "Not Ordered" },
      ]
    : [
        { icon: Banknote, label: "Revenue" },
        { icon: Receipt, label: "Paid Bills" },
        { icon: Calculator, label: "Average Bill" },
        { icon: BadgePercent, label: "Discounts Given" },
        { icon: Hourglass, label: "Outstanding" },
      ];
  return (
    <>
      <section className="overflow-hidden rounded-md border border-gray-300 bg-white">
        {inventory && (
          <h2 className="border-b border-gray-300 px-6 py-5 text-lg font-semibold">
            Service Inventory
          </h2>
        )}
        <div className="grid grid-cols-1 divide-y divide-gray-300 sm:grid-cols-2 sm:divide-y-0 sm:divide-x xl:grid-cols-5">
          {metrics.map(({ icon: Icon, label }) => (
            <StatTile
              key={label}
              icon={<Icon {...iconProps} />}
              label={label}
              value="—"
              caption="Data unavailable"
            />
          ))}
        </div>
      </section>
      {inventory ? (
        <Panel
          icon={<Package {...iconProps} />}
          title="Service Catalog"
          subtitle="Services offered and their orders"
        >
          <div className="p-4">
            <EmptyState message="Service data is unavailable." />
          </div>
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Panel
              className="xl:col-span-2"
              icon={<TrendingUp {...iconProps} />}
              title="Revenue Over Time"
              subtitle="Paid bills after discounts"
            >
              <div className="p-4">
                <EmptyState message="Revenue data is unavailable." />
              </div>
            </Panel>
            <Panel
              icon={<PieChart {...iconProps} />}
              title="Sales Breakdown"
              subtitle="Selected period"
            >
              <div className="p-4">
                <EmptyState message="Sales data is unavailable." />
              </div>
            </Panel>
          </div>
          <Panel
            icon={<Trophy {...iconProps} />}
            title="Top-Selling Services"
            subtitle="Ranked by revenue, before discounts"
          >
            <div className="p-4">
              <EmptyState message="Service sales data is unavailable." />
            </div>
          </Panel>
        </>
      )}
    </>
  );
}

function Panel({
  icon,
  title,
  subtitle,
  children,
  className = "",
  bodyClassName = "",
}: PanelProps) {
  return (
    <section
      className={`bg-white border border-gray-300 rounded-md overflow-hidden min-w-0 ${className}`}
    >
      <div className="px-6 py-5 border-b border-gray-300">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export default AdminDashboard;

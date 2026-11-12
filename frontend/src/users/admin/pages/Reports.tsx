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
import StatTile from "../components/StatTile";
import RevenueChart from "../components/Reports/RevenueChart";
import SalesBreakdown from "../components/Reports/SalesBreakdown";
import DrugTestsReport from "../components/Reports/DrugTestsReport";
import TopServicesTable from "../components/Reports/TopServicesTable";
import ServiceCatalogTable from "../components/Reports/ServiceCatalogTable";
import DetailModal, {
  type OpenDetail,
} from "../components/Reports/DetailModal";
import type { SalesDetailKind } from "../components/Reports/DetailModal/SalesDetails";
import type { InventoryDetailKind } from "../components/Reports/DetailModal/InventoryDetails";
import {
  RANGE_OPTIONS,
  formatNumber,
  formatPeso,
  formatPesoWhole,
  percentChange,
} from "../components/Reports/utils/formatters";

type ReportsProps = {
  range: AnalyticsRange;
  setRange: (range: AnalyticsRange) => void;
  sales: SalesAnalytics | null;
  services: ServiceAnalytics | null;
  loading: boolean;
  error: string | null;
};

const iconProps = { size: 20, strokeWidth: 1.5 };

// Admin reports: collections (paid bills) and service requests for a date range.
function Reports({
  range,
  setRange,
  sales,
  services,
  loading,
  error,
}: ReportsProps) {
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
      <div className="space-y-6 px-4 sm:px-6">
        {/* Range selector */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              Reports
            </h2>
            <p className="text-sm text-gray-500">
              Collections and service requests · your local time
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
                  <div className="grid grid-cols-2 xl:grid-cols-5 gap-px bg-gray-300 [&>*:last-child:nth-child(odd)]:col-span-2 xl:[&>*:last-child:nth-child(odd)]:col-span-1">
                    <StatTile
                      icon={<Banknote {...iconProps} />}
                      label="Collected"
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
                      label="Unpaid"
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
                    title="Collections Over Time"
                    subtitle={`Paid bills after discounts, by ${sales.bucket}`}
                  >
                    <div className="px-4 sm:px-6 pt-10 pb-6">
                      <RevenueChart
                        timeline={sales.timeline}
                        bucket={sales.bucket}
                      />
                    </div>
                  </Panel>

                  <Panel
                    icon={<PieChart {...iconProps} />}
                    title="Collections Breakdown"
                    subtitle={periodLabel}
                  >
                    <div className="p-4 sm:p-6">
                      <SalesBreakdown
                        serviceTypes={sales.service_types}
                        paymentMethods={sales.payment_methods}
                      />
                    </div>
                  </Panel>
                </div>

                <Panel
                  icon={<Trophy {...iconProps} />}
                  title="Most Requested Services"
                  subtitle="Ranked by amount collected, before discounts"
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
                  <div className="px-4 sm:px-6 py-5 border-b border-gray-300">
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

                  <div className="grid grid-cols-2 xl:grid-cols-5 gap-px bg-gray-300 [&>*:last-child:nth-child(odd)]:col-span-2 xl:[&>*:last-child:nth-child(odd)]:col-span-1">
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
                      label="Requests"
                      onClick={openInventory("orders")}
                      value={formatNumber(catalog.total_orders)}
                      caption="Consultations + lab tests"
                    />
                    <StatTile
                      icon={<CircleSlash {...iconProps} />}
                      label="Not Requested"
                      onClick={openInventory("not-ordered")}
                      value={formatNumber(catalog.unused_active_services)}
                      caption="Active services with no requests"
                    />
                  </div>
                </section>

                <Panel
                  icon={<Package {...iconProps} />}
                  title="Service Catalog"
                  subtitle="Sorted by requests in the selected period"
                  bodyClassName="pt-4"
                >
                  <ServiceCatalogTable services={services.services} />
                </Panel>
              </>
            )}
          </div>
        </LoadingRegion>

        {/* Billed but never queued; loads on its own for the selected range. */}
        <DrugTestsReport range={range} periodLabel={periodLabel} />
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
        { icon: ShoppingCart, label: "Requests" },
        { icon: CircleSlash, label: "Not Requested" },
      ]
    : [
        { icon: Banknote, label: "Collected" },
        { icon: Receipt, label: "Paid Bills" },
        { icon: Calculator, label: "Average Bill" },
        { icon: BadgePercent, label: "Discounts Given" },
        { icon: Hourglass, label: "Unpaid" },
      ];
  return (
    <>
      <section className="overflow-hidden rounded-md border border-gray-300 bg-white">
        {inventory && (
          <h2 className="border-b border-gray-300 px-4 sm:px-6 py-5 text-lg font-semibold">
            Service Inventory
          </h2>
        )}
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-px bg-gray-300 [&>*:last-child:nth-child(odd)]:col-span-2 xl:[&>*:last-child:nth-child(odd)]:col-span-1">
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
          subtitle="Services offered and how often they were requested"
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
              title="Collections Over Time"
              subtitle="Paid bills after discounts"
            >
              <div className="p-4">
                <EmptyState message="Collections data is unavailable." />
              </div>
            </Panel>
            <Panel
              icon={<PieChart {...iconProps} />}
              title="Collections Breakdown"
              subtitle="Selected period"
            >
              <div className="p-4">
                <EmptyState message="Collections data is unavailable." />
              </div>
            </Panel>
          </div>
          <Panel
            icon={<Trophy {...iconProps} />}
            title="Most Requested Services"
            subtitle="Ranked by amount collected, before discounts"
          >
            <div className="p-4">
              <EmptyState message="Service data is unavailable." />
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
      <div className="px-4 sm:px-6 py-5 border-b border-gray-300">
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

export default Reports;

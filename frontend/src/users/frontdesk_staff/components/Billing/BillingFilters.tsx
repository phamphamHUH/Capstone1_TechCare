import { ChevronDown, Search, RefreshCcw } from "lucide-react";
import type {
  PaymentMethodFilter,
  StatusFilter,
  ServiceFilter,
} from "../../../../interface/Billing";

type BillingFiltersProps = {
  loadData(): Promise<void>;
  search: string;
  setSearch: (value: string) => void;
  servicesFilter: ServiceFilter;
  setServicesFilter: (value: ServiceFilter) => void;
  paymentMethodFilter: PaymentMethodFilter;
  setPaymentMethodFilter: (value: PaymentMethodFilter) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
};

const labelClass = "relative w-48 shrink-0";
const selectClass =
  "h-9 w-full appearance-none rounded-sm border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-600 outline-none focus:border-sky-400";
const chevronClass =
  "pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400";

function BillingFilters({
  loadData,
  search,
  setSearch,
  servicesFilter,
  setServicesFilter,
  paymentMethodFilter,
  setPaymentMethodFilter,
  statusFilter,
  setStatusFilter,
}: BillingFiltersProps) {
  return (
    <div className="mb-4 flex w-full flex-wrap items-center gap-2">
      <div className="relative min-w-60 flex-1 basis-70">
        <Search
          size={17}
          strokeWidth={1.5}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by patient name, ID, or request ID..."
          className="h-9 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-100"
        />
      </div>

      <label className={labelClass}>
        <select
          value={servicesFilter}
          onChange={(e) => setServicesFilter(e.target.value as ServiceFilter)}
          className={selectClass}
        >
          <option value="all">All Services</option>
          <option value="consultation">Consultation</option>
          <option value="laboratory">Laboratory</option>
        </select>
        <ChevronDown size={15} className={chevronClass} />
      </label>

      <label className={labelClass}>
        <select
          value={paymentMethodFilter}
          onChange={(e) =>
            setPaymentMethodFilter(e.target.value as PaymentMethodFilter)
          }
          className={selectClass}
        >
          <option value="all">All Payment Methods</option>
          <option value="cash">Cash</option>
          <option value="gcash">Gcash</option>
          <option value="kiss">Kiss</option>
        </select>
        <ChevronDown size={15} className={chevronClass} />
      </label>

      <label className={labelClass}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className={selectClass}
        >
          <option value="all">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <ChevronDown size={15} className={chevronClass} />
      </label>

      <button
        className={`relative w-32 shrink-0 flex items-center justify-center gap-2 rounded-sm py-2 ml-24
                    cursor-pointer border text-sm border-blue-500 text-blue-500`}
        onClick={loadData}
      >
        <RefreshCcw size={15} />
        Refresh
      </button>
    </div>
  );
}

export default BillingFilters;

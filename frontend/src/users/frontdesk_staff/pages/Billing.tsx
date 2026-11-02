import { useState } from "react";
import type {
  BillingStatistics,
  BillingTab,
  UnpaidRequests,
  PaymentMethodFilter,
  StatusFilter,
  ServiceFilter,
} from "../../../interface/Billing";
import UnpaidRequestsTable from "../components/Billing/UnpaidRequestsTable";
import api from "#lib/axios";
import BillingStats from "../components/Billing/BillingStats";
import BillingTabs from "../components/Billing/BillingTabs";
import BillingFilters from "../components/Billing/BillingFilters";

type BillingProps = {
  unpaidRequests: UnpaidRequests[];
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadData(): Promise<void>;
  loading: boolean;
};

function Billing({
  unpaidRequests,
  open,
  setOpen,
  loadData,
  loading,
}: BillingProps) {
  const [submittingId, setSubmittingId] = useState<string | number | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<BillingTab>("billing-queue");
  const [error, setError] = useState<string | null>(null);

  // FILTERS
  const [search, setSearch] = useState<string>("");
  const [servicesFilter, setServicesFilter] = useState<ServiceFilter>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] =
    useState<PaymentMethodFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const getActivityStats = (): BillingStatistics => {
    return {
      totalRequests: unpaidRequests.length,
      pendingPayment: unpaidRequests.length,
      paidRequests: unpaidRequests.length,
      cancelledRequests: unpaidRequests.length,
    };
  };

  const stats = getActivityStats();

  const handleConfirmPayment = async (request: UnpaidRequests) => {
    try {
      setSubmittingId(request.lab_item_id);
      setError(null);
      console.log(request.request_id);

      await api.patch(`/api/fdstaff/laboratory-requests/${request.request_id}`);

      await loadData();
    } catch (err) {
      console.error("Error confirming payment:", err);
      setError(
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Failed to confirm payment.",
      );
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <main className="flex-1 min-w-0 px-6">
      <h1 className="text-2xl font-bold">Billing Queue</h1>
      <p className="w-3/7 text-sm font-light">
        Manage and process payments for laboratory and consultation requests.
        Only paid requests will be forwarded to the respective departments.
      </p>

      <BillingStats stats={stats} />

      <BillingTabs activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === "billing-queue" ? (
        <div className="border border-gray-200 py-5 rounded-b-sm rounded-tr-sm min-h-82">
          <div className="px-1">
            <BillingFilters
              loadData={loadData}
              search={search}
              setSearch={setSearch}
              servicesFilter={servicesFilter}
              setServicesFilter={setServicesFilter}
              paymentMethodFilter={paymentMethodFilter}
              setPaymentMethodFilter={setPaymentMethodFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
            />
          </div>
          {error && (
            <p role="alert" className="mb-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <UnpaidRequestsTable
            unpaidRequests={unpaidRequests}
            onConfirmPayment={handleConfirmPayment}
            submittingId={submittingId}
          />
        </div>
      ) : (
        "i miss you, madam"
      )}
    </main>
  );
}

export default Billing;

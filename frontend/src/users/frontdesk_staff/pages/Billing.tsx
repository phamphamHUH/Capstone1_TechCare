import { useEffect, useMemo, useState } from "react";
import type {
  BillingStatistics,
  BillingTab,
  Bill,
  BillItem,
  PaymentMethodFilter,
  StatusFilter,
  ServiceFilter,
  BillDetails,
} from "../../../interface/Billing";
import api from "#lib/axios";
import BillingStats from "../components/Billing/BillingStats";
import BillingTabs from "../components/Billing/BillingTabs";
import BillingFilters from "../components/Billing/BillingFilters";
import BillsTable from "../components/Billing/BillsTable";
import PaymentPage from "../components/Billing/PaymentPage";

type BillingProps = {
  pendingBills: Bill[];
  paidBills: Bill[];
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadData(): Promise<void>;
  loading: boolean;
};

const fetchBillDetails = async (bill_id: string) => {
  const { data } = await api.get<BillDetails>(
    `/api/fdstaff/billings/${bill_id}/details`,
  );
  return data;
};

const fetchBillItems = async (bill_id: string) =>
  (await fetchBillDetails(bill_id)).items;

function Billing({ pendingBills, paidBills, loadData }: BillingProps) {
  const [activeTab, setActiveTab] = useState<BillingTab>("billing-queue");
  const [paymentBill, setPaymentBill] = useState<Bill | null>(null);
  const [fetched, setFetched] = useState<{
    billId: string;
    details: BillDetails | null;
  } | null>(null);

  // FILTERS
  const [search, setSearch] = useState<string>("");
  const [servicesFilter, setServicesFilter] = useState<ServiceFilter>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] =
    useState<PaymentMethodFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const billId = paymentBill?.bill_id;
  const isCurrent = !!billId && fetched?.billId === billId;
  const paymentDetails = isCurrent ? (fetched?.details ?? null) : null;
  const paymentItems: BillItem[] = paymentDetails?.items ?? [];
  const itemsLoading = !!billId && !isCurrent;
  const bills = activeTab === "payment-history" ? paidBills : pendingBills;

  const stats: BillingStatistics = {
    totalRequests: pendingBills.length + paidBills.length,
    pendingPayment: pendingBills.length,
    paidRequests: paidBills.length,
    cancelledRequests: 0,
  };

  const filteredBills = useMemo(() => {
    const term = search.trim().toLowerCase();

    return bills.filter((bill) => {
      if (term) {
        const matchesSearch =
          bill.patient_name.toLowerCase().includes(term) ||
          bill.patient_id.toLowerCase().includes(term) ||
          bill.bill_id.toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      if (
        paymentMethodFilter !== "all" &&
        (bill.payment_method ?? "").toLowerCase() !==
          String(paymentMethodFilter).toLowerCase()
      ) {
        return false;
      }

      if (statusFilter !== "all" && bill.status !== String(statusFilter)) {
        return false;
      }

      return true;
    });
  }, [bills, search, paymentMethodFilter, statusFilter]);

  const handleProcessPayment = (bill: Bill) => {
    setFetched(null);
    setPaymentBill(bill);
  };

  useEffect(() => {
    if (!billId) return;

    let cancelled = false;

    fetchBillDetails(billId)
      .then((details) => {
        if (!cancelled) setFetched({ billId, details });
      })
      .catch((err) => {
        console.error("Failed to fetch bill details", err);
        if (!cancelled) setFetched({ billId, details: null });
      });

    return () => {
      cancelled = true;
    };
  }, [billId]);

  return (
    <main className="flex-1 min-w-0 px-6">
      {paymentBill ? (
        <PaymentPage
          paymentBill={paymentDetails?.bill ?? paymentBill}
          setPaymentBill={setPaymentBill}
          items={paymentItems}
          itemsLoading={itemsLoading}
          onPaid={async () => {
            await loadData();
            setPaymentBill(null);
          }}
        />
      ) : (
        <>
          <h1 className="text-2xl font-bold">Billing Queue</h1>
          <p className="w-3/7 text-sm font-light">
            Manage and process payments for laboratory and consultation
            requests. Only paid requests will be forwarded to the respective
            departments.
          </p>

          <BillingStats stats={stats} />

          <BillingTabs activeTab={activeTab} onChange={setActiveTab} />

          {activeTab === "billing-queue" ? (
            <div className="min-h-64 rounded-b-sm rounded-tr-sm border border-gray-200 py-5">
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

              <BillsTable
                key={activeTab}
                variant={activeTab === "billing-queue" ? "queue" : "history"}
                bills={filteredBills}
                onProcessPayment={handleProcessPayment}
                fetchBillItems={fetchBillItems}
              />
            </div>
          ) : (
            <div className="min-h-64 rounded-b-sm rounded-tr-sm border border-gray-200 py-5">
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

              <BillsTable
                key={activeTab}
                variant={activeTab === "payment-history" ? "history" : "queue"}
                bills={filteredBills}
                onProcessPayment={handleProcessPayment}
                fetchBillItems={fetchBillItems}
              />
            </div>
          )}
        </>
      )}
    </main>
  );
}

export default Billing;

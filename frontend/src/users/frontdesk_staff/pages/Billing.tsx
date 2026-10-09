import { useState } from "react";
import Header from "../../../components/Header";
import type { UnpaidRequests } from "../../../interface/Billing";
import UnpaidRequestsTable from "../components/Billing/UnpaidRequestsTable";
import api from "#lib/axios";

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
  const [error, setError] = useState<string | null>(null);

  const handleConfirmPayment = async (request: UnpaidRequests) => {
    try {
      setSubmittingId(request.lab_item_id);
      setError(null);
      console.log(request.request_id);

      await api.patch(`/api/fdstaff/laboratory-requests/${request.request_id}`);

      await loadData(); // row disappears from unpaid list, appears in queue list
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
    <main className="flex-1 min-w-0">
      <Header
        open={open}
        setOpen={setOpen}
        loadData={loadData}
        page="Billing"
        loading={loading}
      />

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
    </main>
  );
}

export default Billing;

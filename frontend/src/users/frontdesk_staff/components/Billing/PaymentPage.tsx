import {
  MoveLeft,
  Info,
  ChevronDown,
  FlagTriangleRight,
  Percent,
  QrCode,
  WalletMinimal,
} from "lucide-react";
import { useState, type Dispatch, type SetStateAction } from "react";
import type { Bill, BillItem } from "../../../../interface/Billing";
import api from "#lib/axios";
import axios from "axios";
import { peso, formatAge } from "../../../../utils/formats";

type PaymentPageProps = {
  paymentBill: Bill;
  setPaymentBill: Dispatch<SetStateAction<Bill | null>>;
  items: BillItem[];
  itemsLoading: boolean;
  onPaid: () => Promise<void>;
};

type DiscountType = "Not Eligible" | "Senior Citizen" | "PWD";
type PaymentMethod = "Cash" | "Instapay/QRpH";

const DISCOUNT_RATES: Record<DiscountType, number> = {
  "Not Eligible": 0,
  "Senior Citizen": 0.2,
  PWD: 0.2,
};

function PaymentPage({
  paymentBill,
  setPaymentBill,
  items,
  itemsLoading,
  onPaid,
}: PaymentPageProps) {
  const [priority, setPriority] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amountReceived, setAmountReceived] = useState("");
  const [referenceId, setReferenceId] = useState("");

  const eligibleDiscount: DiscountType = paymentBill.is_senior
    ? "Senior Citizen"
    : paymentBill.is_pwd
      ? "PWD"
      : "Not Eligible";

  const [discountChoice, setDiscountChoice] = useState<DiscountType | null>(
    null,
  );
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const discountType = discountChoice ?? eligibleDiscount;

  const subtotal = round2(items.reduce((sum, i) => sum + Number(i.price), 0));
  const discountAmount = round2(subtotal * DISCOUNT_RATES[discountType]);
  const totalAmount = round2(subtotal - discountAmount);

  const received = Number(amountReceived) || 0;
  const change = Math.max(0, round2(received - totalAmount));
  const insufficient =
    paymentMethod === "Cash" &&
    Math.round(received * 100) < Math.round(totalAmount * 100);
  const missingReference = paymentMethod !== "Cash" && referenceId === "";

  const canPay =
    !itemsLoading &&
    items.length > 0 &&
    !insufficient &&
    !missingReference &&
    !submitting;

  const initials = (paymentBill.patient_name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word, i, arr) =>
      i === 0 || i === arr.length - 1 ? word.charAt(0).toUpperCase() : "",
    )
    .join("");

  const labelClass = "relative w-48 shrink-0";
  const selectClass =
    "h-9 w-full appearance-none rounded-sm border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-600 outline-none focus:border-sky-400";
  const chevronClass =
    "pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400";

  const handlePay = async () => {
    if (!canPay) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.patch(`/api/fdstaff/billings/${paymentBill.bill_id}/pay`, {
        payment_method: paymentMethod,
        discount_type: discountType,
        amount_received: paymentMethod === "Cash" ? received : null,
        reference_num: paymentMethod === "Cash" ? null : referenceId,
        priority,
      });
      await onPaid();
    } catch (err) {
      const message = axios.isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message
        : undefined;
      setError(message ?? "Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <button
        className="mb-5 flex cursor-pointer items-center gap-2 rounded-2xl border border-sky-300 bg-sky-50 px-2 py-1 text-sky-600"
        onClick={() => setPaymentBill(null)}
      >
        <MoveLeft size={10} />
        <span className="text-xs">Back to Billing Queue</span>
      </button>

      <h1 className="text-2xl font-bold">Process Payment</h1>
      <p className="text-sm font-light text-gray-600">
        Review selected services, apply eligible discounts, and record patient
        payments.
      </p>

      <div className="mt-5 grid grid-cols-7 gap-5">
        <div className="col-span-5 space-y-5">
          <div className="rounded-md border border-gray-200 p-4">
            <h2 className="mb-3 font-semibold">Patient Information</h2>
            <div className="flex gap-10">
              <div className="relative h-20 w-20 overflow-hidden rounded-full bg-sky-50">
                {paymentBill.image_url ? (
                  <img
                    src={paymentBill.image_url}
                    alt={paymentBill.patient_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-sky-50 text-3xl font-semibold text-gray-500">
                    {initials}
                  </div>
                )}
              </div>

              <div className="text-xs">
                <h2 className="font-semibold text-sm">
                  {paymentBill.patient_name}
                </h2>
                <p className=" text-gray-600">{paymentBill.patient_id}</p>
                <div className="mt-1 flex items-center gap-2">
                  {paymentBill.is_senior && (
                    <span className="rounded-full bg-sky-100 px-3 py-0.5 text-xs text-sky-600">
                      Senior Citizen
                    </span>
                  )}
                  {paymentBill.is_pwd && (
                    <span className="rounded-full bg-orange-100 px-3 py-0.5 text-xs text-orange-600">
                      PWD
                    </span>
                  )}
                </div>
              </div>

              <div className="text-xs ml-5">
                <h2 className="text-xs text-gray-500">Age / Gender</h2>
                <p>{formatAge(paymentBill.birthdate, paymentBill.age)}</p>
                <p>{paymentBill.sex ?? "N/A"}</p>
              </div>

              <div className="text-xs">
                <h2 className=" text-gray-500">Request ID</h2>
                <p>{paymentBill.bill_id}</p>
              </div>

              <div className="text-xs">
                <h2 className=" text-gray-500">Date & Time</h2>
                <p>
                  {new Date(paymentBill.created_at).toLocaleDateString(
                    "en-PH",
                    {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    },
                  )}
                </p>
                <p>
                  {new Date(paymentBill.created_at).toLocaleTimeString(
                    "en-PH",
                    {
                      hour: "numeric",
                      minute: "2-digit",
                    },
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="rounded-md border border-gray-200 p-4">
            <h2 className="mb-3 font-semibold">Selected Services</h2>
            {itemsLoading ? (
              <p className="text-sm text-gray-500">Loading items...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-gray-500">No items found.</p>
            ) : (
              <>
                <table className="w-full text-sm">
                  <colgroup>
                    <col className="w-1/25" />
                    <col className="w-7/25" />
                    <col className="w-7/25" />
                    <col className="w-6/25" />
                    <col className="w-4/25" />
                  </colgroup>
                  <thead>
                    <tr className=" text-left font-semibold bg-sky-50">
                      <th className="py-2 px-3">#</th>
                      <th>Service Name</th>
                      <th>Service Category</th>
                      <th>Service Type</th>
                      <th className="text-right px-3">Unit Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr
                        key={`${item.line_type}-${item.item_id}`}
                        className="border-b border-gray-200 text-xs"
                      >
                        <td>{index + 1}</td>
                        <td className="py-2">{item.service_name}</td>
                        <td>{item.service_category}</td>
                        <td className="capitalize">{item.line_type}</td>
                        <td className="text-right">{peso(item.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-between mt-2 mb-1 text-xs">
                  <h2 className="text-gray-500">Subtotal ({items.length})</h2>
                  <span className="font-semibold">{peso(subtotal)}</span>
                </div>
              </>
            )}
          </div>

          {/* Discount and Priority Panel */}
          <div className="rounded-md border border-gray-200 p-4">
            <h2 className="mb-3 font-semibold">Discount & Priority</h2>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <div className="flex gap-2 items-center justify-left mb-2">
                  <Percent size={20} />
                  <h3 className="text-sm text-gray-600">
                    Discount Eligibility
                  </h3>
                </div>
                <label className={labelClass}>
                  <select
                    value={discountType}
                    onChange={(e) =>
                      setDiscountChoice(e.target.value as DiscountType)
                    }
                    className={selectClass}
                  >
                    <option value="Not Eligible">Not Eligible</option>
                    <option
                      value="Senior Citizen"
                      disabled={!paymentBill.is_senior}
                    >
                      Senior Citizen
                    </option>
                    <option value="PWD" disabled={!paymentBill.is_pwd}>
                      PWD
                    </option>
                  </select>
                  <ChevronDown size={15} className={chevronClass} />
                </label>
                <p className="text-xs font-extralight mt-2">
                  A 20% discount will be applied to the total amount.
                </p>
              </div>

              <div>
                <div className="flex gap-2 items-center justify-left mb-2">
                  <FlagTriangleRight size={20} />
                  <h3 className="text-sm text-gray-600">Queue Priority</h3>
                </div>
                <label className={labelClass}>
                  <select
                    value={priority ? "Yes" : "No"}
                    onChange={(e) => setPriority(e.target.value === "Yes")}
                    className={selectClass}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                  <ChevronDown size={15} className={chevronClass} />
                </label>
                <p className="text-xs font-extralight mt-2">
                  Priority only affects the queue handling of the patient
                </p>
              </div>
            </div>
            <div className="flex border border-sky-300 bg-sky-100 text-sky-500 px-4 py-2 gap-2 rounded-sm mt-5">
              <Info size={25} />
              <p className="text-xs">
                Only one discount type can be applied. Eligible patients are
                automatically tagged based on their profile.
              </p>
            </div>
          </div>

          {/* Payment Method Panel */}
          <div className="rounded-md border border-gray-200 p-4">
            <h2 className="mb-3 font-semibold">Payment Method</h2>
            <div className="grid grid-cols-2 gap-5">
              <label
                className={`flex cursor-pointer items-center gap-2 rounded border-2 px-3 py-2 text-sm ${
                  paymentMethod === "Cash"
                    ? "border-sky-500 bg-sky-50 text-sky-700"
                    : "border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="payment-method"
                  value="Cash"
                  checked={paymentMethod === "Cash"}
                  onChange={() => setPaymentMethod("Cash")}
                />
                <WalletMinimal size={18} />
                Cash
              </label>

              <label
                className={`flex cursor-pointer items-center gap-2 rounded border-2 px-3 py-2 text-sm ${
                  paymentMethod === "Instapay/QRpH"
                    ? "border-sky-500 bg-sky-50 text-sky-700"
                    : "border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="payment-method"
                  value="Instapay/QRpH"
                  checked={paymentMethod === "Instapay/QRpH"}
                  onChange={() => setPaymentMethod("Instapay/QRpH")}
                />
                <QrCode size={18} />
                Instapay/QRpH
              </label>
            </div>
            <div className="grid grid-cols-3 gap-5 mt-5">
              <div className="col-span-1 flex flex-col gap-3">
                <h3 className="text-xs text-gray-600">Total Amount Due</h3>
                <span className="text-sky-600">{peso(totalAmount)}</span>
              </div>
              <div className="col-span-2">
                {paymentMethod === "Cash" && (
                  <div className="flex gap-5">
                    <div className="flex flex-col gap-1">
                      <h3 className="mb-1 text-xs text-gray-600">
                        Cash Received
                      </h3>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={amountReceived}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (/^\d*\.?\d{0,2}$/.test(v)) setAmountReceived(v);
                        }}
                        placeholder=" ₱0.00"
                        className="w-90 rounded border border-gray-300 px-2 text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-3">
                      <h3 className="mt-1 text-xs text-gray-500">Change</h3>
                      <p>{peso(change > 0 ? change : 0)}</p>
                      {insufficient && amountReceived !== "" && (
                        <p className="text-xs text-red-500">
                          Amount received is less than the total.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {paymentMethod !== "Cash" && (
                  <div>
                    <h3 className="mb-1 text-sm text-gray-600">Reference ID</h3>
                    <input
                      type="text"
                      value={referenceId}
                      onChange={(e) => setReferenceId(e.target.value.trim())}
                      placeholder="Transaction reference number"
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="col-span-2 h-fit rounded-md border border-gray-200 p-4 text-sm">
          <h2 className="mb-3 font-semibold">Payment Summary</h2>
          <div className="flex justify-between text-xs border-b py-2 border-gray-300">
            <h2 className="text-gray-500">Selected Services</h2>
            <span className="font-semibold">
              {items.length} {items.length === 1 ? "Item" : "Items"}
            </span>
          </div>
          <div className="flex justify-between text-xs py-2 border-b border-gray-300">
            <h2 className="text-gray-500">Subtotal</h2>
            <span>{peso(subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 py-2">
            <h2>Discount Type</h2>
            <span>{discountType}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 py-2 border-b border-gray-300">
            <h2>Discount Amount</h2>
            <span className="text-green-600">-{peso(discountAmount)}</span>
          </div>
          <div className=" flex justify-between items-center border border-sky-300 py-3 px-2 bg-sky-50 font-semibold rounded-md mt-3">
            <h2 className="text-xs font-semibold">Total Amount Due</h2>
            <span className="text-lg text-sky-600 font-semibold">
              {peso(totalAmount ?? subtotal)}
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 py-2">
            <h2>Payment Methods</h2>
            <span>{paymentMethod}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 py-2 border-b border-gray-300">
            <h2>Queue Priority</h2>
            <span>{priority ? "Priority" : "Non-priority"}</span>
          </div>
          <div className="flex border border-sky-300 bg-sky-100 text-sky-500 px-4 py-2 gap-2 rounded-sm mt-5">
            <Info size={25} />
            <p className="text-xs">
              Request will be forwarded upon successful payment.
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-5 text-xs mt-5">
        {error && <p className="mr-auto text-red-500">{error}</p>}
        <button
          onClick={() => setPaymentBill(null)}
          className="border px-4 py-2 cursor-pointer rounded-sm border-gray-300"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handlePay}
          disabled={!canPay}
          className="cursor-pointer rounded-sm border border-blue-600 bg-sky-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-300"
        >
          {submitting ? "Saving..." : "Confirm & Record Payment"}
        </button>
      </div>
    </div>
  );
}

export default PaymentPage;

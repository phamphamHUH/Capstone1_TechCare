import { useRef, useState } from "react";
import {
  FlagTriangleRight,
  Info,
  LoaderCircle,
  MoveLeft,
  Percent,
  Printer,
  QrCode,
  WalletMinimal,
} from "lucide-react";
import type {
  Bill,
  BillItem,
  BillingNotice,
  DiscountType,
  PaymentMethod,
  PaymentOptions,
} from "../../../../interface/Billing";
import ConfirmDialog from "../../../../components/ConfirmDialog";
import { formatAge, formatDateTime, peso } from "../../../../utils/formats";

type ProcessPaymentProps = {
  bill: Bill;
  items: BillItem[];
  submitting: boolean;
  error: string;
  notice: BillingNotice | null;
  onBack: () => void;
  onPay: (options: PaymentOptions) => Promise<void>;
  onRetryForwarding: () => Promise<void>;
};

const cardClass = "rounded-md border border-gray-200 bg-white p-4";
const fieldClass =
  "h-9 w-full rounded-sm border border-gray-300 bg-white px-3 text-sm text-gray-600 outline-none focus:border-sky-400 disabled:bg-gray-100";
const round2 = (value: number) => Math.round(value * 100) / 100;
const itemPrice = (item: BillItem) =>
  item.price === null
    ? "Not recorded"
    : peso(Number(item.price) * (item.quantity ?? 1));

const INVOICE_CSS = `
  @page { size: A4 portrait; margin: 12mm; }
  body { margin: 0; color: #111827; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; }
  h2, h3, p { margin: 0 0 4px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { padding: 8px 6px; border-bottom: 1px solid #d1d5db; text-align: left; }
  tr { break-inside: avoid; }
  dl { display: grid; grid-template-columns: 1fr auto; gap: 4px 16px; margin: 12px 0; }
  dd { margin: 0; text-align: right; }
`;

// Prints only the invoice, in a separate frame, so the sidebar and header stay out of it.
function printInvoice(invoice: HTMLElement, title: string) {
  const frame = document.createElement("iframe");
  frame.title = "Printable Invoice";
  frame.style.cssText =
    "position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.title = title;
  doc.head.innerHTML = `<style>${INVOICE_CSS}</style>`;
  doc.body.innerHTML = invoice.innerHTML;
  frame.contentWindow!.focus();
  frame.contentWindow!.print();
  // Long enough for the print dialog, then clean up.
  window.setTimeout(() => frame.remove(), 60_000);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-200 py-2 text-xs">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function ProcessPayment({
  bill,
  items,
  submitting,
  error,
  notice,
  onBack,
  onPay,
  onRetryForwarding,
}: ProcessPaymentProps) {
  const [discount, setDiscount] = useState<DiscountType>(
    bill.is_senior ? "Senior Citizen" : bill.is_pwd ? "PWD" : "Not Eligible",
  );
  const [priority, setPriority] = useState(bill.is_priority);
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [cash, setCash] = useState("");
  const [reference, setReference] = useState("");
  const [confirming, setConfirming] = useState(false);
  const invoiceRef = useRef<HTMLElement>(null);

  const isPending = bill.status === "Pending";
  const needsForwarding = bill.laboratory_status === "Needs forwarding";
  const amountRecorded = bill.payment_method !== "Not recorded";

  // The server recomputes all of this when the payment is submitted.
  const subtotal = round2(
    items.reduce(
      (sum, item) => sum + Number(item.price) * (item.quantity ?? 1),
      0,
    ),
  );
  const discountAmount =
    discount === "Not Eligible" ? 0 : round2(subtotal * 0.2);
  const total = round2(subtotal - discountAmount);
  const received = Number(cash) || 0;
  const change = Math.max(0, round2(received - total));
  const insufficient =
    method === "Cash" && Math.round(received * 100) < Math.round(total * 100);
  const missingReference = method !== "Cash" && !reference.trim();
  const canPay =
    items.length > 0 &&
    cash !== "." &&
    !insufficient &&
    !missingReference &&
    !submitting;

  const created = formatDateTime(bill.created_at);
  const paid = formatDateTime(bill.paid_at);
  const initials = (bill.patient_name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word, i, arr) =>
      i === 0 || i === arr.length - 1 ? word.charAt(0).toUpperCase() : "",
    )
    .join("");

  async function confirmPayment() {
    setConfirming(false);
    await onPay({
      payment_method: method,
      discount_type: discount,
      amount_received: method === "Cash" ? received : null,
      reference_num: method === "Cash" ? "" : reference.trim(),
      priority,
    });
  }

  return (
    <div>
      <button
        type="button"
        disabled={submitting}
        onClick={onBack}
        className="mb-5 flex cursor-pointer items-center gap-2 rounded-2xl border border-sky-300 bg-sky-50 px-3 py-1 text-xs text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MoveLeft size={14} />
        Back to Billing
      </button>

      <h1 className="text-2xl font-bold">
        {isPending ? "Process Payment" : "Payment Details"}
      </h1>
      <p className="text-sm font-light text-gray-600">
        {isPending
          ? "Review services, apply eligible discounts, and record the patient's payment."
          : "This payment is recorded. Prices below are the ones saved when it was paid."}
      </p>

      {notice && (
        <p
          role="status"
          className={`mt-4 rounded-lg border p-3 text-sm ${notice.tone === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}
        >
          {notice.text}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      <div className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-7">
        <div className="space-y-5 xl:col-span-5">
          <section className={cardClass}>
            <h2 className="mb-3 font-semibold">Patient Information</h2>
            <div className="flex flex-wrap gap-x-10 gap-y-3 text-xs">
              <div className="relative h-15 w-15 overflow-hidden rounded-full bg-sky-50">
                {bill.image_url ? (
                  <img
                    src={bill.image_url}
                    alt={bill.patient_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-sky-50 text-3xl font-semibold text-gray-500">
                    {initials}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">{bill.patient_name}</p>
                <p className="text-gray-600">{bill.patient_id}</p>
                <div className="mt-1 flex gap-2">
                  {bill.is_senior && (
                    <span className="rounded-full bg-sky-100 px-3 py-0.5 text-sky-700">
                      Senior Citizen
                    </span>
                  )}
                  {bill.is_pwd && (
                    <span className="rounded-full bg-orange-100 px-3 py-0.5 text-orange-700">
                      PWD
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-gray-500">Age / Sex</p>
                <p>{formatAge(bill.birthdate, bill.age)}</p>
                <p>{bill.sex ?? "N/A"}</p>
              </div>
              <div>
                <p className="text-gray-500">Bill ID</p>
                <p>{bill.bill_id}</p>
              </div>
              <div>
                <p className="text-gray-500">Created</p>
                <p>
                  {created
                    ? `${created.date}, ${created.time}`
                    : "Not recorded"}
                </p>
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <h2 className="mb-3 font-semibold">Services</h2>
            {items.length === 0 ? (
              <p className="text-sm text-gray-500">
                No itemized services were saved for this bill.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-120 text-left text-xs">
                  <thead className="bg-sky-50">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="py-2">Service Name</th>
                      <th className="py-2">Category</th>
                      <th className="py-2">Type</th>
                      <th className="px-3 py-2 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr
                        key={item.item_id ?? `${item.service_name}-${index}`}
                        className="border-b border-gray-200"
                      >
                        <td className="px-3 py-2">{index + 1}</td>
                        <td className="py-2">{item.service_name}</td>
                        <td className="py-2">{item.service_category ?? "-"}</td>
                        <td className="py-2 capitalize">
                          {item.line_type ?? "-"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {itemPrice(item)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {isPending && (
            <>
              <section className={cardClass}>
                <h2 className="mb-3 font-semibold">Discount &amp; Priority</h2>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-sm text-gray-600">
                      <Percent size={18} />
                      Discount Eligibility
                    </span>
                    <select
                      value={discount}
                      disabled={submitting}
                      onChange={(event) =>
                        setDiscount(event.target.value as DiscountType)
                      }
                      className={fieldClass}
                    >
                      <option value="Not Eligible">No discount</option>
                      {bill.is_senior && (
                        <option value="Senior Citizen">
                          Senior Citizen (20%)
                        </option>
                      )}
                      {bill.is_pwd && <option value="PWD">PWD (20%)</option>}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-sm text-gray-600">
                      <FlagTriangleRight size={18} />
                      Queue Priority
                    </span>
                    <select
                      value={priority ? "Yes" : "No"}
                      disabled={submitting}
                      onChange={(event) =>
                        setPriority(event.target.value === "Yes")
                      }
                      className={fieldClass}
                    >
                      <option value="No">Regular</option>
                      <option value="Yes">Priority</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className={cardClass}>
                <h2 className="mb-3 font-semibold">Payment Method</h2>
                <fieldset
                  disabled={submitting}
                  className="grid grid-cols-1 gap-3 md:grid-cols-2"
                >
                  <legend className="sr-only">Payment Method</legend>
                  {(["Cash", "Instapay/QRpH"] as const).map((option) => (
                    <label
                      key={option}
                      className={`flex cursor-pointer items-center gap-2 rounded border-2 px-3 py-2 text-sm ${method === option ? "border-sky-500 bg-sky-50 text-sky-700" : "border-gray-300"}`}
                    >
                      <input
                        type="radio"
                        name="payment-method"
                        value={option}
                        checked={method === option}
                        onChange={() => setMethod(option)}
                      />
                      {option === "Cash" ? (
                        <WalletMinimal size={18} />
                      ) : (
                        <QrCode size={18} />
                      )}
                      {option}
                    </label>
                  ))}
                </fieldset>

                {method === "Cash" ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="block text-sm text-gray-600">
                      <span className="mb-1 block">Cash Received</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label="Cash received"
                        value={cash}
                        disabled={submitting}
                        placeholder="0.00"
                        onChange={(event) => {
                          if (/^\d*\.?\d{0,2}$/.test(event.target.value))
                            setCash(event.target.value);
                        }}
                        className={fieldClass}
                      />
                      {insufficient && cash !== "" && (
                        <span className="mt-1 block text-xs text-red-600">
                          Cash received is less than the total.
                        </span>
                      )}
                    </label>
                    <div className="text-sm text-gray-600">
                      <span className="mb-1 block">Change</span>
                      <span className="font-semibold text-gray-900">
                        {peso(change)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <label className="mt-4 block text-sm text-gray-600">
                    <span className="mb-1 block">Transfer Reference</span>
                    <input
                      aria-label="Transfer reference"
                      value={reference}
                      maxLength={50}
                      disabled={submitting}
                      placeholder="Transaction reference number"
                      onChange={(event) => setReference(event.target.value)}
                      className={fieldClass}
                    />
                  </label>
                )}
              </section>
            </>
          )}
        </div>

        <aside className={`${cardClass} text-sm xl:col-span-2`}>
          <h2 className="mb-3 font-semibold">Payment Summary</h2>
          <dl>
            <Row
              label="Services"
              value={isPending ? items.length : bill.services.length}
            />
            <Row
              label="Subtotal"
              value={
                isPending
                  ? peso(subtotal)
                  : amountRecorded
                    ? peso(bill.subtotal)
                    : "Not recorded"
              }
            />
            <Row
              label="Discount"
              value={
                isPending
                  ? `- ${peso(discountAmount)}`
                  : amountRecorded
                    ? `- ${peso(bill.discount_amount)} ${bill.discount_type ? `(${bill.discount_type})` : ""}`
                    : "Not recorded"
              }
            />
          </dl>
          <div className="mt-3 flex items-center justify-between rounded-md border border-sky-300 bg-sky-50 px-2 py-3 font-semibold">
            <span className="text-xs">
              {isPending ? "Total Amount Due" : "Total Paid"}
            </span>
            <span className="text-lg text-sky-700">
              {isPending
                ? peso(total)
                : amountRecorded
                  ? peso(bill.total_amount)
                  : "Not recorded"}
            </span>
          </div>
          <dl className="mt-2">
            <Row
              label="Payment Method"
              value={
                isPending ? method : (bill.payment_method ?? "Not recorded")
              }
            />
            {!isPending && bill.reference_num && (
              <Row label="Reference" value={bill.reference_num} />
            )}
            {!isPending && bill.invoice_id && (
              <Row label="Invoice" value={bill.invoice_id} />
            )}
            {!isPending && (
              <Row
                label="Paid At"
                value={paid ? `${paid.date}, ${paid.time}` : "Not recorded"}
              />
            )}
            {!isPending && <Row label="Received by" value={bill.received_by} />}
            <Row
              label="Queue Priority"
              value={priority ? "Priority" : "Regular"}
            />
            <Row label="Laboratory" value={bill.laboratory_status} />
          </dl>
          {needsForwarding && (
            <p className="mt-3 flex gap-2 rounded-sm border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <Info size={18} className="shrink-0" />
              Payment is safe. Retrying only sends the tests to the laboratory
              and never charges the patient again.
            </p>
          )}
        </aside>
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-3 text-xs">
        <button
          type="button"
          disabled={submitting}
          onClick={onBack}
          className="cursor-pointer rounded-sm border border-gray-300 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Cancel" : "Back"}
        </button>
        {!isPending && amountRecorded && (
          <button
            type="button"
            onClick={() =>
              invoiceRef.current &&
              printInvoice(invoiceRef.current, `Invoice ${bill.bill_id}`)
            }
            className="flex cursor-pointer items-center gap-2 rounded-sm border border-gray-300 px-4 py-2"
          >
            <Printer size={14} />
            Print Invoice
          </button>
        )}
        {needsForwarding && (
          <button
            type="button"
            disabled={submitting}
            onClick={() => void onRetryForwarding()}
            className="flex cursor-pointer items-center gap-2 rounded-sm border border-sky-600 bg-sky-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && (
              <LoaderCircle
                size={14}
                className="animate-spin motion-reduce:animate-none"
              />
            )}
            {submitting ? "Forwarding..." : "Retry Laboratory Forwarding"}
          </button>
        )}
        {isPending && (
          <button
            type="button"
            disabled={!canPay}
            onClick={() => setConfirming(true)}
            className="flex cursor-pointer items-center gap-2 rounded-sm border border-sky-600 bg-sky-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-300"
          >
            {submitting && (
              <LoaderCircle
                size={14}
                className="animate-spin motion-reduce:animate-none"
              />
            )}
            {submitting ? "Saving..." : "Confirm & Record Payment"}
          </button>
        )}
      </div>

      {!isPending && amountRecorded && (
        <section ref={invoiceRef} hidden>
          <h2>Reyna G Medical Clinic</h2>
          <p>Diagnostic &amp; Medical Services</p>
          <h3>Invoice {bill.invoice_id ?? bill.bill_id}</h3>
          <p>Bill ID: {bill.bill_id}</p>
          <p>
            Patient: {bill.patient_name} ({bill.patient_id})
          </p>
          <p>Paid: {paid ? `${paid.date}, ${paid.time}` : "Not recorded"}</p>
          <p>Frontdesk Staff: {bill.received_by}</p>
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Category</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.item_id ?? index}>
                  <td>{item.service_name}</td>
                  <td>{item.service_category ?? "-"}</td>
                  <td>{itemPrice(item)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl>
            <dt>Subtotal</dt>
            <dd>{peso(bill.subtotal)}</dd>
            <dt>
              Discount {bill.discount_type ? `(${bill.discount_type})` : ""}
            </dt>
            <dd>{peso(bill.discount_amount)}</dd>
            <dt>
              <strong>Total Paid</strong>
            </dt>
            <dd>
              <strong>{peso(bill.total_amount)}</strong>
            </dd>
            <dt>Payment Method</dt>
            <dd>{bill.payment_method}</dd>
            {bill.reference_num && (
              <>
                <dt>Reference</dt>
                <dd>{bill.reference_num}</dd>
              </>
            )}
          </dl>
        </section>
      )}

      {confirming && (
        <ConfirmDialog
          title="Mark as Payment Received?"
          description={`This will record ${peso(total)} for ${bill.patient_name} and mark the bill as Paid. Any laboratory tests are forwarded after payment.`}
          confirmLabel="Payment Received"
          onCancel={() => setConfirming(false)}
          onConfirm={confirmPayment}
        />
      )}
    </div>
  );
}

export default ProcessPayment;

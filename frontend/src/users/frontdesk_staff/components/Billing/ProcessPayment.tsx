import { LoadingSpinner } from "../../../../components/LoadingScreen";
import { useRef, useState } from "react";
import { Download, Eye, FlagTriangleRight, Info, MoveLeft, Percent, Printer, QrCode, WalletMinimal } from "lucide-react";
import type {
  Bill,
  BillItem,
  BillingNotice,
  DiscountType,
  PaymentMethod,
  PaymentOptions,
  PaymentOutcome,
} from "../../../../interface/Billing";
import { formatAge, formatDateTime, peso } from "../../../../utils/formats";
import InvoiceDocument from "./InvoiceDocument";
import { printInvoice } from "./invoicePrint";
import BillingModal, { type BillingModalKind } from "./BillingModal";
import InvoicePreview from "./InvoicePreview";

type ProcessPaymentProps = {
  bill: Bill;
  items: BillItem[];
  submitting: boolean;
  error: string;
  notice: BillingNotice | null;
  onBack: () => void;
  onPay: (options: PaymentOptions) => Promise<PaymentOutcome>;
  onRetryForwarding: () => Promise<PaymentOutcome>;
};

const cardClass = "rounded-md border border-gray-200 bg-white p-4";
const fieldClass =
  "h-9 w-full rounded-sm border border-gray-300 bg-white px-3 text-sm text-gray-600 outline-none focus:border-sky-400 disabled:bg-gray-100";
const round2 = (value: number) => Math.round(value * 100) / 100;
const itemPrice = (item: BillItem) =>
  item.price === null
    ? "Not recorded"
    : peso(Number(item.price) * (item.quantity ?? 1));

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
  const [modal, setModal] = useState<BillingModalKind | null>(null);
  const [modalError, setModalError] = useState("");
  const [paymentOutcome, setPaymentOutcome] = useState<Extract<
    PaymentOutcome,
    { status: "recorded" }
  > | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const returnFocusRef = useRef<HTMLElement>(null);
  const previewHeadingRef = useRef<HTMLHeadingElement>(null);
  const pageHeadingRef = useRef<HTMLHeadingElement>(null);
  const retryingForwarding = useRef(false);
  const forwardedFromRetry = useRef(false);
  const [forwardError, setForwardError] = useState("");
  const focusPreviewOnClose = useRef(false);
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [printError, setPrintError] = useState("");
  const invoiceRef = useRef<HTMLElement>(null);

  const isPending = bill.status === "Pending";
  const needsForwarding = bill.laboratory_status === "Needs forwarding";
  const amountRecorded = Boolean(
    bill.payment_method && bill.payment_method !== "Not recorded",
  );

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
    !paymentOutcome &&
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
    if (!canPay) return;
    setModalError("");
    try {
      const outcome = await onPay({
        payment_method: method,
        discount_type: discount,
        amount_received: method === "Cash" ? received : null,
        reference_num: method === "Cash" ? "" : reference.trim(),
        priority,
      });
      if (outcome.status === "recorded") {
        forwardedFromRetry.current = false;
        setPaymentOutcome(outcome);
        setModal("received");
      } else {
        setModal("failed");
      }
    } catch {
      setModal("failed");
      setModalError(
        "The payment could not be confirmed. Refresh this bill before retrying.",
      );
    }
  }

  async function retryForwarding(trigger: HTMLElement) {
    if (submitting || retryingForwarding.current) return;
    retryingForwarding.current = true;
    focusPreviewOnClose.current = false;
    returnFocusRef.current = trigger;
    setForwardError("");
    try {
      const outcome = await onRetryForwarding();
      if (outcome.status === "recorded" && outcome.forwarded) {
        forwardedFromRetry.current = true;
        setModalError("");
        setModal("forwarded");
      }
    } catch {
      setForwardError(
        "The payment is recorded, but forwarding could not be confirmed. Please try forwarding again.",
      );
    } finally {
      retryingForwarding.current = false;
    }
  }

  async function handlePrintInvoice() {
    if (printing || !invoiceRef.current) return;
    setPrinting(true);
    setPrintError("");
    try {
      await printInvoice(
        invoiceRef.current,
        `Invoice ${bill.invoice_id || bill.bill_id}`,
      );
      setModal(null);
    } catch (cause) {
      setPrintError(
        cause instanceof Error
          ? cause.message
          : "Unable to print the invoice. Please try again.",
      );
      setModalError(
        cause instanceof Error
          ? cause.message
          : "Unable to print the invoice. Please try again.",
      );
    } finally {
      setPrinting(false);
    }
  }

  async function handleDownloadInvoice() {
    if (downloading || !invoiceRef.current) return;
    setDownloading(true);
    setModalError("");
    try {
      const { downloadInvoicePdf } = await import("./invoicePdf");
      await downloadInvoicePdf(
        invoiceRef.current,
        bill.invoice_id || bill.bill_id,
      );
      setModal(null);
    } catch (cause) {
      setModalError(
        cause instanceof Error
          ? cause.message
          : "Unable to download the invoice. Please try again.",
      );
    } finally {
      setDownloading(false);
    }
  }

  function openModal(kind: BillingModalKind, trigger: HTMLElement) {
    focusPreviewOnClose.current = false;
    returnFocusRef.current = trigger;
    setModalError("");
    setPrintError("");
    setModal(kind);
  }

  function closeModal() {
    setModalError("");
    if (modal === "received" && paymentOutcome?.forwarded)
      setModal("forwarded");
    else if (
      (modal === "received" ||
        (modal === "forwarded" && !forwardedFromRetry.current)) &&
      paymentOutcome?.invoiceReady
    )
      setModal("generated");
    else setModal(null);
  }

  function viewInvoice() {
    focusPreviewOnClose.current = true;
    setShowInvoice(true);
    setModal(null);
    requestAnimationFrame(() => previewHeadingRef.current?.focus());
  }

  function goBack() {
    if (showInvoice) setShowInvoice(false);
    else onBack();
  }

  async function confirmModal() {
    if (modal === "payment") await confirmPayment();
    else if (modal === "print") await handlePrintInvoice();
    else if (modal === "download") await handleDownloadInvoice();
    else closeModal();
  }

  return (
    <div>
      <button
        type="button"
        disabled={submitting}
        onClick={goBack}
        className="mb-5 flex cursor-pointer items-center gap-2 rounded-2xl border border-sky-300 bg-sky-50 px-3 py-1 text-xs text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MoveLeft size={14} />
        {showInvoice ? "Back to Payment Details" : "Back to Billing"}
      </button>

      <h1
        ref={pageHeadingRef}
        tabIndex={-1}
        className="text-2xl font-bold outline-none"
      >
        {showInvoice
          ? "Invoice"
          : isPending
            ? "Process Payment"
            : "Payment Details"}
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

      {showInvoice && !isPending && (
        <InvoicePreview
          bill={bill}
          items={items}
          headingRef={previewHeadingRef}
        />
      )}
      <div
        className={
          showInvoice
            ? "hidden"
            : "mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-7"
        }
      >
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

      {forwardError && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {forwardError}
        </p>
      )}
      {printError && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {printError}
        </p>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-3 text-xs">
        <button
          type="button"
          disabled={submitting}
          onClick={goBack}
          className="cursor-pointer rounded-sm border border-gray-300 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Cancel" : "Back"}
        </button>
        {!isPending && amountRecorded && (
          <>
            {!showInvoice && (
              <button
                type="button"
                onClick={viewInvoice}
                className="flex cursor-pointer items-center gap-2 rounded-sm border border-gray-300 px-4 py-2"
              >
                <Eye size={14} />
                View Invoice
              </button>
            )}
            <button
              type="button"
              onClick={(event) => openModal("print", event.currentTarget)}
              disabled={printing || downloading}
              aria-busy={printing}
              className="flex cursor-pointer items-center gap-2 rounded-sm border border-gray-300 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {printing ? (
                <LoadingSpinner size={14} />
              ) : (
                <Printer size={14} />
              )}
              {printing ? "Preparing Invoice..." : "Print Invoice"}
            </button>
            <button
              type="button"
              onClick={(event) => openModal("download", event.currentTarget)}
              disabled={printing || downloading}
              className="flex cursor-pointer items-center gap-2 rounded-sm border border-gray-300 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={14} />
              Download PDF
            </button>
          </>
        )}
        {needsForwarding && (
          <button
            type="button"
            disabled={submitting}
            onClick={(event) => void retryForwarding(event.currentTarget)}
            className="flex cursor-pointer items-center gap-2 rounded-sm border border-sky-600 bg-sky-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && (
              <LoadingSpinner size={14} />
            )}
            {submitting ? "Forwarding..." : "Retry Laboratory Forwarding"}
          </button>
        )}
        {isPending && (
          <button
            type="button"
            disabled={!canPay}
            onClick={(event) => openModal("payment", event.currentTarget)}
            className="flex cursor-pointer items-center gap-2 rounded-sm border border-sky-600 bg-sky-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-300"
          >
            {submitting && (
              <LoadingSpinner size={14} />
            )}
            {submitting ? "Saving..." : "Confirm & Record Payment"}
          </button>
        )}
      </div>

      {!isPending && amountRecorded && (
        <section ref={invoiceRef} hidden>
          <InvoiceDocument bill={bill} items={items} />
        </section>
      )}

      <BillingModal
        kind={modal}
        busy={submitting || printing || downloading}
        error={
          modalError || (modal === "payment" || modal === "failed" ? error : "")
        }
        alreadyPaid={paymentOutcome?.alreadyPaid}
        returnFocusRef={returnFocusRef}
        finalFocus={() =>
          focusPreviewOnClose.current
            ? previewHeadingRef.current
            : returnFocusRef.current?.isConnected
              ? returnFocusRef.current
              : pageHeadingRef.current
        }
        onClose={closeModal}
        onConfirm={confirmModal}
        onViewInvoice={viewInvoice}
      />
    </div>
  );
}

export default ProcessPayment;

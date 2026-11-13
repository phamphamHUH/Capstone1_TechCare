import type { Bill, BillItem } from "../../../../../../interface/Billing";
import { CLINIC_INFO } from "../../../../../../lib/clinicInfo";
import { formatDateTime, peso } from "../../../../../../utils/formats";

const recordedAmount = (value: number | string | null | undefined) =>
  value == null ? "Not recorded" : peso(value);

type InvoiceDocumentProps = {
  bill: Bill;
  items: BillItem[];
};

/** The invoice uses the saved payment, including its historical prices and discount. */
export default function InvoiceDocument({ bill, items }: InvoiceDocumentProps) {
  const paid = formatDateTime(bill.paid_at);
  const invoiceNumber = bill.invoice_id || bill.bill_id;

  return (
    <article className="invoice-sheet" aria-label={`Invoice ${invoiceNumber}`}>
      <img
        className="invoice-watermark"
        src={CLINIC_INFO.logoUrl}
        alt=""
        aria-hidden="true"
      />
      <header className="invoice-header">
        <div className="invoice-logo-frame">
          <img
            className="invoice-logo"
            src={CLINIC_INFO.logoUrl}
            alt="Reyna G"
          />
        </div>
        <div>
          <h1>{CLINIC_INFO.name.toUpperCase()}</h1>
          <p className="invoice-address">{CLINIC_INFO.address}</p>
          <p className="invoice-contact">TEL #: {CLINIC_INFO.phone}</p>
        </div>
      </header>

      <div className="invoice-title">
        <h2>INVOICE</h2>
        <span>{bill.status.toUpperCase()}</span>
      </div>
      <dl className="invoice-details">
        <div>
          <dt>Invoice No.:</dt>
          <dd>{invoiceNumber}</dd>
        </div>
        <div>
          <dt>Paid At:</dt>
          <dd>{paid ? `${paid.date}, ${paid.time}` : "Not recorded"}</dd>
        </div>
        <div>
          <dt>Patient:</dt>
          <dd className="invoice-patient-name">
            {bill.patient_name || "Not recorded"}
          </dd>
        </div>
        <div>
          <dt>Patient ID:</dt>
          <dd>{bill.patient_id || "Not recorded"}</dd>
        </div>
        <div>
          <dt>Bill ID:</dt>
          <dd>{bill.bill_id}</dd>
        </div>
        <div>
          <dt>Received By:</dt>
          <dd>{bill.received_by || "Not recorded"}</dd>
        </div>
      </dl>

      <table className="invoice-items" aria-label="Invoice services">
        <colgroup>
          <col className="invoice-number-column" />
          <col className="invoice-service-column" />
          <col className="invoice-category-column" />
          <col className="invoice-quantity-column" />
          <col className="invoice-price-column" />
          <col className="invoice-amount-column" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Service</th>
            <th scope="col">Category</th>
            <th scope="col" className="invoice-quantity">
              Qty
            </th>
            <th scope="col" className="invoice-money">
              Unit Price
            </th>
            <th scope="col" className="invoice-money">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length ? (
            items.map((item, index) => (
              <tr key={item.item_id ?? index}>
                <td>{index + 1}</td>
                <th scope="row">{item.service_name}</th>
                <td>{item.service_category || "—"}</td>
                <td className="invoice-quantity">{item.quantity ?? 1}</td>
                <td className="invoice-money">{recordedAmount(item.price)}</td>
                <td className="invoice-money">
                  {item.price == null
                    ? "Not recorded"
                    : peso(Number(item.price) * (item.quantity ?? 1))}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6}>
                No itemized services were saved for this bill.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <section className="invoice-summary" aria-label="Payment summary">
        <dl className="invoice-payment">
          <div>
            <dt>Payment Method</dt>
            <dd>{bill.payment_method || "Not recorded"}</dd>
          </div>
          {bill.reference_num && (
            <div>
              <dt>Transfer Reference</dt>
              <dd>{bill.reference_num}</dd>
            </div>
          )}
        </dl>
        <dl className="invoice-totals">
          <div>
            <dt>Subtotal</dt>
            <dd>{recordedAmount(bill.subtotal)}</dd>
          </div>
          <div>
            <dt>
              Discount
              {bill.discount_type && bill.discount_type !== "Not Eligible"
                ? ` (${bill.discount_type})`
                : ""}
            </dt>
            <dd>
              {bill.discount_amount == null
                ? "Not recorded"
                : `− ${peso(bill.discount_amount)}`}
            </dd>
          </div>
          <div className="invoice-total">
            <dt>Total Paid</dt>
            <dd>{recordedAmount(bill.total_amount)}</dd>
          </div>
        </dl>
      </section>
      <footer className="invoice-footer">
        <p>Thank you for choosing {CLINIC_INFO.name}.</p>
        <p>
          {invoiceNumber} · {bill.bill_id}
        </p>
      </footer>
    </article>
  );
}

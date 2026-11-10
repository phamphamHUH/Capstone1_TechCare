import { layout, type DetailRow, type Email } from "./layout.js";

export type ReceiptInfo = {
  receiptNumber: string;
  paidAt: Date | string;
  paymentMethod: string;
  referenceNumber?: string | null;
  items: { name: string; amount: number }[];
  discountLabel?: string | null; // e.g. "Senior Citizen"
  discountAmount: number;
  total: number;
};

const peso = (amount: number) =>
  `₱${Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// PATIENT: a bill was paid at the front desk.
export function paymentReceiptEmail(to: string, firstName: string, receipt: ReceiptInfo): Email {
  const paidAt = new Date(receipt.paidAt).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const details: DetailRow[] = [
    { label: "Receipt no.", value: receipt.receiptNumber },
    { label: "Date", value: paidAt },
    { label: "Payment", value: receipt.paymentMethod },
    ...(receipt.referenceNumber ? [{ label: "Reference no.", value: receipt.referenceNumber }] : []),
    ...receipt.items.map((item) => ({ label: item.name, value: peso(item.amount) })),
    ...(receipt.discountAmount > 0
      ? [
          {
            label: receipt.discountLabel ? `Discount (${receipt.discountLabel})` : "Discount",
            value: `-${peso(receipt.discountAmount)}`,
          },
        ]
      : []),
    { label: "Total paid", value: peso(receipt.total), strong: true },
  ];

  return {
    to,
    subject: `Payment received: ${peso(receipt.total)}`,
    html: layout({
      preview: `We received your payment of ${peso(receipt.total)}. Receipt ${receipt.receiptNumber}.`,
      heading: "Payment received",
      greeting: `Hi ${firstName},`,
      paragraphs: ["Thank you. We received your payment. Here is a copy of your receipt."],
      details,
      note: "Keep this email for your records. For billing questions, please contact the clinic front desk.",
    }),
  };
}

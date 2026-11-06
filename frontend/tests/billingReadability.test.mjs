import assert from "node:assert/strict";
import { after, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const server = await createServer({ cacheDir: "../../.tmp/billing-release-test-cache", server: { middlewareMode: true }, appType: "custom" });
after(() => server.close());
const base = "/src/users/frontdesk_staff/components/Billing/";
const { default: BillingDialog } = await server.ssrLoadModule(`${base}BillingDialog.tsx`);
const { default: ProcessPayment } = await server.ssrLoadModule(`${base}ProcessPayment.tsx`);
const { billEntry, invoiceForBill } = await server.ssrLoadModule(`${base}billingModel.ts`);
const { INVOICE_PRINT_CSS } = await server.ssrLoadModule(`${base}invoiceOutput.ts`);
const { formatPatientAddress } = await server.ssrLoadModule("/src/utils/formats.ts");
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const noop = () => {};
const patient = { patient_id: "P-TEST", first_name: "Juan", last_name: "Test", sex: "Male", birthdate: "1950-01-01", is_pwd: false };
const bill = { bill_id: "B-TEST", patient_id: "P-TEST", patient_name: "Juan Test", status: "Pending", created_at: "2026-11-06T08:00:00Z", paid_at: null, total_amount: "1150.00", discount_rate: 0, discount_type: null, payment_method: "Cash", is_senior: true, age: 76 };
const items = [
  { line_type: "consultation", service_id: "S-C", service_name: "Consultation", service_category: "Consultation", quantity: 1, price: 500 },
  { line_type: "laboratory", service_id: "S-L", service_name: "CBC", service_category: "Hematology", quantity: 1, price: 650 },
];
const process = (entry) => render(ProcessPayment, { entry, onBack: noop, onConfirm: noop, submitting: false, error: "" });

for (const [kind, title, label] of [
  ["print", "Print Invoice?", "Print Invoice"], ["download", "Download Invoice?", "Download PDF"],
  ["confirm-payment", "Mark as Payment Received?", "Payment Received"],
  ["payment-received", "Payment Received", "OK"], ["invoice-generated", "Invoice Generated", "OK"],
  ["request-forwarded", "Request Forwarded", "OK"], ["remove-service", "Remove Service?", "Remove"],
  ["discard-changes", "Discard Changes?", "Discard Changes"], ["payment-failed", "Payment Failed", "OK"],
]) {
  test(`${kind} dialog retains its accessible title and action`, () => {
    const html = render(BillingDialog, { kind, onConfirm: noop, onCancel: ["print","download","confirm-payment","remove-service","discard-changes"].includes(kind) ? noop : undefined, onSecondary: kind === "invoice-generated" ? noop : undefined });
    assert.ok(html.includes(title)); assert.ok(html.includes(label));
    assert.match(html, /aria-modal="true"/); assert.match(html, /aria-labelledby=/);
    if (kind === "invoice-generated") assert.match(html, /View Invoice/);
    if (kind === "discard-changes") assert.match(html, /Keep Editing/);
  });
}

test("canonical mixed bills render the payment form with safe cash validation", () => {
  const entry = billEntry(bill, [patient], [], items);
  assert.equal(entry.id, "B-TEST"); assert.equal(entry.type, "Mixed services");
  const html = process(entry);
  assert.match(html, /Process Payment/); assert.match(html, /Consultation/); assert.match(html, /CBC/);
  assert.match(html, /Cash received/); assert.match(html, /Senior Citizen \(20% Discount\)/);
  assert.match(html, /disabled=""[^>]*>Confirm &amp; Record Payment/);
});

test("PWD eligibility and canonical bank transfer option survive integration", () => {
  const entry = billEntry({ ...bill, is_senior: false, age: 30, is_pwd: true, payment_method: "Instapay/QRpH" }, [{ ...patient, birthdate: "1996-01-01" }], [], items);
  const html = process(entry);
  assert.match(html, /PWD \(20% Discount\)/); assert.match(html, /Transfer reference/);
  assert.match(html, /Instapay\/QRpH/); assert.match(html, /disabled=""[^>]*>Confirm &amp; Record Payment/);
});

test("saved invoices use original prices and paid recovery offers forwarding only", () => {
  const paid = { ...bill, status: "Paid", needs_lab_queue: true, total_amount: 920, discount_type: "Senior Citizen", discount_rate: 20, receipt_id: "R-TEST", paid_at: "2026-11-06T09:00:00Z", items };
  const entry = billEntry(paid, [patient], [{ service_id: "S-L", price: 9999 }]);
  const invoice = invoiceForBill(entry);
  assert.equal(invoice.items[1].price, 650); assert.equal(invoice.total_amount, 920); assert.equal(invoice.receipt_id, "R-TEST");
  const html = process(entry);
  assert.match(html, /Send to Laboratory/); assert.doesNotMatch(html, /aria-label="Cash received"/);
  assert.equal(invoiceForBill(billEntry({ ...paid, items: [{ service_id: "S-L", service_name: "CBC" }] }, [patient], [{ service_id: "S-L", price: 9999 }])), null);
});

test("payment retains cancel navigation and export uses readable paginated A4", () => {
  assert.match(process(billEntry(bill, [patient], [], items)), />Cancel<\/button>/);
  assert.match(INVOICE_PRINT_CSS, /size: A4 portrait/);
  assert.match(INVOICE_PRINT_CSS, /font-size: 16px/);
  assert.match(INVOICE_PRINT_CSS, /table-header-group/); assert.match(INVOICE_PRINT_CSS, /break-inside: avoid/);
});

test("structured patient addresses display release fields with legacy fallback", () => {
  assert.equal(formatPatientAddress({ street: " Test Street ", city: "Manila", zip_code: "1000" }), "Test Street, Manila, 1000");
  assert.equal(formatPatientAddress({ address: "Old address" }), "Old address");
  assert.equal(formatPatientAddress({}), "Not recorded");
});

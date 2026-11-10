import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { after, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const server = await createServer({ cacheDir: "node_modules/.cache/billing-test", server: { middlewareMode: true }, appType: "custom" });
after(() => server.close());
const base = "/src/users/frontdesk_staff/components/Billing/";
const { default: BillingStats } = await server.ssrLoadModule(`${base}BillingStats.tsx`);
const { default: BillingTable } = await server.ssrLoadModule(`${base}BillingTable.tsx`);
const { default: ProcessPayment } = await server.ssrLoadModule(`${base}ProcessPayment.tsx`);
const { default: Billing } = await server.ssrLoadModule("/src/users/frontdesk_staff/pages/Billing.tsx");
const { default: ConfirmDialog } = await server.ssrLoadModule("/src/components/ConfirmDialog.tsx");

const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const noop = () => {};
const bill = {
  bill_id: "B-26-1107-0001", patient_id: "P-TEST", patient_name: "Juan Test", sex: "Male",
  birthdate: "1950-01-01", age: 76, is_senior: true, is_pwd: false, status: "Pending", subtotal: "1150.00",
  discount_type: null, discount_amount: "0.00", total_amount: "1150.00", payment_method: "Cash",
  reference_num: null, receipt_id: null, paid_at: null, created_at: "2026-11-06T08:00:00Z",
  services: ["Consultation", "CBC", "Urinalysis"], laboratory_status: "Waiting for payment", is_priority: false,
};
const paid = { ...bill, bill_id: "B-26-1107-0002", status: "Paid", total_amount: "920.00", discount_amount: "230.00", discount_type: "Senior Citizen", payment_method: "Instapay/QRpH", reference_num: "TX-1", receipt_id: "R-1", paid_at: "2026-11-06T09:00:00Z", laboratory_status: "Forwarded" };
const items = [
  { line_type: "consultation", item_id: "C-1", service_name: "Consultation", service_category: "Consultation", quantity: 1, price: "500.00" },
  { line_type: "laboratory", item_id: "I-1", service_name: "CBC", service_category: "Hematology", quantity: 1, price: "650.00" },
];
const processProps = { bill, items, submitting: false, error: "", notice: null, onBack: noop, onPay: noop, onRetryForwarding: noop };
const tableProps = { variant: "queue", loading: false, emptyMessage: "No pending bills.", onOpen: noop };
const pageProps = { bills: [], loading: false, error: "", loadData: async () => {} };

test("one bill list feeds the tabs and the statistics", () => {
  const awaiting = { ...paid, bill_id: "B-3", laboratory_status: "Needs forwarding" };
  const html = render(Billing, { ...pageProps, bills: [bill, paid, awaiting] });
  assert.match(html, /Pending Billing Queue \(1\)/); assert.match(html, /Paid Payment History \(2\)/);
  assert.match(html, /1 paid bill still needs/);
  assert.ok(html.includes(bill.bill_id)); assert.ok(!html.includes(paid.bill_id), "paid bills stay on the history tab");
});

test("the stat cards render the numbers they are given", () => {
  const html = render(BillingStats, { stats: { total: 12, pending: 7, paid: 5, awaitingLaboratory: 2 } });
  for (const text of ["Total Bills", "Pending Payment", "Awaiting Laboratory", ">12<", ">7<", ">5<", ">2<"]) assert.ok(html.includes(text), text);
});

test("the table shows bill ID, patient, services, total, method and lab status", () => {
  const queue = render(BillingTable, { ...tableProps, bills: [bill] });
  for (const text of [bill.bill_id, "Juan Test", "P-TEST", "Consultation", "CBC", "+1 more", "1,150.00", "Awaiting payment", "Waiting for payment", "Process Payment"]) assert.ok(queue.includes(text), text);
  const history = render(BillingTable, { ...tableProps, variant: "history", bills: [paid] });
  for (const text of ["Instapay/QRpH", "920.00", ">Forwarded<", ">View<"]) assert.ok(history.includes(text), text);
  assert.match(render(BillingTable, { ...tableProps, variant: "history", bills: [{ ...paid, laboratory_status: "Needs forwarding" }] }), /Retry Forwarding/);
});

test("the table has distinct loading and empty states", () => {
  assert.match(render(BillingTable, { ...tableProps, bills: [], loading: true }), /Loading bills/);
  assert.match(render(BillingTable, { ...tableProps, bills: [] }), /No pending bills/);
});

test("an unrecorded legacy payment is shown honestly, not as a zero charge", () => {
  const recovered = { ...paid, payment_method: "Not recorded", total_amount: "0.00", laboratory_status: "Needs forwarding" };
  const html = render(BillingTable, { ...tableProps, variant: "history", bills: [recovered] });
  assert.match(html, /Not recorded/); assert.doesNotMatch(html, /₱0\.00/);
  const details = render(ProcessPayment, { ...processProps, bill: recovered, items: [{ service_name: "CBC", price: null }] });
  assert.match(details, /Retry Laboratory Forwarding/); assert.doesNotMatch(details, /Print Receipt/); assert.doesNotMatch(details, /₱0\.00/);
});

test("the billing page renders loading, error and empty states without fake data", () => {
  assert.match(render(Billing, { ...pageProps, loading: true }), /Loading bills/);
  const failed = render(Billing, { ...pageProps, error: "Bills could not be loaded." });
  assert.match(failed, /role="alert"/); assert.doesNotMatch(failed, /Try Again/); assert.doesNotMatch(failed, /No pending bills/);
  const empty = render(Billing, pageProps);
  assert.match(empty, /No pending bills/); assert.match(empty, /Pending Billing Queue \(0\)/); assert.match(empty, /Paid Payment History \(0\)/);
  assert.match(empty, /Refresh/); assert.doesNotMatch(empty, /₱/);
});

test("a pending bill renders the form with the discount and confirm disabled until valid", () => {
  const html = render(ProcessPayment, processProps);
  for (const text of ["Process Payment", "Consultation", "CBC", "Cash received", "Senior Citizen (20%)", "1,150.00", "230.00", "920.00"]) assert.ok(html.includes(text), text);
  assert.match(html, /disabled=""[^>]*>Confirm &amp; Record Payment/);
  assert.doesNotMatch(html, /PWD \(20%\)/);
  assert.match(render(ProcessPayment, { ...processProps, bill: { ...bill, is_senior: false, is_pwd: true } }), /PWD \(20%\)/);
});

test("a paid bill shows saved amounts and offers retry only when needed", () => {
  const html = render(ProcessPayment, { ...processProps, bill: paid });
  for (const text of ["Payment Details", "920.00", "Instapay/QRpH", "TX-1", "R-1", "Print Receipt"]) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /Confirm &amp; Record/); assert.doesNotMatch(html, /Retry Laboratory Forwarding/);
  assert.match(render(ProcessPayment, { ...processProps, bill: { ...paid, laboratory_status: "Needs forwarding" } }), /Retry Laboratory Forwarding/);
});

test("payment notices and errors are shown", () => {
  const html = render(ProcessPayment, { ...processProps, bill: paid, error: "Server said no", notice: { tone: "warning", text: "Forwarding failed" } });
  assert.match(html, /role="alert"[^>]*>Server said no/); assert.match(html, /Forwarding failed/);
});

test("the shared confirm dialog is accessible", () => {
  const html = render(ConfirmDialog, { title: "Remove Service?", description: "Sure?", confirmLabel: "Remove", cancelLabel: "Keep", onConfirm: noop, onCancel: noop });
  for (const text of ["Remove Service?", "Sure?", "Remove", "Keep"]) assert.ok(html.includes(text), text);
  assert.match(html, /aria-modal="true"/); assert.match(html, /aria-labelledby=/);
});

test("the billing folder holds only its components and no CSS", async () => {
  const folder = new URL("../src/users/frontdesk_staff/components/Billing/", import.meta.url);
  assert.deepEqual((await readdir(folder)).sort(), ["BillingStats.tsx", "BillingTable.tsx", "ProcessPayment.tsx"]);
  const css = await readFile(new URL("../src/index.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /billing|invoice|fd-dialog/);
});

test("the shell makes exactly one billing request", async () => {
  const shell = await readFile(new URL("../src/users/frontdesk_staff/FrontdeskStaff.tsx", import.meta.url), "utf8");
  assert.deepEqual(shell.match(/\/api\/fdstaff\/billing[^"]*/g), ["/api/fdstaff/billings"]);
});

test("local development can never silently reach a deployed backend", async () => {
  const config = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");
  assert.match(config, /"http:\/\/localhost:5000"/); assert.doesNotMatch(config, /onrender/);
  assert.equal(server.config.server.proxy["/api"].target, process.env.API_PROXY_TARGET || "http://localhost:5000");
});

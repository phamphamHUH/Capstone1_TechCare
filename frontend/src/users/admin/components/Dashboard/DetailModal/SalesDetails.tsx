import { useEffect, useState } from "react";
import api from "../../../../../lib/axios";
import type {
  AnalyticsBill,
  AnalyticsBills,
  AnalyticsRange,
  SalesAnalytics,
} from "../../../../../interface/Analytics";
import { BarList, DataTable, FigureRow, SectionTitle, type Column } from "./DetailParts";
import {
  formatDateTime,
  formatNumber,
  formatPeso,
  percentChange,
  serviceTypeColor,
  serviceTypeLabel,
} from "../formatters";

export type SalesDetailKind = "revenue" | "paid-bills" | "average-bill" | "discounts" | "outstanding";

type SalesDetailsProps = {
  kind: SalesDetailKind;
  range: AnalyticsRange;
  previousLabel: string; // e.g. "previous 30 days"
  sales: SalesAnalytics;
};

// "Nov 7, 2026 · 1:03 PM" from a Manila wall-clock string.
function formatStamp(value: string | null) {
  if (!value) return "—";
  const [, time = ""] = value.split("T");
  const [hour = 0, minute = 0] = time.split(":").map(Number);
  const suffix = hour < 12 ? "AM" : "PM";
  return `${formatDateTime(value)} · ${hour % 12 === 0 ? 12 : hour % 12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

// Whole days since a Manila wall-clock time.
function daysSince(value: string) {
  const then = Date.parse(`${value}+08:00`);
  return Number.isNaN(then) ? 0 : Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

const patientCell = (bill: AnalyticsBill) => (
  <>
    <p className="text-gray-900">{bill.patient_name ?? "Unknown patient"}</p>
    <p className="text-xs text-gray-400">{bill.patient_id}</p>
  </>
);

const billCell = (bill: AnalyticsBill) => <span className="font-mono text-xs text-gray-600">{bill.bill_id}</span>;

// Columns used by more than one modal.
const paidColumns: Column<AnalyticsBill>[] = [
  { key: "paid", header: "Paid", render: (bill) => <span className="whitespace-nowrap text-gray-600">{formatStamp(bill.paid_at)}</span> },
  { key: "bill", header: "Bill", render: billCell },
  { key: "patient", header: "Patient", render: patientCell },
  { key: "method", header: "Payment", render: (bill) => <span className="text-gray-600">{bill.payment_method ?? "—"}</span> },
  { key: "items", header: "Items", align: "right", render: (bill) => formatNumber(bill.item_count) },
  { key: "total", header: "Total", align: "right", render: (bill) => <span className="font-medium text-gray-900">{formatPeso(bill.total_amount)}</span> },
];

// Loads the bills behind the sales tiles for the selected range.
function useAnalyticsBills(range: AnalyticsRange) {
  const [data, setData] = useState<AnalyticsBills | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setError(null);
      try {
        const response = await api.get<AnalyticsBills>("/api/admin/analytics/bills", {
          params: { range },
        });
        if (!ignore) setData(response.data);
      } catch (loadError) {
        console.error("Error loading bills:", loadError);
        if (!ignore) setError("Could not load the bills. Close this window and try again.");
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [range]);

  return { data, error };
}

// Content of the modal opened from a sales tile.
function SalesDetails({ kind, range, previousLabel, sales }: SalesDetailsProps) {
  const { data, error } = useAnalyticsBills(range);
  const summary = sales.summary;

  if (error) {
    return <p role="alert" className="m-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>;
  }
  if (!data) {
    return <p className="px-6 py-16 text-center text-sm text-gray-400">Loading bills…</p>;
  }

  const paid = data.paid;

  if (kind === "revenue") {
    const change = percentChange(summary.revenue, summary.previous_revenue);

    return (
      <>
        <FigureRow
          figures={[
            { label: "Gross sales", value: formatPeso(summary.gross_sales), note: "Before discounts" },
            { label: "Discounts", value: `− ${formatPeso(summary.discounts)}` },
            { label: "Revenue", value: formatPeso(summary.revenue), note: "Collected" },
            {
              label: `Vs ${previousLabel}`,
              value: change === null ? "—" : `${change >= 0 ? "+" : "−"}${Math.abs(change).toFixed(1)}%`,
              note: `${formatPeso(summary.previous_revenue)} before`,
            },
          ]}
        />

        <SectionTitle aside="Before discounts">By service type</SectionTitle>
        <BarList
          rows={sales.service_types.map((type) => ({
            key: type.service_type,
            label: `${serviceTypeLabel(type.service_type)} · ${formatNumber(type.quantity)} items`,
            value: type.revenue,
            display: formatPeso(type.revenue),
            color: serviceTypeColor(type.service_type),
          }))}
        />

        <SectionTitle aside={`${paid.length} paid ${paid.length === 1 ? "bill" : "bills"}`}>Paid bills</SectionTitle>
        <DataTable rows={paid} columns={paidColumns} rowKey={(bill) => bill.bill_id} empty="No paid bills in this period" />
      </>
    );
  }

  if (kind === "paid-bills") {
    const cash = paid.filter((bill) => bill.payment_method === "Cash").length;

    return (
      <>
        <FigureRow
          figures={[
            { label: "Paid bills", value: formatNumber(paid.length) },
            { label: `Vs ${previousLabel}`, value: formatNumber(summary.previous_paid_bills), note: "Paid bills before" },
            { label: "Paid in cash", value: formatNumber(cash) },
            { label: "Other methods", value: formatNumber(paid.length - cash) },
          ]}
        />

        <SectionTitle>By payment method</SectionTitle>
        <BarList
          rows={sales.payment_methods.map((method) => ({
            key: method.payment_method,
            label: `${method.payment_method} · ${method.bills} ${method.bills === 1 ? "bill" : "bills"}`,
            value: method.revenue,
            display: formatPeso(method.revenue),
          }))}
        />

        <SectionTitle aside="Newest first">All paid bills</SectionTitle>
        <DataTable rows={paid} columns={paidColumns} rowKey={(bill) => bill.bill_id} empty="No paid bills in this period" />
      </>
    );
  }

  if (kind === "average-bill") {
    const totals = paid.map((bill) => bill.total_amount);
    const byAmount = [...paid].sort((a, b) => b.total_amount - a.total_amount);

    return (
      <>
        <FigureRow
          figures={[
            { label: "Average", value: formatPeso(summary.average_bill) },
            { label: "Median", value: formatPeso(median(totals)), note: "Middle bill" },
            { label: "Smallest", value: formatPeso(totals.length ? Math.min(...totals) : 0) },
            { label: "Largest", value: formatPeso(totals.length ? Math.max(...totals) : 0) },
          ]}
        />

        <SectionTitle aside="Largest first">Bills by amount</SectionTitle>
        <DataTable rows={byAmount} columns={paidColumns} rowKey={(bill) => bill.bill_id} empty="No paid bills in this period" />
      </>
    );
  }

  if (kind === "discounts") {
    const discounted = paid.filter((bill) => bill.discount_amount > 0);
    const byType = new Map<string, { count: number; amount: number }>();
    for (const bill of discounted) {
      const type = bill.discount_type ?? "Other";
      const current = byType.get(type) ?? { count: 0, amount: 0 };
      byType.set(type, { count: current.count + 1, amount: current.amount + bill.discount_amount });
    }

    return (
      <>
        <FigureRow
          figures={[
            { label: "Discounts given", value: formatPeso(summary.discounts) },
            { label: "Discounted bills", value: formatNumber(discounted.length), note: `Of ${paid.length} paid` },
            {
              label: "Share of gross",
              value: summary.gross_sales > 0 ? `${((summary.discounts / summary.gross_sales) * 100).toFixed(1)}%` : "—",
            },
            { label: "Gross sales", value: formatPeso(summary.gross_sales) },
          ]}
        />

        <SectionTitle>By discount type</SectionTitle>
        {byType.size === 0 ? (
          <p className="px-6 pb-2 text-sm text-gray-400">No discounts in this period</p>
        ) : (
          <BarList
            rows={[...byType.entries()].map(([type, value]) => ({
              key: type,
              label: `${type} · ${value.count} ${value.count === 1 ? "bill" : "bills"}`,
              value: value.amount,
              display: formatPeso(value.amount),
            }))}
          />
        )}

        <SectionTitle>Discounted bills</SectionTitle>
        <DataTable
          rows={discounted}
          rowKey={(bill) => bill.bill_id}
          empty="No discounted bills in this period"
          columns={[
            paidColumns[0],
            { key: "bill", header: "Bill", render: billCell },
            { key: "patient", header: "Patient", render: patientCell },
            { key: "type", header: "Discount", render: (bill) => <span className="text-gray-600">{bill.discount_type ?? "—"}</span> },
            { key: "subtotal", header: "Subtotal", align: "right", render: (bill) => formatPeso(bill.subtotal) },
            { key: "discount", header: "Less", align: "right", render: (bill) => <span className="text-red-700">− {formatPeso(bill.discount_amount)}</span> },
            { key: "total", header: "Total", align: "right", render: (bill) => <span className="font-medium text-gray-900">{formatPeso(bill.total_amount)}</span> },
          ]}
        />
      </>
    );
  }

  // Outstanding: unpaid bills right now, oldest first.
  const pending = data.pending;
  const oldest = pending[0];

  return (
    <>
      <FigureRow
        figures={[
          { label: "Outstanding", value: formatPeso(summary.pending_amount) },
          { label: "Unpaid bills", value: formatNumber(pending.length) },
          { label: "Oldest bill", value: oldest ? `${daysSince(oldest.created_at)} days` : "—", note: oldest ? formatDateTime(oldest.created_at) : undefined },
          {
            label: "Older than 7 days",
            value: formatNumber(pending.filter((bill) => daysSince(bill.created_at) > 7).length),
          },
        ]}
      />

      <SectionTitle aside="Not limited to the selected range · oldest first">Unpaid bills</SectionTitle>
      <DataTable
        rows={pending}
        rowKey={(bill) => bill.bill_id}
        empty="No unpaid bills. Everything is paid."
        columns={[
          { key: "created", header: "Created", render: (bill) => <span className="whitespace-nowrap text-gray-600">{formatStamp(bill.created_at)}</span> },
          {
            key: "age",
            header: "Age",
            render: (bill) => {
              const days = daysSince(bill.created_at);
              return (
                <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${days > 7 ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                  {days === 0 ? "Today" : `${days} ${days === 1 ? "day" : "days"}`}
                </span>
              );
            },
          },
          { key: "bill", header: "Bill", render: billCell },
          { key: "patient", header: "Patient", render: patientCell },
          { key: "items", header: "Items", align: "right", render: (bill) => formatNumber(bill.item_count) },
          { key: "total", header: "Amount due", align: "right", render: (bill) => <span className="font-medium text-gray-900">{formatPeso(bill.total_amount)}</span> },
        ]}
      />
    </>
  );
}

export default SalesDetails;

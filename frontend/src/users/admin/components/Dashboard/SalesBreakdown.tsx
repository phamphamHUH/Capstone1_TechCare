import type {
  SalesByPaymentMethod,
  SalesByServiceType,
} from "../../../../interface/Analytics";
import {
  formatNumber,
  formatPeso,
  serviceTypeColor,
  serviceTypeLabel,
} from "./formatters";

type SalesBreakdownProps = {
  serviceTypes: SalesByServiceType[];
  paymentMethods: SalesByPaymentMethod[];
};

const share = (value: number, total: number) => (total > 0 ? (value / total) * 100 : 0);

// Sales split by service type (stacked bar + legend) and by payment method.
function SalesBreakdown({ serviceTypes, paymentMethods }: SalesBreakdownProps) {
  const typeTotal = serviceTypes.reduce((sum, type) => sum + type.revenue, 0);
  const methodTotal = paymentMethods.reduce((sum, method) => sum + method.revenue, 0);
  const methodMax = Math.max(0, ...paymentMethods.map((method) => method.revenue));

  return (
    <div className="space-y-8">
      {/* By service type */}
      <div>
        <h3 className="text-sm font-medium text-gray-700">By service type</h3>
        <p className="text-xs text-gray-400">Line totals before discounts</p>

        {typeTotal === 0 ? (
          <p className="mt-4 text-sm text-gray-400">No sales in this period</p>
        ) : (
          <>
            <div className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded">
              {serviceTypes.map((type) => (
                <div
                  key={type.service_type}
                  title={`${serviceTypeLabel(type.service_type)}: ${formatPeso(type.revenue)}`}
                  style={{
                    width: `${share(type.revenue, typeTotal)}%`,
                    backgroundColor: serviceTypeColor(type.service_type),
                  }}
                />
              ))}
            </div>

            <ul className="mt-4 space-y-3">
              {serviceTypes.map((type) => (
                <li key={type.service_type} className="flex items-start justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-gray-700">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: serviceTypeColor(type.service_type) }}
                    />
                    {serviceTypeLabel(type.service_type)}
                    <span className="text-gray-400">
                      {formatNumber(type.quantity)} {type.quantity === 1 ? "item" : "items"}
                    </span>
                  </span>
                  <span className="text-right tabular-nums">
                    <span className="font-medium text-gray-900">{formatPeso(type.revenue)}</span>
                    <span className="ml-2 text-gray-400">
                      {share(type.revenue, typeTotal).toFixed(0)}%
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* By payment method */}
      <div>
        <h3 className="text-sm font-medium text-gray-700">By payment method</h3>
        <p className="text-xs text-gray-400">Amounts collected after discounts</p>

        {methodTotal === 0 ? (
          <p className="mt-4 text-sm text-gray-400">No payments in this period</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {paymentMethods.map((method) => (
              <li key={method.payment_method} className="text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-gray-700">
                    {method.payment_method}
                    <span className="ml-2 text-gray-400">
                      {method.bills} {method.bills === 1 ? "bill" : "bills"}
                    </span>
                  </span>
                  <span className="tabular-nums">
                    <span className="font-medium text-gray-900">{formatPeso(method.revenue)}</span>
                    <span className="ml-2 text-gray-400">
                      {share(method.revenue, methodTotal).toFixed(0)}%
                    </span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded bg-gray-100">
                  <div
                    className="h-full rounded bg-gray-500"
                    style={{ width: `${share(method.revenue, methodMax)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default SalesBreakdown;

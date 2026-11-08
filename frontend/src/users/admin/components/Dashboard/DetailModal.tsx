import { useEffect, type ReactNode } from "react";
import {
  X,
  Banknote,
  Receipt,
  Calculator,
  BadgePercent,
  Hourglass,
  PackageCheck,
  PackageX,
  Tag,
  ShoppingCart,
  CircleSlash,
} from "lucide-react";

import type {
  AnalyticsRange,
  SalesAnalytics,
  ServiceAnalytics,
} from "../../../../interface/Analytics";
import SalesDetails, { type SalesDetailKind } from "./DetailModal/SalesDetails";
import InventoryDetails, { type InventoryDetailKind } from "./DetailModal/InventoryDetails";

// Which dashboard tile's details are shown.
export type OpenDetail =
  | { group: "sales"; kind: SalesDetailKind }
  | { group: "inventory"; kind: InventoryDetailKind };

const iconProps = { size: 20, strokeWidth: 1.5 };

const DETAIL_INFO: Record<SalesDetailKind | InventoryDetailKind, { title: string; icon: ReactNode }> = {
  revenue: { title: "Revenue", icon: <Banknote {...iconProps} /> },
  "paid-bills": { title: "Paid Bills", icon: <Receipt {...iconProps} /> },
  "average-bill": { title: "Average Bill", icon: <Calculator {...iconProps} /> },
  discounts: { title: "Discounts Given", icon: <BadgePercent {...iconProps} /> },
  outstanding: { title: "Outstanding Bills", icon: <Hourglass {...iconProps} /> },
  active: { title: "Active Services", icon: <PackageCheck {...iconProps} /> },
  inactive: { title: "Inactive Services", icon: <PackageX {...iconProps} /> },
  "average-price": { title: "Average Price", icon: <Tag {...iconProps} /> },
  orders: { title: "Orders", icon: <ShoppingCart {...iconProps} /> },
  "not-ordered": { title: "Not Ordered", icon: <CircleSlash {...iconProps} /> },
};

type DetailModalProps = {
  detail: OpenDetail;
  range: AnalyticsRange;
  periodLabel: string; // e.g. "Last 30 days"
  previousLabel: string; // e.g. "previous 30 days"
  sales: SalesAnalytics | null;
  services: ServiceAnalytics | null;
  onClose: () => void;
};

// Details behind one dashboard tile. Closes on Esc, the X button or a click
// on the dark overlay. Only the body scrolls.
function DetailModal({
  detail,
  range,
  periodLabel,
  previousLabel,
  sales,
  services,
  onClose,
}: DetailModalProps) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    // Stop the page behind the modal from scrolling.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const { title, icon } = DETAIL_INFO[detail.kind];
  // Outstanding is "unpaid right now", not limited to the selected range.
  const subtitle = detail.kind === "outstanding" ? "Unpaid right now" : periodLabel;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
        className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">
              {icon}
            </span>
            <div>
              <h2 id="detail-modal-title" className="text-lg font-semibold">
                {title}
              </h2>
              <p className="text-sm text-gray-500">{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            autoFocus
            className="rounded-md p-1 text-gray-400 cursor-pointer transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {detail.group === "sales" && sales && (
            <SalesDetails
              kind={detail.kind}
              range={range}
              previousLabel={previousLabel}
              sales={sales}
            />
          )}
          {detail.group === "inventory" && services && (
            <InventoryDetails kind={detail.kind} analytics={services} />
          )}
        </div>
      </div>
    </div>
  );
}

export default DetailModal;

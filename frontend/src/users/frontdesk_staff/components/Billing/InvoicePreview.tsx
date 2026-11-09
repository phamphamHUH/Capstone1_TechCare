import ErrorMessage from "../../../../components/ErrorMessage";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import type { Bill, BillItem } from "../../../../interface/Billing";
import InvoiceDocument from "./InvoiceDocument";
import {
  INVOICE_FRAME_HTML,
  INVOICE_PRINT_HEIGHT,
  INVOICE_PRINT_WIDTH,
  waitForInvoiceAssets,
} from "./invoicePrint";

export default function InvoicePreview({
  bill,
  items,
  headingRef,
}: {
  bill: Bill;
  items: BillItem[];
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState(INVOICE_PRINT_WIDTH + 32);
  const [height, setHeight] = useState(INVOICE_PRINT_HEIGHT);
  const [error, setError] = useState("");
  const scale = Math.max(0.1, Math.min(1, (width - 32) / INVOICE_PRINT_WIDTH));

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => setWidth(container.clientWidth);
    measure();
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  useLayoutEffect(() => {
    if (!body) return;
    const measure = () =>
      setHeight(
        Math.max(
          INVOICE_PRINT_HEIGHT,
          Math.ceil(body.getBoundingClientRect().height),
        ),
      );
    measure();
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    observer.observe(body);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [body]);

  useEffect(() => {
    if (!body) return;
    let cancelled = false;
    void waitForInvoiceAssets(body.ownerDocument).catch(() => {
      if (!cancelled)
        setError(
          "The invoice logo could not be loaded. Reopen the preview to try again.",
        );
    });
    return () => {
      cancelled = true;
    };
  }, [body]);

  return (
    <section
      aria-label="Invoice preview"
      className="mt-5 overflow-hidden rounded-xl border border-gray-300"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-3">
        <h2
          id="invoice-preview-heading"
          ref={headingRef}
          tabIndex={-1}
          className="font-semibold text-gray-900 outline-none"
        >
          Invoice Preview
        </h2>
        <p className="text-xs text-gray-500">
          Long bond · Portrait · Top half only
        </p>
      </div>
      {error && (
        <ErrorMessage>
          {error}
        </ErrorMessage>
      )}
      <div
        ref={containerRef}
        className="max-h-[70vh] overflow-auto border-t border-gray-200 bg-gray-100 p-4"
      >
        <div
          className="relative mx-auto bg-white shadow-sm"
          style={{ width: INVOICE_PRINT_WIDTH * scale, height: height * scale }}
        >
          <iframe
            title={`Invoice preview ${bill.invoice_id || bill.bill_id}`}
            srcDoc={INVOICE_FRAME_HTML}
            sandbox="allow-same-origin allow-modals"
            className="absolute left-0 top-0 origin-top-left border-0 bg-white"
            style={{
              width: INVOICE_PRINT_WIDTH,
              height,
              transform: `scale(${scale})`,
            }}
            onLoad={(event) =>
              setBody(event.currentTarget.contentDocument?.body ?? null)
            }
          />
        </div>
      </div>
      {body &&
        createPortal(<InvoiceDocument bill={bill} items={items} />, body)}
    </section>
  );
}

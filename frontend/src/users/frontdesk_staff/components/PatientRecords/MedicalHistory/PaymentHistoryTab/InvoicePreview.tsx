import ErrorMessage from "../../../../../../components/ErrorMessage";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Printer, X } from "lucide-react";
import type { Bill, BillItem } from "../../../../../../interface/Billing";
import InvoiceDocument from "./InvoiceDocument";
import {
  INVOICE_FRAME_HTML,
  INVOICE_PRINT_HEIGHT,
  INVOICE_PRINT_WIDTH,
  waitForInvoiceAssets,
} from "../../../../components/Billing/utils/invoicePrint";

export default function InvoicePreview({
  bill,
  items,
  onClose,
}: {
  bill: Bill;
  items: BillItem[];
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState(INVOICE_PRINT_WIDTH + 32);
  const [height, setHeight] = useState(INVOICE_PRINT_HEIGHT);
  const [error, setError] = useState("");
  const scale = Math.max(0.1, Math.min(1, (width - 32) / INVOICE_PRINT_WIDTH));
  const invoiceNumber = bill.invoice_id || bill.bill_id;

  // Focus the modal and close it with Escape
  useEffect(() => {
    headingRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

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
          "The invoice logo could not be loaded. Close and reopen the invoice to try again.",
        );
    });
    return () => {
      cancelled = true;
    };
  }, [body]);

  // Opens the print dialog. The document title becomes the default file name
  // when the person chooses "Save as PDF".
  const openPrintDialog = () => {
    const frameWindow = iframeRef.current?.contentWindow;
    if (!frameWindow) return;

    frameWindow.document.title = `Invoice-${invoiceNumber}`;
    frameWindow.focus();
    frameWindow.print();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-preview-heading"
        className="fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[94%] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-md bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 sm:px-6">
          <div>
            <h2
              id="invoice-preview-heading"
              ref={headingRef}
              tabIndex={-1}
              className="font-semibold text-gray-900 outline-none"
            >
              Invoice {invoiceNumber}
            </h2>
            <p className="text-xs text-gray-500">
              Long bond · Portrait · Top half only
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openPrintDialog}
              disabled={!body}
              className="flex cursor-pointer items-center gap-2 rounded-md border-2 border-blue-500 px-3 py-2 text-xs text-blue-500 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer size={15} />
              Print
            </button>

            <button
              type="button"
              onClick={openPrintDialog}
              disabled={!body}
              title='In the print dialog, set the destination to "Save as PDF"'
              className="flex cursor-pointer items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={15} />
              Download PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close invoice"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-gray-400 transition hover:bg-red-100 hover:text-red-900"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {/* Invoice */}
        <div ref={containerRef} className="overflow-auto bg-gray-100 p-4">
          <div
            className="relative mx-auto bg-white shadow-sm"
            style={{
              width: INVOICE_PRINT_WIDTH * scale,
              height: height * scale,
            }}
          >
            <iframe
              ref={iframeRef}
              title={`Invoice preview ${invoiceNumber}`}
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
      </div>

      {body &&
        createPortal(<InvoiceDocument bill={bill} items={items} />, body)}
    </>
  );
}

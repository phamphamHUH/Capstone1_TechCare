// Match the laboratory report: full portrait long bond, using only the top half.
export const INVOICE_PRINT_WIDTH = 816;
export const INVOICE_PRINT_HEIGHT = 1248;

export const INVOICE_CSS = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 6px 24px 0; width: 816px; min-height: 1248px; color: #181818; background: white; font: 11px/1.25 Arial, Helvetica, sans-serif; }
  h1, h2, p, dl, dd { margin: 0; }
  .invoice-sheet { position: relative; isolation: isolate; }
  .invoice-sheet > :not(.invoice-watermark) { position: relative; z-index: 1; }
  .invoice-watermark { position: absolute; z-index: 0; bottom: 16px; right: 12px; width: 190px; height: 190px; object-fit: contain; opacity: 0.035; }
  .invoice-header { display: flex; align-items: center; min-height: 88px; margin-bottom: 16px; padding: 10px 14px 10px 126px; background: linear-gradient(100deg, #2787a5 0%, #429f95 48%, #8dbb43 100%); color: white; text-align: left; break-inside: avoid; }
  .invoice-logo-frame { position: absolute; top: 0; left: 12px; width: 100px; height: 98px; overflow: hidden; border: 2px solid #33839a; border-top: 0; border-radius: 0 0 14px 14px; background: white; }
  .invoice-logo { position: absolute; left: -20px; top: -24px; width: 140px; height: 140px; object-fit: contain; }
  .invoice-header h1 { color: white; font-size: 21px; font-weight: 800; line-height: 1.15; letter-spacing: 0.1px; }
  .invoice-address { margin-top: 5px; font-size: 12px; }
  .invoice-contact { margin-top: 3px; font-size: 12px; }
  .invoice-title { display: flex; align-items: center; justify-content: center; gap: 12px; margin: 0 0 8px; break-after: avoid; }
  .invoice-title h2 { color: #267455; font-size: 20px; letter-spacing: 1.5px; }
  .invoice-title span { position: absolute; right: 0; border: 1px solid #b5cbbd; border-radius: 3px; padding: 2px 8px; background: #edf5eb; color: #276d51; font-size: 10px; font-weight: bold; }
  .invoice-details { display: grid; grid-template-columns: 1fr 1fr; column-gap: 24px; margin-bottom: 10px; break-inside: avoid; }
  .invoice-details > div { display: flex; align-items: baseline; gap: 6px; min-width: 0; padding: 4px 0; }
  dt { font-weight: bold; }
  .invoice-details dt { flex-shrink: 0; }
  dd { overflow-wrap: anywhere; min-width: 0; }
  .invoice-patient-name { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  th, td { padding: 4px 6px; border-bottom: 1px solid #d4dfdc; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
  thead th { border-top: 1px solid #bdd0cb; background: #e5f1f3; color: #265b63; font-size: 10px; text-transform: uppercase; }
  tbody th { font-weight: normal; }
  tbody tr:nth-child(even) > * { background: #f7faf9; }
  .invoice-number-column { width: 4%; }
  .invoice-service-column { width: 35%; }
  .invoice-category-column { width: 20%; }
  .invoice-quantity-column { width: 6%; }
  .invoice-price-column { width: 17%; }
  .invoice-amount-column { width: 18%; }
  .invoice-quantity { text-align: center; }
  .invoice-money { text-align: right; font-variant-numeric: tabular-nums; }
  .invoice-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 8px; break-inside: avoid; }
  .invoice-payment > div { margin-bottom: 6px; }
  .invoice-payment dt { font-size: 10px; color: #267455; }
  .invoice-payment dd { margin-top: 2px; }
  .invoice-totals > div { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 4px 6px; }
  .invoice-totals dt { font-weight: normal; }
  .invoice-totals dd { flex-shrink: 0; text-align: right; font-variant-numeric: tabular-nums; }
  .invoice-totals .invoice-total { margin-top: 3px; padding: 6px; border: 1px solid #b8d6aa; border-top: 2px solid #72a94b; background: #eef5e8; color: #275b40; font-size: 15px; }
  .invoice-total dt, .invoice-total dd { font-weight: bold; }
  .invoice-footer { display: flex; justify-content: space-between; gap: 12px; margin-top: 10px; padding-top: 5px; border-top: 1px solid #c7d6d8; font-size: 9px; color: #484848; break-inside: avoid; overflow-wrap: anywhere; }
  @page { size: 8.5in 13in; margin: 0.0625in 0.25in 6.5in; }
  @media print {
    html, body { width: auto; min-height: 0; margin: 0; padding: 0; background: white; }
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  }
`;

export async function waitForInvoiceAssets(doc: Document) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.all([
        doc.fonts?.ready,
        ...Array.from(doc.images).map(async (image) => {
          await image.decode();
          if (!image.naturalWidth)
            throw new Error("The invoice logo could not be loaded.");
        }),
      ]),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                "The invoice logo is taking too long to load. Please try again.",
              ),
            ),
          15_000,
        );
      }),
    ]);
  } catch (cause) {
    throw new Error(
      "The invoice could not be prepared. Check your connection and try printing again.",
      { cause },
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Isolate the saved invoice from the application and wait for its assets before printing. */
export async function printInvoice(invoice: HTMLElement, title: string) {
  const previousFocus = document.activeElement;
  const frame = document.createElement("iframe");
  frame.title = "Printable Invoice";
  frame.setAttribute("sandbox", "allow-same-origin allow-modals");
  frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${INVOICE_PRINT_WIDTH}px;height:${INVOICE_PRINT_HEIGHT}px;border:0`;
  let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
  const cleanup = () => {
    clearTimeout(cleanupTimer);
    frame.remove();
    // Let the caller re-enable its print button before restoring keyboard focus.
    requestAnimationFrame(() => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus({ preventScroll: true });
    });
  };

  try {
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc || !frame.contentWindow)
      throw new Error(
        "Unable to open the printable invoice. Please try again.",
      );
    doc.open();
    doc.write(
      '<!doctype html><html lang="en"><head><meta charset="utf-8" /></head><body></body></html>',
    );
    doc.close();
    doc.title = title;
    const style = doc.createElement("style");
    style.textContent = INVOICE_CSS;
    doc.head.appendChild(style);
    doc.body.innerHTML = invoice.innerHTML;
    await waitForInvoiceAssets(doc);
    frame.contentWindow.addEventListener("afterprint", cleanup, { once: true });
    cleanupTimer = setTimeout(cleanup, 60_000);
    frame.contentWindow.focus();
    frame.contentWindow.print();
  } catch (cause) {
    cleanup();
    throw cause;
  }
}

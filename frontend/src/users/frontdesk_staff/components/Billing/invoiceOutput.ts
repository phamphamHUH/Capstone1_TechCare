// Use an isolated document so application navigation, dialogs and theme colors
// cannot leak into a printed or downloaded invoice.
export const INVOICE_PRINT_CSS = `
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #fff; color: #164778; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; }
  .invoice-paper { width: 100%; padding: 24px; background: #fff; }
  .invoice-document-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; border-bottom: 1px solid #dce8f5; padding-bottom: 22px; }
  .invoice-clinic-brand { display: flex; align-items: center; gap: 12px; }
  .invoice-clinic-brand img { width: 48px; height: 48px; object-fit: contain; }
  h2, h3, p { margin: 0; }
  .invoice-clinic-brand h2 { font-size: 16px; }
  .invoice-clinic-brand p, .invoice-document-id p { margin-top: 4px; font-size: 14px; color: #486687; }
  .invoice-document-id { text-align: right; max-width: 45%; overflow-wrap: anywhere; }
  .invoice-document-id h2 { font-size: 26px; color: #0784f8; }
  .invoice-patient-details { border-bottom: 1px solid #dce8f5; padding: 18px 0; }
  .invoice-patient-details h3 { margin-bottom: 10px; font-size: 16px; }
  .invoice-patient-details > div { display: grid; grid-template-columns: 90px 1fr 82px 1fr; gap: 6px; margin-top: 6px; font-size: 14px; }
  .invoice-patient-details span { color: #6386b6; }
  .invoice-patient-details strong { overflow-wrap: anywhere; }
  table { width: 100%; border-collapse: collapse; margin: 18px 0; table-layout: fixed; font-size: 14px; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  th, td { padding: 10px 6px; border-bottom: 1px solid #e4edf7; text-align: left; overflow-wrap: anywhere; }
  th { background: #f3f8fd; font-size: 14px; }
  th:first-child { width: 5%; } th:nth-child(2) { width: 31%; } th:nth-child(3) { width: 24%; }
  th:nth-child(4) { width: 6%; } th:nth-child(5), th:nth-child(6) { width: 17%; }
  th:last-child, td:last-child { text-align: right; }
  .invoice-totals { display: grid; gap: 10px; margin-top: 14px; break-inside: avoid; }
  .invoice-totals > div { display: flex; justify-content: space-between; gap: 12px; }
  .invoice-totals span { color: #6386b6; }
  .invoice-green { color: #0aa35b; }
  .invoice-grand-total { border: 1px solid #b7dbff; border-radius: 5px; background: #eff8ff; padding: 14px; align-items: center; }
  .invoice-grand-total span { color: #164778; font-weight: bold; }
  .invoice-grand-total strong { color: #0784f8; font-size: 22px; }
  .invoice-document-notes { border-top: 1px solid #dce8f5; margin-top: 20px; padding-top: 14px; break-inside: avoid; }
  .invoice-document-notes p { margin-top: 6px; color: #486687; font-size: 14px; }
  @media print { .invoice-paper { padding: 0; } }
`;

export async function outputInvoice(element: HTMLElement, filename: string, download: boolean) {
  const frame = document.createElement("iframe");
  frame.title = "Printable invoice";
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0";
  document.body.appendChild(frame);
  try {
    const doc = frame.contentDocument;
    const view = frame.contentWindow;
    if (!doc || !view) throw new Error("The invoice document could not be opened.");
    // Clone DOM nodes rather than interpolating patient data into HTML strings.
    const style = doc.createElement("style");
    style.textContent = INVOICE_PRINT_CSS;
    doc.head.appendChild(style);
    doc.title = filename;
    doc.body.appendChild(doc.importNode(element, true));
    await Promise.all(Array.from(doc.images, (img) => img.decode()));
    await doc.fonts.ready;
    if (!download) {
      view.addEventListener("afterprint", () => frame.remove(), { once: true });
      view.focus();
      view.print();
      // Some browsers omit afterprint when the dialog is canceled.
      window.setTimeout(() => frame.remove(), 60_000);
      return;
    }
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
    const canvas = await html2canvas(doc.body, { scale: 2, backgroundColor: "#ffffff", windowWidth: 794, logging: false });
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const width = 186;
    const pageHeight = 273;
    const pixelsPerMm = canvas.width / width;
    // Keep table rows and the totals together across PDF pages.
    const blocks = Array.from(doc.querySelectorAll("tr, .invoice-totals, .invoice-document-header, .invoice-patient-details, .invoice-document-notes"), (node) => {
      const rect = node.getBoundingClientRect();
      return { top: Math.floor(rect.top * 2), bottom: Math.ceil(rect.bottom * 2) };
    });
    let offset = 0;
    while (offset < canvas.height) {
      let end = Math.min(canvas.height, offset + Math.floor(pageHeight * pixelsPerMm));
      const crossing = blocks.find((block) => block.top > offset && block.top < end && block.bottom > end);
      if (crossing) end = crossing.top;
      const page = document.createElement("canvas");
      page.width = canvas.width;
      page.height = end - offset;
      const context = page.getContext("2d");
      if (!context) throw new Error("The invoice PDF could not be rendered.");
      context.drawImage(canvas, 0, offset, canvas.width, page.height, 0, 0, page.width, page.height);
      if (offset) pdf.addPage();
      pdf.addImage(page.toDataURL("image/jpeg", 0.95), "JPEG", 12, 12, width, page.height / pixelsPerMm);
      offset = end;
    }
    await pdf.save(`${filename.replace(/[^a-z0-9_-]/gi, "-")}.pdf`, { returnPromise: true });
  } catch (error) {
    frame.remove();
    throw error;
  } finally {
    if (download) frame.remove();
  }
}

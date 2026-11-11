import { createInvoiceFrame, waitForInvoiceAssets } from "./invoicePrint";

type InvoicePage = {
  element: HTMLDivElement;
  sheet: HTMLElement;
  rows: HTMLTableSectionElement | null;
};

/** Repeat the invoice identity and column headings, keeping complete rows inside each top half. */
export function paginateInvoice(doc: Document): HTMLElement[] {
  const source = doc.querySelector<HTMLElement>(".invoice-sheet");
  if (!source)
    throw new Error("The invoice could not be prepared for download.");
  const rows = Array.from(
    source.querySelectorAll<HTMLTableRowElement>("tbody tr"),
  );
  const tail = [
    source.querySelector<HTMLElement>(".invoice-summary"),
    source.querySelector<HTMLElement>(".invoice-footer"),
  ].filter((element): element is HTMLElement => Boolean(element));
  const template = source.cloneNode(true) as HTMLElement;
  template.querySelector("tbody")?.replaceChildren();
  template.querySelector(".invoice-summary")?.remove();
  template.querySelector(".invoice-footer")?.remove();
  doc.body.replaceChildren();
  doc.body.style.padding = "0";
  doc.body.style.minHeight = "0";
  const pages: InvoicePage[] = [];
  const fits = (page: InvoicePage) =>
    page.sheet.getBoundingClientRect().bottom -
      page.element.getBoundingClientRect().top <=
    624;

  function createPage(withRows = true) {
    const element = doc.createElement("div");
    element.style.cssText =
      "position:relative;width:816px;height:624px;padding:6px 24px 0;background:white";
    const sheet = template.cloneNode(true) as HTMLElement;
    if (!withRows) sheet.querySelector("table")?.remove();
    element.appendChild(sheet);
    doc.body.appendChild(element);
    const page = {
      element,
      sheet,
      rows: sheet.querySelector<HTMLTableSectionElement>("tbody"),
    };
    pages.push(page);
    return page;
  }

  let page = createPage();
  for (const row of rows) {
    const clone = row.cloneNode(true);
    page.rows!.appendChild(clone);
    if (!fits(page)) {
      clone.parentNode!.removeChild(clone);
      if (!page.rows!.children.length)
        throw new Error(
          "A service description is too long for this layout. Use Print Invoice to review its page breaks.",
        );
      page = createPage();
      page.rows!.appendChild(clone);
      if (!fits(page))
        throw new Error(
          "A service description is too long for this layout. Use Print Invoice to review its page breaks.",
        );
    }
  }
  const ending = tail.map((element) => element.cloneNode(true));
  page.sheet.append(...ending);
  if (!fits(page)) {
    ending.forEach((node) => node.parentNode!.removeChild(node));
    page = createPage(false);
    page.sheet.append(...ending);
    if (!fits(page))
      throw new Error(
        "The payment details are too long for this layout. Use Print Invoice to review its page breaks.",
      );
  }
  return pages.map((page) => page.element);
}

export async function downloadInvoicePdf(
  invoice: HTMLElement,
  invoiceNumber: string,
) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);
  const frame = await createInvoiceFrame(invoice, `Invoice ${invoiceNumber}`);
  try {
    const doc = frame.contentDocument!;
    const pages = paginateInvoice(doc);
    await waitForInvoiceAssets(doc);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "in",
      format: [8.5, 13],
      compress: true,
    });
    pdf.setProperties({ title: `Invoice ${invoiceNumber}` });
    for (const [index, page] of pages.entries()) {
      const canvas = await html2canvas(page, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        imageTimeout: 15_000,
        width: 816,
        height: 624,
        windowWidth: 816,
        windowHeight: 1248,
        scrollX: 0,
        scrollY: 0,
      });
      if (index > 0) pdf.addPage([8.5, 13], "portrait");
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.96),
        "JPEG",
        0,
        0,
        8.5,
        6.5,
      );
      canvas.width = 0;
      canvas.height = 0;
    }
    const filename = `Invoice-${invoiceNumber.replace(/[^a-z0-9._-]/gi, "_")}.pdf`;
    await pdf.save(filename, { returnPromise: true });
  } finally {
    frame.remove();
  }
}

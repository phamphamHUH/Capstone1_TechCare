import type { FormTemplate, PaperSize } from "../interface/FormTemplate";

export const PAPER_LABELS: Record<PaperSize, string> = {
  half_long_bond: "Half long bond · 8.5 × 6.5 in",
  a4: "A4 · 210 × 297 mm",
};

export function isImagingReport(name: string) {
  return /x[\s-]?ray|imaging|radiolog|ultrasound|sonolog/i.test(name);
}

export function defaultPaperSize(name: string): PaperSize {
  return isImagingReport(name) ||
    /medical\s+(clearance|certificate)/i.test(name)
    ? "a4"
    : "half_long_bond";
}

// Older templates and saved snapshots have no explicit paper size.
export function templatePaperSize(
  template: Pick<FormTemplate, "form_name" | "paper_size"> & {
    category?: string;
  },
  serviceName = "",
): PaperSize {
  return template.paper_size === "a4" ||
    template.paper_size === "half_long_bond"
    ? template.paper_size
    : defaultPaperSize(
        `${template.form_name} ${template.category || ""} ${serviceName}`,
      );
}

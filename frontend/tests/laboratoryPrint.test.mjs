import assert from "node:assert/strict";
import { after, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
after(() => server.close());
const base = "/src/users/laboratory_staff/components/LaboratoryResults/";
const { default: LaboratoryReport } = await server.ssrLoadModule(`${base}PrintResultView/LaboratoryReport.tsx`);
const { default: ResultEntry } = await server.ssrLoadModule(`${base}ResultEntry.tsx`);
const { default: PrintResultView } = await server.ssrLoadModule(`${base}PrintResultView.tsx`);
const { REPORT_FRAME_HTML, safeReportImage, waitForReportAssets } = await server.ssrLoadModule(`${base}utils/laboratoryPrint.ts`);
const { fetchPrintableResults, resultPrintApi } = await server.ssrLoadModule(`${base}utils/laboratoryResultsApi.ts`);

const field = (id, type, order, settings = {}, validation = {}) => ({ id, type, order, label: id, fieldKey: id, settings, validation });
const request = { requestId: "TEST-REQUEST", patientId: "TEST-PATIENT", patientName: "Test <Patient>", age: 30, sex: "F", room: "LAB-1", requestedAt: "2026-10-16T08:00:00+08:00", collectedAt: "2026-10-16T08:15:00+08:00", tests: [{ id: "ITEM-1", serviceId: "SERVICE-1", name: "Test service", description: "" }], accepted: true, sampleCollected: true, category: "Normal", status: "Completed" };
const template = { form_id: "FORM-1", form_name: "Admin template", service_id: "SERVICE-1", status: "Published", category: "Laboratory", version: 7, components: [
  field("late", "text_field", 8, { defaultValue: "DO NOT INVENT THIS VALUE" }),
  field("section", "section_header", 1, { sectionHeader: "Admin section" }),
  field("count", "number_field", 2, { unit: "unit", referenceRange: "1 – 5" }, { refLow: 1, refHigh: 5, flagLabels: { low: "Below", high: "Above" } }),
  field("check", "checkbox", 3),
  field("hidden", "text_field", 4, { showInPreview: false }),
  field("table", "table", 5, { tableColumns: [{ id: "cell", header: "Admin column", type: "text" }] }),
  field("static", "static_text", 6, { staticText: "From admin metadata", width: "1/2", alignment: "right" }),
] };
const report = { request, template, values: { count: 0, check: false, hidden: "SECRET HIDDEN FIELD", table: [{ cell: "<script>unsafe()</script>" }] }, remarks: "Notes <img onerror=alert(1)>\nSecond line" };
const markup = (value = report) => renderToStaticMarkup(React.createElement(LaboratoryReport, { report: value }));

test("prints actual metadata and values, preserving zero, false, order and table cells", () => {
  const html = markup();
  assert.match(html, /Admin section/);
  assert.ok(html.indexOf("Admin section") < html.indexOf("Admin column"));
  // Zero is kept, and the abnormal flag sits inside the result cell (no separate Flag column).
  assert.match(html, /class="result-value"[^>]*>0<span class="flag abnormal">Below<\/span><\/td>/);
  assert.match(html, />No<\/td>/);
  assert.match(html, /1 – 5/);
  assert.match(html, /Below/);
  assert.match(html, /From admin metadata/);
  assert.match(html, /width:50%;text-align:right/);
  assert.match(html, /Version 7/);
  assert.doesNotMatch(html, /SECRET HIDDEN FIELD|DO NOT INVENT THIS VALUE/);
});

test("escapes patient names, observations, and table values without executable markup", () => {
  const html = markup();
  assert.match(html, /Test &lt;Patient&gt;/);
  assert.match(html, /&lt;script&gt;unsafe\(\)&lt;\/script&gt;/);
  assert.match(html, /&lt;img onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<script>|<img onerror/);
  assert.equal(safeReportImage("javascript:alert(1)"), undefined);
  assert.equal(safeReportImage("data:image/svg+xml,<svg onload=alert(1)>"), undefined);
  assert.equal(safeReportImage("/assets/reyna-g-logo.png"), "/assets/reyna-g-logo.png");
});

test("drafts remain labeled; saved reports show only supplied verification", () => {
  assert.match(markup(), /DRAFT — NOT SAVED OR RELEASED/);
  const saved = markup({ ...report, resultId: "RESULT-1", verifiedBy: "Actual verifier", verifiedAt: "2026-10-16T09:00:00+08:00" });
  assert.doesNotMatch(saved, /DRAFT|Verification not recorded/);
  assert.match(saved, /RESULT-1/);
  assert.match(saved, /Actual verifier/);
  assert.match(markup({ ...report, resultId: "RESULT-1" }), /Verification not recorded/);
});

test("isolated print document defines half long bond paper, repeating table headers and row pagination", () => {
  // Long bond (8.5 × 13 in) with a 6.5 in bottom margin, so the result fills the top half.
  assert.match(
    REPORT_FRAME_HTML,
    /@page\s*\{\s*size:\s*8\.5in 13in;(?:\s*\/\*[\s\S]*?\*\/)?\s*margin:\s*0\.0625in 0\.25in 6\.5in;?\s*\}/,
  );
  assert.match(REPORT_FRAME_HTML, /thead\s*\{\s*display:\s*table-header-group;?\s*\}/);
  assert.match(REPORT_FRAME_HTML, /tr\s*\{\s*break-inside:\s*avoid;?\s*\}/);
  assert.doesNotMatch(REPORT_FRAME_HTML, /<script|Laboratory Requests|Save Result/);
});

test("entry and preview expose the controls without claiming an unsaved result is saved", () => {
  const entry = renderToStaticMarkup(React.createElement(ResultEntry, { request, initialStep: 2, preloadedTemplates: [template], onCancel() {} }));
  assert.match(entry, /id="preview-laboratory-result"/);
  const preview = renderToStaticMarkup(React.createElement(PrintResultView, { request, reports: [report], onBack() {} }));
  assert.match(preview, /Back to Results/);
  assert.match(preview, /Fit to Page/);
  assert.match(preview, /Print Preview/);
  assert.match(preview, /Print Draft/);
  assert.match(preview, /sandbox="allow-same-origin allow-modals"/);
});

test("saved-result adapter rejects absent data and patient/request mismatches", async () => {
  const original = resultPrintApi.loadResults;
  try {
    resultPrintApi.loadResults = null;
    await assert.rejects(fetchPrintableResults(request), /not been connected/);
    resultPrintApi.loadResults = async () => [];
    await assert.rejects(fetchPrintableResults(request), /No saved results/);
    resultPrintApi.loadResults = async () => [{ ...report, resultId: "RESULT-1", request: { ...request, patientId: "OTHER" } }];
    await assert.rejects(fetchPrintableResults(request), /incomplete/);
    resultPrintApi.loadResults = async () => [{ ...report, resultId: "RESULT-1" }];
    assert.equal((await fetchPrintableResults(request))[0].template.version, 7);
  } finally { resultPrintApi.loadResults = original; }
});

test("asset readiness waits for images and rejects broken report images", async () => {
  let finish;
  const pending = new Promise((resolve) => { finish = resolve; });
  let ready = false;
  const waiting = waitForReportAssets({ fonts: { ready: Promise.resolve() }, images: [{ naturalWidth: 20, decode: () => pending }] }).then(() => { ready = true; });
  await Promise.resolve();
  assert.equal(ready, false);
  finish();
  await waiting;
  assert.equal(ready, true);
  await assert.rejects(waitForReportAssets({ images: [{ naturalWidth: 0, decode: async () => { throw new Error("broken image"); } }] }), /broken image/);
});

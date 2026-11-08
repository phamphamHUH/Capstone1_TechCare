// Run with: node tests/laboratoryPrint.browser.mjs (Chrome/Edge required).
// The verification page is served only by this process, never by the application.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createServer } from "vite";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const candidates = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].filter(Boolean);
let executable;
for (const candidate of candidates) {
  try { await fs.access(candidate); executable = candidate; break; } catch { /* Try next installed browser. */ }
}
if (!executable) throw new Error("Set CHROME_PATH to a Chrome or Edge executable to run browser checks.");

const request = { requestId: "PRINT-CHECK-1", patientId: "TEST-PATIENT", patientName: "Preview Test Patient", age: 28, sex: "F", room: "LAB-1", requestedAt: "2026-10-16T08:00:00+08:00", collectedAt: "2026-10-16T08:15:00+08:00", accepted: true, sampleCollected: true, status: "Ready for Analysis", category: "Normal", consultationType: "Laboratory Request", tests: [{ id: "ITEM-1", serviceId: "SERVICE-1", name: "Browser test", description: "" }] };
const template = { form_id: "PRINT-CHECK-TEMPLATE", form_name: "Browser Verification Template", service_id: "SERVICE-1", status: "Published", category: "Laboratory", version: 1, components: Array.from({ length: 90 }, (_, index) => ({ id: `field-${index}`, type: "number_field", order: index, label: `Parameter ${index}`, fieldKey: `field_${index}`, settings: { defaultValue: index === 0 ? "6.8" : String(index), unit: "unit", referenceRange: "1 – 100" }, validation: { required: true } })) };
const layoutFields = {
  chemistry: ['Fasting Blood Sugar (FBS)', 'Blood Urea Nitrogen (BUN)', 'Creatinine', 'Blood Uric Acid (BUA)', 'Total Cholesterol', 'Triglyceride', 'High-density Lipoprotein (HDL)', 'Low-density Lipoprotein (LDL)', 'Very Low-density Lipoprotein (VLDL)'],
  urine: ['Color', 'Transparency', 'pH Reaction', 'Specific Gravity', 'Protein', 'Sugar', 'Blood', 'Bilirubin', 'Ketone', 'Urobilinogen', 'Pregnancy Test', 'Other Findings', 'Sample Appearance', 'WBC', 'RBC', 'Epithelial cells', 'Amorphous Urates', 'Amorphous Phosphates', 'Mucus Threads', 'Bacteria', 'Renal Tubular Epithelial Cells', 'Yeast Cells', 'Others', 'Hyaline Cast', 'Red blood Cell Cast', 'Coarse Granular Cast'],
  stool: ['Color', 'Consistency', 'Mucus', 'Occult blood test', 'Ova or Parasite', 'Amoeba', 'RBC', 'Pus Cell', 'Yeast Cells', 'Bacteria', 'Other Findings'],
};
const layoutReports = Object.fromEntries(Object.entries(layoutFields).map(([key, labels]) => [key, {
  request, resultId: 'SYNTHETIC-RESULT', remarks: 'Synthetic layout verification only.',
  template: { ...template, form_name: {chemistry:'Blood Chemistry',urine:'Urinalysis',stool:'Stool Examination'}[key], components: labels.map((label, index) => ({ id:`field-${index}`,fieldKey:`field_${index}`,type:'text_field',order:index,label,settings:key==='chemistry'?{referenceRange: index===2 || index===3 ? 'M: 1 – 100\nF: 1 – 100' : '1 – 100',unit:'unit'}:{},validation:{} })) },
  values: Object.fromEntries(labels.map((_label,index)=>[`field_${index}`,key==='chemistry'?'6.8':'Test value'])),
}]));
layoutReports.remarks = {
  ...layoutReports.urine,
  remarks: Array.from({ length: 7 }, (_, index) => `Remark ${index + 1}: Synthetic multiline observation for print layout verification.`).join('\n'),
};
const checkModuleId = "\0virtual:laboratory-print-check";
const checkModule = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import ResultEntry from '/src/users/laboratory_staff/components/LaboratoryResults/ResultEntry.tsx';
import PrintResultView from '/src/users/laboratory_staff/components/LaboratoryResults/PrintResultView.tsx';
import '/src/index.css';
const report = ${JSON.stringify(layoutReports)}[new URLSearchParams(location.search).get('layout')];
createRoot(document.getElementById('root')).render(report ? React.createElement(PrintResultView,{request:report.request,reports:[report],onBack(){}}) : React.createElement(ResultEntry,{request:${JSON.stringify(request)},preloadedTemplates:[${JSON.stringify(template)}],initialStep:2,onCancel(){}}));
`;
const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><div id="root"></div><script type="module" src="/@id/__x00__virtual:laboratory-print-check"></script></body></html>`;
const server = await createServer({ server: { host: "127.0.0.1", port: 0 }, plugins: [{ name: "laboratory-print-browser-check", resolveId(id) { if (id === "virtual:laboratory-print-check") return checkModuleId; }, load(id) { if (id === checkModuleId) return checkModule; }, configureServer(vite) {
  vite.middlewares.use("/__laboratory_print_check", async (_request, response) => {
    response.setHeader("Content-Type", "text/html");
    response.end(await vite.transformIndexHtml("/__laboratory_print_check", html));
  });
} }] });
const profile = path.join(os.tmpdir(), `techcare-print-browser-${Date.now()}`);
let browser, socket;
const pending = new Map();
let serial = 0;
const browserErrors = [];

try {
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = spawn(executable, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${profile}`, `${origin}/__laboratory_print_check`], { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
  let stderr = "";
  browser.stderr.on("data", (chunk) => { stderr += chunk; });
  for (let attempt = 0; attempt < 100 && !stderr.includes("DevTools listening on"); attempt++) await delay(100);
  const debuggerUrl = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1];
  if (!debuggerUrl) throw new Error(`Headless browser did not start: ${stderr.slice(-1500)}`);
  const pages = await (await fetch(`http://127.0.0.1:${new URL(debuggerUrl).port}/json/list`, { signal: AbortSignal.timeout(4000) })).json();
  const page = pages.find((item) => item.type === "page");
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
    setTimeout(() => reject(new Error("Browser connection timed out")), 5000).unref();
  });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const callback = pending.get(message.id);
      pending.delete(message.id);
      message.error ? callback.reject(new Error(JSON.stringify(message.error))) : callback.resolve(message.result);
    } else if (message.method === "Runtime.exceptionThrown") browserErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++serial;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.delete(id)) reject(new Error(`Browser command timed out: ${method}`)); }, 10000).unref();
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const wait = async (expression, label) => {
    for (let attempt = 0; attempt < 120; attempt++) { if (await evaluate(expression)) return; await delay(100); }
    throw new Error(`${label}: ${await evaluate("document.body.innerText.slice(0,1000)")}\n${browserErrors.join("\n")}`);
  };
  const readyExpression = "Array.from(document.querySelectorAll('button')).some(button=>button.textContent==='Print Draft'&&!button.disabled)";
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1180, height: 860, deviceScaleFactor: 1, mobile: false });
  await wait("!!document.getElementById('preview-laboratory-result')", "Entry did not render");
  await evaluate(`(()=>{const notes=document.getElementById('laboratory-notes');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(notes,'Browser checked notes');notes.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await evaluate("document.getElementById('preview-laboratory-result').click()");
  await wait(readyExpression, "Preview did not become ready");
  const desktop = await evaluate(`(()=>{const frame=document.querySelector('iframe');return {text:frame.contentDocument.body.innerText,height:frame.getBoundingClientRect().height,overflow:document.documentElement.scrollWidth>innerWidth};})()`);
  assert.match(desktop.text, /Browser checked notes/);
  assert.match(desktop.text, /6.8/);
  assert.match(desktop.text, /DRAFT — NOT SAVED OR RELEASED/);
  assert.ok(desktop.height > 1500);
  assert.equal(desktop.overflow, false);
  await evaluate("document.querySelector('iframe').contentWindow.print=()=>{window.__printed=document.querySelector('iframe').contentDocument.body.innerText}");
  await evaluate("Array.from(document.querySelectorAll('button')).find(button=>button.textContent==='Print Draft').click()");
  await wait("!!window.__printed", "Print action was not called");
  assert.doesNotMatch(await evaluate("window.__printed"), /Back to Entry|Fit to Page|Save Result/);
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await delay(250);
  assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth"), false);
  assert.ok(await evaluate("document.querySelector('iframe').getBoundingClientRect().width<390"));
  await evaluate("Array.from(document.querySelectorAll('button')).find(button=>button.textContent==='Back to Entry').click()");
  await delay(100);
  assert.equal(await evaluate("document.getElementById('laboratory-notes').value"), "Browser checked notes");
  assert.equal(await evaluate("document.activeElement.id"), "preview-laboratory-result");
  console.log("PASS desktop/mobile preview, isolated print action, draft preservation and restored focus");
  await evaluate("document.getElementById('preview-laboratory-result').click()");
  await wait(readyExpression, "Second preview did not become ready");
  await send("Emulation.setDeviceMetricsOverride", { width: 1180, height: 860, deviceScaleFactor: 1, mobile: false });
  await delay(200);
  const screenshot = await send("Page.captureScreenshot", { format: "png" });
  const screenshotPath = path.join(os.tmpdir(), "techcare-lab-print-preview.png");
  await fs.writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
  const reportHtml = await evaluate("'<!doctype html>'+document.querySelector('iframe').contentDocument.documentElement.outerHTML");
  const logo = `data:image/png;base64,${(await fs.readFile('public/assets/images/reyna-g-logo.png')).toString('base64')}`;
  await send("Page.navigate", { url: "about:blank" });
  await delay(100);
  const tree = await send("Page.getFrameTree");
  await send("Page.setDocumentContent", { frameId: tree.frameTree.frame.id, html: reportHtml.replaceAll('src="/assets/images/reyna-g-logo.png"', `src="${logo}"`) });
  await wait("Array.from(document.images).every(image=>image.complete&&image.naturalWidth>0)", "PDF image did not load");
  const pdf = await send("Page.printToPDF", { preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
  const pageCount = (Buffer.from(pdf.data, "base64").toString("latin1").match(/\/Type\s*\/Page\b/g) || []).length;
  assert.ok(pageCount > 1);
  assert.match(Buffer.from(pdf.data, "base64").toString("latin1"), /\/MediaBox\s*\[0 0 612 936\]/);
  console.log(`PASS top-half pagination (${pageCount} portrait long bond pages). Screenshot: ${screenshotPath}`);
  for (const layout of Object.keys(layoutReports)) {
    await send('Page.navigate', {url:`${origin}/__laboratory_print_check?layout=${layout}`});
    await wait("Array.from(document.querySelectorAll('button')).some(button=>button.textContent==='Print'&&!button.disabled)", `${layout} preview did not become ready`);
    const dimensions = await evaluate("(()=>{const doc=document.querySelector('iframe').contentDocument;const bounds=doc.querySelector('.report-sheet').getBoundingClientRect();return {width:doc.body.offsetWidth,height:doc.body.offsetHeight,reportTop:bounds.top,reportLeft:bounds.left,reportBottom:bounds.bottom,remarks:doc.querySelector('.notes p').textContent,overflow:doc.documentElement.scrollWidth>doc.documentElement.clientWidth};})()");
    assert.equal(dimensions.width, 816);
    assert.equal(dimensions.height, 1248, `${layout} should show a full long bond sheet`);
    assert.ok(dimensions.reportBottom <= 624, `${layout} must stay in the top half (report ends at ${dimensions.reportBottom}px)`);
    assert.equal(dimensions.reportTop, 6, `${layout} should have a small top margin`);
    assert.equal(dimensions.reportLeft, 24, `${layout} should have a quarter-inch side margin`);
    assert.equal(dimensions.remarks, layoutReports[layout].remarks, `${layout} should preserve all remarks`);
    assert.equal(dimensions.overflow, false, `${layout} should fit the page width`);
    const layoutHtml = await evaluate("'<!doctype html>'+document.querySelector('iframe').contentDocument.documentElement.outerHTML");
    await send('Page.navigate', {url:'about:blank'});
    await delay(100);
    const layoutTree = await send('Page.getFrameTree');
    await send('Page.setDocumentContent',{frameId:layoutTree.frameTree.frame.id,html:layoutHtml.replaceAll('src="/assets/images/reyna-g-logo.png"',`src="${logo}"`)});
    await wait("Array.from(document.images).every(image=>image.complete&&image.naturalWidth>0)", 'Layout assets did not load');
    const layoutPdf = await send('Page.printToPDF',{preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false});
    const pdfText = Buffer.from(layoutPdf.data,'base64').toString('latin1');
    assert.equal((pdfText.match(/\/Type\s*\/Page\b/g)||[]).length,1,`${layout} must print on one portrait long bond sheet`);
    assert.match(pdfText,/\/MediaBox\s*\[0 0 612 936\]/);
    await fs.writeFile(path.join(os.tmpdir(),`techcare-lab-${layout}.pdf`),Buffer.from(layoutPdf.data,'base64'));
    await send('Emulation.setDeviceMetricsOverride',{width:816,height:1248,deviceScaleFactor:1,mobile:false});
    const capture=await send('Page.captureScreenshot',{format:'png'});
    await fs.writeFile(path.join(os.tmpdir(),`techcare-lab-${layout}.png`),Buffer.from(capture.data,'base64'));
    await send('Emulation.setDeviceMetricsOverride',{width:1180,height:860,deviceScaleFactor:1,mobile:false});
    console.log(`PASS ${layout}: top half of one portrait 8.5 × 13 inch PDF page`);
  }
  assert.deepEqual(browserErrors, []);
  await send("Browser.close").catch(() => {});
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  socket?.close();
  browser?.kill();
  server.httpServer?.closeAllConnections();
  await Promise.race([server.close(), delay(3000)]);
  // Verify this is precisely the temporary profile owned by this check.
  const target = path.resolve(profile);
  if (path.dirname(target) === path.resolve(os.tmpdir()) && path.basename(target).startsWith("techcare-print-browser-")) {
    await fs.rm(target, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 }).catch(() => {});
  }
  process.exit(process.exitCode || 0);
}

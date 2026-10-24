import type { BillingEntry, BillingItem, BillingLine, BillingRecord, UnpaidRequests } from "../../../../interface/Billing";
import type { Patient } from "../../../../interface/Patient";
import type { Service } from "../../../../interface/Service";
import type { QueueRequests } from "../../../../interface/Queue";

export const money = (value: number | null) => value === null
  ? "Not available"
  : new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);

export function numericAmount(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function billingDate(value: string, time = false) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Not recorded";
  return new Date(value).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    ...(time ? { hour: "2-digit", minute: "2-digit" } : { month: "short", day: "numeric", year: "numeric" }),
  });
}

function patientDetails(id: string, patients: Patient[]) {
  const patient = patients.find((value) => value.patient_id === id);
  let age: number | null = null;
  if (patient?.birthdate && /^\d{4}-\d{2}-\d{2}/.test(patient.birthdate)) {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
    const [year, month, day] = patient.birthdate.slice(0, 10).split("-").map(Number);
    const [currentYear, currentMonth, currentDay] = today.split("-").map(Number);
    const result = currentYear - year - (currentMonth < month || (currentMonth === month && currentDay < day) ? 1 : 0);
    if (result >= 0 && result <= 130) age = result;
  }
  return {
    patientName: patient ? [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ") : id,
    age,
    sex: patient?.sex || "Not recorded",
  };
}

function lines(items: BillingItem[], services: Service[], saved = false): BillingLine[] {
  return items.map((item, index) => {
    const service = services.find((value) => value.service_id === item.service_id);
    return {
      id: `${item.service_id || "item"}-${index}`,
      name: item.service_name || service?.service_name || "Laboratory service",
      category: item.service_category || service?.service_category || "Laboratory",
      quantity: typeof item.quantity === "number" && Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1,
      // Historical bills must use their saved prices, never today's service price.
      price: numericAmount(item.price) ?? (saved ? null : numericAmount(service?.price)),
    };
  });
}

export function serviceSubtotal(items: BillingLine[]): number | null {
  if (!items.length || items.some((item) => item.price === null)) return null;
  return Math.round(items.reduce((total, item) => total + item.price! * item.quantity, 0) * 100) / 100;
}

export function requestEntry(request: UnpaidRequests, patients: Patient[], services: Service[]): BillingEntry {
  const items = Array.isArray(request.items) ? request.items : request.service_id || request.service_name ? [request] : [];
  const details = patientDetails(request.patient_id, patients);
  const selected = lines(items, services);
  return {
    ...details,
    id: request.request_id,
    patientId: request.patient_id,
    patientName: request.patient_name || details.patientName,
    createdAt: request.created_at,
    requester: request.requested_by || "Not recorded",
    type: "Laboratory",
    status: request.is_paid === true ? "Paid" : "Pending",
    method: request.payment_method || "Not recorded",
    lines: selected,
    total: numericAmount(request.total_amount) ?? serviceSubtotal(selected),
    discountPercent: null,
    receiptId: "",
    request,
  };
}

export function paidRequestsAwaitingLab(rows: QueueRequests[], patients: Patient[], services: Service[]): BillingEntry[] {
  const requests = new Map<string, UnpaidRequests>();
  for (const row of rows) {
    if (row.record_type !== "laboratory" || !row.request_id || row.is_paid !== true || row.request_status !== "Paid") continue;
    let request = requests.get(row.request_id);
    if (!request) {
      request = { record_type: "laboratory", request_id: row.request_id, patient_id: row.patient_id,
        patient_name: row.patient_name, is_paid: true, requested_by: row.created_by,
        requester_role: "", created_at: row.created_at, items: [] };
      requests.set(row.request_id, request);
    }
    request.items!.push({ service_id: row.service_id, service_name: row.service_name, quantity: 1 });
  }
  return [...requests.values()].map((request) => ({ ...requestEntry(request, patients, services), needsLabQueue: true }));
}

export function recordEntry(record: BillingRecord, patients: Patient[], services: Service[]): BillingEntry {
  const confirmation = record.record_type === "laboratory_confirmation";
  return {
    ...patientDetails(record.patient_id, patients),
    id: String(record.bill_id),
    reference: record.request_id || String(record.bill_id),
    referenceLabel: confirmation ? "Request ID" : "Bill ID",
    dateLabel: confirmation ? "Request date" : "Payment date",
    patientId: record.patient_id,
    createdAt: record.billed_at || record.created_at || "",
    requester: "Not recorded",
    type: confirmation ? "Laboratory" : "Payment",
    status: record.status?.toLowerCase() === "paid" ? "Paid" : record.status?.toLowerCase() === "cancelled" ? "Cancelled" : "Pending",
    method: record.payment_method || "Not recorded",
    lines: lines(Array.isArray(record.items) ? record.items : [], services, true),
    total: numericAmount(record.total_amount),
    discountPercent: numericAmount(record.discount_pct),
    receiptId: record.receipt_id || "",
  };
}

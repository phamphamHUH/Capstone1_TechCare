import { calculateAge } from "./calculateAge.js";

export function buildPrintablePatientRecord(
  patient: Record<string, any>,
  queueEntries: Record<string, any>[] = [],
  labRequests: Record<string, any>[] = [],
  billing: Record<string, any>[] = [],
) {
  const fullName = [
    patient.first_name,
    patient.middle_name,
    patient.last_name,
    patient.suffix,
  ]
    .filter(Boolean)
    .join(" ");

  const summary = {
    age: calculateAge(patient.birthdate ?? patient.date_of_birth),
    sex: patient.sex ?? "N/A",
    blood_type: patient.blood_type ?? "N/A",
    civil_status: patient.civil_status ?? "N/A",
    total_visits: Array.isArray(queueEntries) ? queueEntries.length : 0,
    total_lab_requests: Array.isArray(labRequests) ? labRequests.length : 0,
    total_billing: billing
      .reduce((sum, item) => sum + Number(item.total_amount ?? 0), 0)
      .toFixed(2),
    pending_balance: billing
      .filter((item) => String(item.status ?? "").toLowerCase() !== "paid")
      .reduce((sum, item) => sum + Number(item.total_amount ?? 0), 0)
      .toFixed(2),
  };

  return {
    patient: {
      patient_id: patient.patient_id,
      full_name: fullName,
      first_name: patient.first_name,
      middle_name: patient.middle_name,
      last_name: patient.last_name,
      suffix: patient.suffix,
      sex: patient.sex,
      email: patient.email,
      address: patient.address,
      contact_number: patient.contact_number,
      birthdate: patient.birthdate ?? patient.date_of_birth,
      blood_type: patient.blood_type,
      civil_status: patient.civil_status,
      image_url: patient.image_url,
      created_at: patient.created_at,
      updated_at: patient.updated_at,
    },
    summary,
    visits: queueEntries.map((visit) => ({
      queue_id: visit.queue_id,
      service_id: visit.service_id,
      status: visit.status,
      created_at: visit.created_at,
      updated_at: visit.updated_at,
    })),
    labRequests: labRequests.map((request) => ({
      request_id: request.request_id,
      status: request.status,
      is_paid: request.is_paid,
      requested_at: request.requested_at,
      updated_at: request.updated_at,
    })),
    billing: billing.map((bill) => ({
      bill_id: bill.bill_id,
      total_amount: Number(bill.total_amount ?? 0).toFixed(2),
      status: bill.status,
      payment_method: bill.payment_method,
      billed_at: bill.billed_at,
    })),
  };
}

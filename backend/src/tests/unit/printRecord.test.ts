import { describe, expect, it } from "vitest";
import { buildPrintablePatientRecord } from "../../controllers/fdstaff/getRequests.controller.js";

describe("buildPrintablePatientRecord", () => {
  it("creates a summary and list data for printing a patient record", () => {
    const patient = {
      patient_id: "P-2026-0001",
      first_name: "Maria",
      middle_name: "Santos",
      last_name: "Dela Cruz",
      suffix: "",
      sex: "Female",
      address: "123 Main St",
      email: "maria@example.com",
      contact_number: "09123456789",
      birthdate: "1994-05-12",
      blood_type: "O+",
      civil_status: "Married",
      image_url: null,
    };

    const queueEntries = [
      { queue_id: "Q-1", status: "serving", created_at: "2026-09-01T08:00:00.000Z" },
      { queue_id: "Q-2", status: "waiting", created_at: "2026-09-10T09:00:00.000Z" },
    ];

    const labRequests = [
      { request_id: "LAB-001", status: "Completed", is_paid: true, requested_at: "2026-09-11T10:00:00.000Z" },
    ];

    const billing = [
      { bill_id: "B-1", total_amount: "1200.00", status: "Paid", payment_method: "Cash", billed_at: "2026-09-12T13:00:00.000Z" },
      { bill_id: "B-2", total_amount: "350.00", status: "Unpaid", payment_method: "GCash", billed_at: "2026-09-13T14:00:00.000Z" },
    ];

    const result = buildPrintablePatientRecord(patient as any, queueEntries as any, labRequests as any, billing as any);

    expect(result.patient.full_name).toBe("Maria Santos Dela Cruz");
    expect(result.summary.age).toBe(32);
    expect(result.summary.total_visits).toBe(2);
    expect(result.summary.total_billing).toBe("1550.00");
    expect(result.summary.pending_balance).toBe("350.00");
    expect(result.labRequests[0].status).toBe("Completed");
  });
});

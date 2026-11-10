import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";
import type { Request, Response } from "express";

// Every database entry point is replaced before controllers are imported.
// These checks never import or connect to the configured clinic database.
const state = vi.hoisted(() => ({ db: null as PGlite | null }));
vi.mock("../../config/db.js", () => {
  const query = (text: string, values: unknown[] = []) =>
    state.db!.query(text, values);
  const sql = Object.assign(
    async (parts: TemplateStringsArray, ...values: unknown[]) => {
      const text = parts.reduce(
        (result, part, index) => result + (index ? `$${index}` : "") + part,
        "",
      );
      return (await query(text, values)).rows;
    },
    {
      query: async (text: string, values?: unknown[]) =>
        (await query(text, values)).rows,
    },
  );
  return { sql, pool: { connect: async () => ({ query, release() {} }) } };
});
vi.mock("../../config/env.js", () => ({ ENV: { IS_PRODUCTION: false } }));
vi.mock("../../config/cloudinary.js", () => ({ default: {} }));
vi.mock("../../services/queue-sse/index.js", () => ({
  publishQueueChange: vi.fn(),
}));

import { confirmPayment } from "../../controllers/fdstaff/updateRequests.controller.js";
import {
  addBills,
  addConsultationRecord,
  addLaboratoryRequest,
} from "../../controllers/fdstaff/postRequests.controller.js";
import {
  getBillDetails,
  getBills,
} from "../../controllers/fdstaff/getRequests.controller.js";
import { addLaboratoryRequest as addDoctorLaboratoryRequest } from "../../controllers/doctor/postRequests.controller.js";
import { recomputeBillTotals } from "../../utils/recomputeBills.js";

let db: PGlite;
let definitions: string;
async function invoke(
  handler: Function,
  body = {},
  params = { bill_id: "B-TEST" },
) {
  const response = {
    code: 200,
    body: null as any,
    status(code: number) {
      this.code = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  await handler(
    {
      body,
      params,
      query: {},
      user: { user_id: "U-TEST" },
    } as unknown as Request,
    response as unknown as Response,
  );
  return response;
}
const pay = (options = {}) =>
  invoke(confirmPayment, {
    payment_method: "Cash",
    discount_type: "Senior Citizen",
    amount_received: 1500,
    priority: true,
    ...options,
  });
const rows = async (text: string) => (await db.query<any>(text)).rows;
const bill = async () =>
  (await rows("SELECT * FROM bills WHERE bill_id = 'B-TEST'"))[0];
const list = async () => (await invoke(getBills)).body.bills as any[];

beforeAll(async () => {
  db = new PGlite();
  state.db = db;
  definitions = await readFile(
    new URL("../../config/db.ts", import.meta.url),
    "utf8",
  );
  // db.ts builds each CREATE TABLE from TABLES, the single source of truth, but
  // refuses to load without a database URL, so read the definitions from its source.
  const start = definitions.indexOf(
    "[",
    definitions.indexOf("const TABLES: TableDefinition[]"),
  );
  const tables = new Function(
    `return ${definitions.slice(start, definitions.indexOf("\n];", start) + 2)}`,
  )() as { table: string; columns: Record<string, string> }[];
  expect(tables.length).toBeGreaterThan(15);
  for (const { table, columns } of tables) {
    await db.exec(
      `CREATE TABLE IF NOT EXISTS "${table}" (${Object.entries(columns)
        .map(([name, type]) => `"${name}" ${type}`)
        .join(", ")})`,
    );
  }
});
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.exec(`TRUNCATE users, patients, services, bills, queue_entries, consultation_records, test_requests, test_request_items CASCADE;
    INSERT INTO users(user_id,username,password_hash,first_name,last_name,sex,email,contact_number,address,birthdate,role,date_hired)
      VALUES ('U-TEST','staff','test','Test','Staff','Male','staff@example.test','000','Test','1980-01-01','frontdesk_staff','2020-01-01');
    INSERT INTO patients(patient_id,username,password_hash,first_name,last_name,sex,email,contact_number,street,barangay,city,province,zip_code,birthdate)
      VALUES ('P-TEST','patient','test','Juan','Test','Male','patient@example.test','000','Street','Barangay','City','Province','1000','1950-01-01');
    INSERT INTO services(service_id,service_type,service_name,price,room,service_category) VALUES
      ('S-C','Consultation','Consultation',500,'CONS-1','Consultation'),
      ('S-L','Laboratory','CBC',650,'LAB-1','Hematology'),
      ('S-U','Laboratory','Urinalysis',250,'LAB-1','Clinical Microscopy');
    INSERT INTO bills(bill_id,patient_id) VALUES ('B-TEST','P-TEST');
    INSERT INTO consultation_records(consultation_record_id,patient_id,service_id,requested_by,bill_id)
      VALUES ('C-TEST','P-TEST','S-C','U-TEST','B-TEST');
    INSERT INTO test_requests(request_id,patient_id,requested_by) VALUES ('REQ-TEST','P-TEST','U-TEST');
    INSERT INTO test_request_items(item_id,request_id,service_id,bill_id) VALUES
      ('I-L','REQ-TEST','S-L','B-TEST'),('I-U','REQ-TEST','S-U','B-TEST');`);
});

test("fresh production schema preserves invoice columns", async () => {
  const section = definitions.slice(
    definitions.indexOf('table: "bills"'),
    definitions.indexOf('table: "queue_entries"'),
  );
  for (const column of [
    "items",
    "discount_pct",
    "invoice_id",
    "invoice_issued_at",
    "billed_at",
  ]) {
    expect(section).toMatch(new RegExp(`${column}:`));
    expect(
      (
        await db.query(
          "SELECT column_name FROM information_schema.columns WHERE table_name='bills' AND column_name=$1",
          [column],
        )
      ).rows,
    ).toHaveLength(1);
  }
});

test("mixed service payment saves canonical totals, snapshots and one priority queue", async () => {
  const result = await pay();
  expect(result.code).toBe(200);
  expect(result.body.queued).toBe(true);
  expect(result.body.change).toBe(380);
  expect(result.body.already_paid).toBe(false);
  expect(result.body.bill.is_senior).toBeUndefined();
  const saved = await bill();
  expect(saved.status).toBe("Paid");
  expect(Number(saved.subtotal)).toBe(1400);
  expect(Number(saved.total_amount)).toBe(1120);
  expect(Number(saved.discount_rate)).toBe(20);
  expect(saved.items).toHaveLength(3);
  expect(saved.invoice_id).toBeTruthy();
  expect(await rows("SELECT * FROM queue_entries")).toHaveLength(1);
  expect(
    (await rows("SELECT is_paid FROM consultation_records"))[0].is_paid,
  ).toBe(true);
  expect((await rows("SELECT is_paid,status FROM test_requests"))[0]).toEqual({
    is_paid: true,
    status: "Paid",
  });
  expect(
    (await rows("SELECT is_priority FROM queue_entries"))[0].is_priority,
  ).toBe(true);
});

test("laboratory queue entries only exist after payment", async () => {
  expect(await rows("SELECT * FROM queue_entries")).toHaveLength(0);
  await pay({ amount_received: 1 });
  expect(await rows("SELECT * FROM queue_entries")).toHaveLength(0);
  await pay();
  expect(await rows("SELECT * FROM queue_entries")).toHaveLength(1);
});

test("forwarding failure retains payment and retry never charges or queues twice", async () => {
  await db.exec("UPDATE services SET room='' WHERE service_id='S-L'");
  const first = await pay();
  expect(first.code).toBe(200);
  expect(first.body.queued).toBe(false);
  expect(first.body.has_laboratory_items).toBe(true);
  const saved = await bill();
  expect(saved.status).toBe("Paid");
  expect((await list())[0].laboratory_status).toBe("Needs forwarding");
  await db.exec("UPDATE services SET room='LAB-1' WHERE service_id='S-L'");
  for (let index = 0; index < 2; index++) {
    const retry = await invoke(confirmPayment, {});
    expect(retry.body.queued).toBe(true);
    expect(retry.body.already_paid).toBe(true);
    expect(retry.body.bill.invoice_id).toBe(saved.invoice_id);
  }
  expect(Number((await bill()).total_amount)).toBe(1120);
  expect((await list())[0].laboratory_status).toBe("Forwarded");
  expect(await rows("SELECT * FROM queue_entries")).toHaveLength(1);
  expect(
    (await rows("SELECT is_priority FROM queue_entries"))[0].is_priority,
  ).toBe(true);
});

test("a repeated payment reports the bill as already paid and changes nothing", async () => {
  await pay();
  const before = await bill();
  const again = await pay({
    discount_type: "Not Eligible",
    amount_received: 9999,
  });
  expect(again.code).toBe(200);
  expect(again.body.already_paid).toBe(true);
  expect(again.body.change).toBe(0);
  expect(again.body.message).toMatch(/already paid/i);
  const after = await bill();
  expect(after.total_amount).toBe(before.total_amount);
  expect(after.paid_at).toEqual(before.paid_at);
  expect(await rows("SELECT * FROM queue_entries")).toHaveLength(1);
});

test("paid amounts and history never change after catalog prices change", async () => {
  await pay();
  await db.exec("UPDATE services SET price=9999");
  const client = {
    query: (text: string, values: unknown[]) => db.query(text, values),
  };
  await recomputeBillTotals(client as any, "B-TEST");
  expect(Number((await bill()).total_amount)).toBe(1120);
  const details = await invoke(getBillDetails);
  expect(details.code).toBe(200);
  expect(
    details.body.items
      .map((item: any) => Number(item.price))
      .sort((a: number, b: number) => a - b),
  ).toEqual([250, 500, 650]);
  expect(Number((await list())[0].total_amount)).toBe(1120);
});

test("pending details use current linked rows and catalog prices", async () => {
  await db.exec("UPDATE services SET price=700 WHERE service_id='S-L'");
  const details = await invoke(getBillDetails);
  expect(details.body.bill.status).toBe("Pending");
  expect(
    details.body.items.map((item: any) => item.service_name).sort(),
  ).toEqual(["CBC", "Consultation", "Urinalysis"]);
  expect(
    details.body.items.find((item: any) => item.service_name === "CBC")
      .line_type,
  ).toBe("laboratory");
  expect(
    Number(
      details.body.items.find((item: any) => item.service_name === "CBC").price,
    ),
  ).toBe(700);
  expect(Number((await list())[0].total_amount)).toBe(1450);
});

test("invalid cash, transfer reference and eligibility never record a payment", async () => {
  expect((await pay({ amount_received: 1 })).code).toBe(400);
  expect((await pay({ amount_received: null })).code).toBe(400);
  expect(
    (await pay({ payment_method: "Instapay/QRpH", reference_num: "" })).code,
  ).toBe(400);
  expect(
    (await pay({ payment_method: "Instapay/QRpH", reference_num: null })).code,
  ).toBe(400);
  expect(
    (
      await pay({
        payment_method: "Instapay/QRpH",
        reference_num: "x".repeat(51),
      })
    ).code,
  ).toBe(400);
  expect((await pay({ payment_method: "Bitcoin" })).code).toBe(400);
  expect((await pay({ discount_type: "Custom" })).code).toBe(400);
  expect((await pay({ discount_type: "PWD" })).code).toBe(400);
  await db.exec("UPDATE patients SET birthdate='2000-01-01'");
  expect((await pay()).code).toBe(400);
  expect((await bill()).status).toBe("Pending");
  expect(await rows("SELECT * FROM queue_entries")).toHaveLength(0);
});

test("PWD bank payments exclude cancelled items and retain transfer reference", async () => {
  await db.exec(
    "UPDATE patients SET birthdate='2000-01-01',is_pwd=true; UPDATE test_request_items SET status='Cancelled' WHERE item_id='I-U'",
  );
  const result = await pay({
    discount_type: "PWD",
    payment_method: "Instapay/QRpH",
    amount_received: null,
    reference_num: "TRANSFER-1",
  });
  expect(result.code).toBe(200);
  expect(result.body.queued).toBe(true);
  const saved = await bill();
  expect(Number(saved.total_amount)).toBe(920);
  expect(saved.discount_type).toBe("PWD");
  expect(saved.reference_num).toBe("TRANSFER-1");
  expect(saved.items).toHaveLength(2);
});

test("consultation-only payment succeeds without laboratory forwarding", async () => {
  await db.exec("DELETE FROM test_request_items");
  expect((await list())[0].laboratory_status).toBe("No laboratory tests");
  const result = await pay({
    discount_type: "Not Eligible",
    amount_received: 500,
  });
  expect(result.code).toBe(200);
  expect(result.body.has_laboratory_items).toBe(false);
  expect(result.body.queued).toBe(true);
  expect(Number((await bill()).total_amount)).toBe(500);
});

test("one list returns pending and paid bills in one status vocabulary", async () => {
  await db.exec(`INSERT INTO bills(bill_id,patient_id,status,total_amount,items) VALUES
    ('B-OLD-UNPAID','P-TEST','Unpaid',300,'[{"service_name":"Legacy test","price":300,"quantity":1}]'),
    ('B-OLD-LOWER','P-TEST',' paid ',100,'[{"service_name":"Old paid","price":100,"quantity":1}]'),
    ('B-GONE','P-TEST','Cancelled',50,NULL)`);
  const result = await invoke(getBills);
  expect(result.code).toBe(200);
  expect(Object.keys(result.body)).toEqual(["bills"]);
  const byId = Object.fromEntries(
    (result.body.bills as any[]).map((row) => [row.bill_id, row]),
  );
  expect(Object.keys(byId).sort()).toEqual([
    "B-OLD-LOWER",
    "B-OLD-UNPAID",
    "B-TEST",
  ]);
  expect(byId["B-OLD-UNPAID"].status).toBe("Pending");
  expect(byId["B-OLD-LOWER"].status).toBe("Paid");
  expect(byId["B-OLD-UNPAID"].services).toEqual(["Legacy test"]);
  expect(byId["B-TEST"].services).toHaveLength(3);
  expect(byId["B-TEST"].laboratory_status).toBe("Waiting for payment");
  expect(byId["B-TEST"].services).toEqual(
    expect.arrayContaining(["CBC", "Consultation", "Urinalysis"]),
  );
  expect(byId["B-TEST"].items).toBeUndefined();
  // Open work always comes first, so the row limit can never hide it.
  expect(result.body.bills.at(-1).status).toBe("Paid");
  expect(
    (await rows("SELECT status FROM bills WHERE bill_id='B-OLD-UNPAID'"))[0]
      .status,
  ).toBe("Unpaid");
});

test("a legacy Unpaid bill appears as Pending and can really be paid", async () => {
  await db.exec("UPDATE bills SET status='Unpaid'");
  expect((await invoke(getBillDetails)).body.bill.status).toBe("Pending");
  const result = await pay();
  expect(result.code).toBe(200);
  expect((await bill()).status).toBe("Paid");
  expect(await rows("SELECT * FROM queue_entries")).toHaveLength(1);
});

test("frontdesk consultation and laboratory requests share one linked open bill", async () => {
  await db.exec(
    "TRUNCATE bills, consultation_records, test_requests, test_request_items CASCADE",
  );
  const consultation = await invoke(addConsultationRecord, {
    patient_id: "P-TEST",
    service_id: "S-C",
  });
  expect(consultation.code).toBe(201);
  expect(consultation.body.is_new_bill).toBe(true);
  const billId = consultation.body.bill.bill_id;
  expect(billId).toMatch(/^B-\d{2}-\d{4}-\d{4}$/);
  const laboratory = await invoke(addLaboratoryRequest, {
    patient_id: "P-TEST",
    services: [{ service_id: "S-L" }],
  });
  expect(laboratory.code).toBe(201);
  expect(laboratory.body.is_new_bill).toBe(false);
  expect(laboratory.body.bill.bill_id).toBe(billId);
  expect(Number(laboratory.body.bill.total_amount)).toBe(1150);
  expect(laboratory.body.items[0].bill_id).toBe(billId);
});

test("doctor laboratory requests are linked to the open bill and forwarded only after payment", async () => {
  await db.exec(
    "TRUNCATE bills, consultation_records, test_requests, test_request_items, queue_entries CASCADE",
  );
  const created = await invoke(addDoctorLaboratoryRequest, {
    patient_id: "P-TEST",
    services: ["S-L", "S-U"],
    priority: "No",
    request_date: "2026-11-07",
  });
  expect(created.code).toBe(201);
  expect(created.body.is_new_bill).toBe(true);
  const billId = created.body.bill.bill_id;
  expect(created.body.items.map((item: any) => item.bill_id)).toEqual([
    billId,
    billId,
  ]);
  expect(Number(created.body.bill.total_amount)).toBe(900);
  expect(await rows("SELECT * FROM queue_entries")).toHaveLength(0);
  const paid = await invoke(
    confirmPayment,
    { amount_received: 900 },
    { bill_id: billId },
  );
  expect(paid.code).toBe(200);
  expect(paid.body.queued).toBe(true);
  expect(await rows("SELECT * FROM queue_entries")).toHaveLength(1);
});

test("doctor laboratory requests accept a consultation that has no assigned doctor yet", async () => {
  const created = await invoke(addDoctorLaboratoryRequest, {
    patient_id: "P-TEST",
    consultation_record_id: "C-TEST",
    services: ["S-L"],
    priority: "No",
    request_date: "2026-11-07",
  });
  expect(created.code).toBe(201);
  expect(created.body.bill.bill_id).toBe("B-TEST");
});

test("a saved-items legacy open bill keeps its amount when a new request arrives", async () => {
  await db.exec(`TRUNCATE bills, consultation_records, test_requests, test_request_items CASCADE;
    INSERT INTO bills(bill_id,patient_id,status,total_amount,items) VALUES ('B-LEGACY','P-TEST','Unpaid',300,'[{"service_name":"Legacy","price":300,"quantity":1}]')`);
  const created = await invoke(addLaboratoryRequest, {
    patient_id: "P-TEST",
    services: [{ service_id: "S-L" }],
  });
  expect(created.body.bill.bill_id).not.toBe("B-LEGACY");
  expect(
    Number(
      (await rows("SELECT total_amount FROM bills WHERE bill_id='B-LEGACY'"))[0]
        .total_amount,
    ),
  ).toBe(300);
  const paidLegacy = await invoke(
    confirmPayment,
    { amount_received: 300, discount_type: "Not Eligible" },
    { bill_id: "B-LEGACY" },
  );
  expect(paidLegacy.code).toBe(200);
  expect(Number(paidLegacy.body.bill.total_amount)).toBe(300);
});

test("standalone invoices retain exact custom peso discounts and canonical totals", async () => {
  const result = await invoke(addBills, {
    patient_id: "P-TEST",
    services_ids: ["S-L", "S-U"],
    discount_amount: 7.77,
    discount_type: "Custom",
    payment_method: "Cash",
  });
  expect(result.code).toBe(201);
  const saved = result.body.bill;
  expect(saved.bill_id).toMatch(/^B-\d{2}-\d{4}-\d{4}$/);
  expect(Number(saved.subtotal)).toBe(900);
  expect(Number(saved.total_amount)).toBe(892.23);
  expect(Number(saved.discount_amount)).toBe(7.77);
  expect(saved.discount_type).toBe("Custom");
  expect(saved.items).toHaveLength(2);
  expect(saved.invoice_id).toBeTruthy();
  expect(saved.paid_at).toBeTruthy();
});

test("standalone senior invoices preserve discount type and validate eligibility", async () => {
  const payload = {
    patient_id: "P-TEST",
    services_ids: ["S-L"],
    discount_pct: 20,
    discount_type: "Senior Citizen",
    payment_method: "Cash",
  };
  const result = await invoke(addBills, payload);
  expect(result.code).toBe(201);
  expect(result.body.bill.discount_type).toBe("Senior Citizen");
  expect(Number(result.body.bill.total_amount)).toBe(520);
  await db.exec("UPDATE patients SET birthdate='2000-01-01'");
  expect((await invoke(addBills, payload)).code).toBe(400);
});

test("legacy paid history does not invent item prices and cancelled bills cannot be paid", async () => {
  await db.exec("UPDATE bills SET status='Paid',total_amount=123,items=NULL");
  const details = await invoke(getBillDetails);
  expect(details.body.items).toEqual([]);
  expect(Number(details.body.bill.total_amount)).toBe(123);
  await db.exec("UPDATE bills SET status='Cancelled'");
  expect((await pay()).code).toBe(409);
  expect((await invoke(getBillDetails)).code).toBe(404);
  expect(await rows("SELECT * FROM queue_entries")).toHaveLength(0);
});

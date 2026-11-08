// One row of GET /api/fdstaff/billings. NUMERIC columns arrive as strings.
export type Bill = {
  bill_id: string;
  patient_id: string;
  patient_name: string;
  sex: string | null;
  birthdate: string | null;
  age: number | null;
  is_senior: boolean;
  is_pwd: boolean;
  status: "Pending" | "Paid";
  image_url: string | null;
  subtotal: number | string | null;
  discount_type: string | null;
  discount_amount: number | string | null;
  total_amount: number | string | null;
  payment_method: string | null;
  reference_num: string | null;
  invoice_id: string | null;
  paid_at: string | null;
  received_by: string | null;
  created_at: string;
  services: string[];
  laboratory_status:
    | "No laboratory tests"
    | "Waiting for payment"
    | "Needs forwarding"
    | "Forwarded";
  is_priority: boolean;
};

export type BillItem = {
  line_type?: "consultation" | "laboratory";
  item_id?: string;
  service_name: string;
  service_category?: string;
  price: number | string | null;
  quantity?: number;
};

// GET /api/fdstaff/billings/:bill_id/details
export type BillDetails = {
  bill: Bill;
  items: BillItem[];
};

export type PaymentMethod = "Cash" | "Instapay/QRpH";
export type DiscountType = "Not Eligible" | "Senior Citizen" | "PWD";

export type PaymentOptions = {
  payment_method: PaymentMethod;
  discount_type: DiscountType;
  amount_received: number | null;
  reference_num: string;
  priority: boolean;
};

// PATCH /api/fdstaff/billings/:bill_id/pay
export type PaymentResult = {
  message: string;
  bill: Pick<Bill, "bill_id" | "status">;
  change: number;
  already_paid: boolean;
  queued: boolean;
  has_laboratory_items: boolean;
};

export type PaymentOutcome =
  | { status: "failed" }
  | {
      status: "recorded";
      alreadyPaid: boolean;
      invoiceReady: boolean;
      forwarded: boolean;
    };

export type BillingStatistics = {
  total: number;
  pending: number;
  paid: number;
  awaitingLaboratory: number;
};

export type BillingNotice = { tone: "success" | "warning"; text: string };

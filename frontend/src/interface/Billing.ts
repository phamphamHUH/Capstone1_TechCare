export type Bill = {
  bill_id: string;
  patient_id: string;
  patient_name: string;
  image_url: string | null;
  sex: string | null;
  birthdate: string | null;
  age: number | null;
  is_senior: boolean;
  is_pwd: boolean;
  status: string;
  subtotal: number | string | null;
  discount_type: string | null;
  discount_rate: number | string | null;
  discount_id_no: string | null;
  discount_amount: number | string | null;
  discounted_by: string;
  received_by: string;
  services_count: number;
  total_amount: number | string | null;
  payment_method: string | null;
  paid_at: string | null;
  items?: BillingItem[];
  discount_pct?: number | string | null;
  receipt_id?: string | null;
  receipt_issued_at?: string | null;
  billed_at?: string | null;
  reference_num?: string | null;
  needs_lab_queue?: boolean;
  is_priority?: boolean;
  created_at: string;
};

export type BillDetails = {
  message: string;
  bill: Bill;
  items: BillItem[];
};

export interface BillItem {
  request_id?: string;
  quantity?: number;
  line_type: "consultation" | "laboratory";
  item_id: string;
  service_id: string;
  service_name: string;
  service_category: string;
  price: string | number;
  status: string;
  created_at: string;
}

export interface UnpaidRequests {
  record_type: "laboratory";
  lab_item_id?: string;
  request_id: string;
  patient_id: string;
  patient_name: string;
  service_id?: string;
  service_name?: string;
  is_paid: boolean;
  is_priority?: boolean;
  requested_by: string;
  requester_role: string;
  created_at: string;
  items?: BillingItem[];
  total_amount?: number | string;
  payment_method?: string;
}

export interface BillingItem {
  line_type?: "consultation" | "laboratory";
  item_id?: string;
  request_id?: string;
  service_id?: string;
  service_name?: string;
  service_category?: string;
  price?: number | string;
  quantity?: number;
}

export interface BillingRecord {
  bill_id: string | number;
  patient_id: string;
  items?: BillingItem[];
  total_amount: number | string | null;
  discount_pct?: number | string | null;
  payment_method?: string | null;
  record_type?: "bill" | "laboratory_confirmation";
  request_id?: string;
  status: string;
  receipt_id?: string | null;
  receipt_issued_at?: string | null;
  created_at?: string;
  billed_at?: string | null;
}

export interface BillingLine {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price: number | null;
}

export interface BillingEntry {
  id: string;
  patientId: string;
  patientName: string;
  age: number | null;
  sex: string;
  createdAt: string;
  requester: string;
  status: "Pending" | "Paid" | "Cancelled";
  type: string;
  method: string;
  lines: BillingLine[];
  total: number | null;
  discountPercent: number | null;
  receiptId: string;
  request?: UnpaidRequests;
  needsLabQueue?: boolean;
  bill?: Bill;
  isPwd?: boolean;
  isPriority?: boolean;
  reference?: string;
  referenceLabel?: "Request ID" | "Bill ID";
  dateLabel?: "Request date" | "Payment date" | "Created at";
}

export interface PaymentOptions {
  payment_method: "Cash" | "Instapay/QRpH";
  discount_type: "Not Eligible" | "Senior Citizen" | "PWD";
  amount_received: number | null;
  reference_num: string;
  priority: boolean;
}
export type BillingStatistics = {
  totalRequests: number;
  pendingPayment: number;
  paidRequests: number;
  cancelledRequests: number;
};

export type BillingTab = "billing-queue" | "payment-history";
export type PaymentMethodFilter = "all" | "cash" | "gcash" | "kiss";
export type StatusFilter = "all" | "paid" | "pending" | "cancelled";
export type ServiceFilter = "all" | "consultation" | "laboratory";

// Admin dashboard analytics.
// Mirrors backend/src/controllers/admin/dto/get.dto.ts
// (getSalesAnalytics, getServiceAnalytics). Update both together.

export type AnalyticsRange = "today" | "7d" | "30d" | "12mo";

export type SalesSummary = {
  revenue: number; // after discounts
  gross_sales: number; // before discounts
  discounts: number;
  paid_bills: number;
  average_bill: number;
  previous_revenue: number;
  previous_paid_bills: number;
  pending_amount: number; // unpaid right now, not limited to the range
  pending_bills: number;
};

export type SalesTimelinePoint = {
  bucket: string; // Manila time "YYYY-MM-DDTHH:MM:SS"
  revenue: number;
  bills: number;
};

export type SalesByPaymentMethod = {
  payment_method: string;
  revenue: number;
  bills: number;
};

export type SalesByServiceType = {
  service_type: string;
  revenue: number; // before discounts
  quantity: number;
};

export type SalesByService = {
  service_id: string | null;
  service_name: string;
  service_type: string;
  service_category: string | null;
  quantity: number;
  revenue: number; // before discounts
};

export type SalesAnalytics = {
  message: string;
  range: AnalyticsRange;
  bucket: "hour" | "day" | "month";
  start: string;
  end: string;
  summary: SalesSummary;
  timeline: SalesTimelinePoint[];
  payment_methods: SalesByPaymentMethod[];
  service_types: SalesByServiceType[];
  services: SalesByService[];
};

// GET /api/admin/analytics/bills (the bills behind the sales tiles)
export type AnalyticsBill = {
  bill_id: string;
  patient_id: string;
  patient_name: string | null;
  status: string; // "Paid" or "Pending"
  subtotal: number;
  discount_type: string | null;
  discount_amount: number;
  total_amount: number;
  payment_method: string | null;
  item_count: number;
  created_at: string; // Manila time "YYYY-MM-DDTHH:MM:SS"
  paid_at: string | null;
};

export type AnalyticsBills = {
  message: string;
  range: AnalyticsRange;
  start: string;
  end: string;
  paid: AnalyticsBill[]; // in the range, newest payment first
  pending: AnalyticsBill[]; // unpaid right now, oldest first
};

export type ServiceCatalogItem = {
  service_id: string;
  service_name: string;
  service_type: string;
  service_category: string | null;
  room: string;
  price: number;
  active: boolean;
  orders: number;
  last_ordered_at: string | null;
};

export type ServiceCatalogSummary = {
  total_services: number;
  active_services: number;
  inactive_services: number;
  consultation_services: number;
  laboratory_services: number;
  average_price: number;
  total_orders: number;
  unused_active_services: number;
};

export type ServiceAnalytics = {
  message: string;
  range: AnalyticsRange;
  start: string;
  end: string;
  summary: ServiceCatalogSummary;
  services: ServiceCatalogItem[];
};

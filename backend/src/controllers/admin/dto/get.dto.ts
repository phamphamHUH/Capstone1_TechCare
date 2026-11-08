export namespace getAllUsers {
  export interface user {
    id: number;
    user_id: string;
    username: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    suffix: string | null;
    sex: string;
    email: string;
    contact_number: string;
    emergency_contact_name: string | null;
    emergency_contact: string | null;
    address: string;
    birthdate: string;
    role: string;
    department: string | null;
    employment_status: string | null;
    date_hired: string;
    shift_start: string;
    shift_end: string;
    last_login: string | null;
    account_status: boolean;
    profile_photo: string | null;
    active: boolean;
    created_at: string;
    updated_at: string;
  }

  export interface response {
    users: user[];
  }

  export interface error {
    message?: string;
    error?: string;
  }
}

// =========================
// GET ALL ACTIVITIES
// =========================
export namespace getAllActivities {
  export interface activity {
    id: number;
    user_id: string;
    action_name: string;
    action_description: string | null;
    module: string;
    is_sensitive: boolean;
    status: string;
    target_type: string | null;
    target_id: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }

  export interface response {
    activities: activity[];
    message?: string;
  }

  export interface error {
    message?: string;
    error?: string;
  }
}

// =========================
// GET ALL SERVICES
// =========================
export namespace getAllservices {
  export interface Service {
    id: number;
    service_id: string;
    service_type: string;
    service_name: string;
    service_category: string;
    price: number | string;
    room: string;
    active: boolean;
    created_at: string;
    updated_at: string;
  }

  export interface ServicePackage {
    id: number;
    service_id: string;
    service_name: string;
    service_type: "package";
    service_category: string;
    price: string;
    room: string;
    active: boolean;
    service_ids: string[];
    service_names: string[];
    created_at: string;
    updated_at: string;
  }

  export interface response {
    services: Service[];
    packages: ServicePackage[];
  }

  export interface error {
    message?: string;
    error?: string;
  }
}

// =========================
// GET MY ACTIVITIES
// =========================
export namespace getMyActivities {
  export interface activity {
    id: number;
    activity_id: string;
    user_id: string;
    service_name: string;
    details: Record<string, unknown>;
    created_at: string;
  }

  export interface response {
    activities: activity[];
    message?: string;
  }

  export interface error {
    message?: string;
    error?: string;
  }
}

// =========================
// GET ALL FORM TEMPLATES
// =========================
export namespace getAllFormTemplates {
  export interface query {
    service_id?: string;
    status?: string;
  }

  export interface template {
    id: number;
    form_id: string;
    form_name: string;
    form_description: string | null;
    service_id: string;
    status: string;
    created_by: string;
    version: number;
    created_at: string;
    updated_at: string;
  }

  export interface response {
    message: string;
    formTemplates: template[];
  }

  export interface error {
    message?: string;
    error?: string;
  }
}

// =========================
// GET FORM TEMPLATE BY ID
// =========================
export namespace getFormTemplateById {
  export interface template {
    id: number;
    form_id: string;
    form_name: string;
    form_description: string | null;
    service_id: string;
    status: string;
    created_by: string;
    version: number;
    created_at: string;
    updated_at: string;
  }

  export interface component {
    id: number;
    form_component_id: string;
    form_id: string;
    type_id: string;
    label: string;
    field_key: string;
    display_order: number;
    settings: Record<string, unknown> | null;
    validation: Record<string, unknown> | null;
  }

  export interface response {
    message: string;
    formTemplate: template;
    components: component[];
  }

  export interface error {
    message?: string;
    error?: string;
  }
}

// =========================
// GET SALES ANALYTICS
// GET /api/admin/analytics/sales?range=today|7d|30d|12mo
// Money is NUMERIC in the database; the controller converts it with Number().
// =========================
export namespace getSalesAnalytics {
  export interface query {
    range?: string;
  }

  export interface summary {
    revenue: number; // SUM(bills.total_amount) of paid bills, after discounts
    gross_sales: number; // SUM(bills.subtotal), before discounts
    discounts: number; // SUM(bills.discount_amount)
    paid_bills: number;
    average_bill: number;
    previous_revenue: number; // same-length period right before this one
    previous_paid_bills: number;
    pending_amount: number; // unpaid bills right now, not limited to the range
    pending_bills: number;
  }

  export interface timelinePoint {
    bucket: string; // Manila time "YYYY-MM-DDTHH:MM:SS", start of the hour/day/month
    revenue: number;
    bills: number;
  }

  export interface paymentMethod {
    payment_method: string;
    revenue: number;
    bills: number;
  }

  export interface serviceType {
    service_type: string; // "consultation", "laboratory" or "other"
    revenue: number; // line totals before bill discounts
    quantity: number;
  }

  export interface serviceSales {
    service_id: string | null; // null for legacy bill items without an id
    service_name: string;
    service_type: string;
    service_category: string | null;
    quantity: number;
    revenue: number; // line totals before bill discounts
  }

  export interface response {
    message: string;
    range: string;
    bucket: "hour" | "day" | "month";
    start: string;
    end: string;
    summary: summary;
    timeline: timelinePoint[];
    payment_methods: paymentMethod[];
    service_types: serviceType[];
    services: serviceSales[];
  }

  export interface error {
    message: string;
  }
}

// =========================
// GET ANALYTICS BILLS
// GET /api/admin/analytics/bills?range=today|7d|30d|12mo
// The bills behind the sales tiles: paid bills in the range, and every
// unpaid bill right now (not limited to the range).
// =========================
export namespace getAnalyticsBills {
  export interface query {
    range?: string;
  }

  export interface bill {
    bill_id: string;
    patient_id: string;
    patient_name: string | null; // null when the patient row is missing
    status: string; // "Paid" or "Pending"
    subtotal: number;
    discount_type: string | null;
    discount_amount: number;
    total_amount: number;
    payment_method: string | null; // only meaningful for paid bills
    item_count: number;
    created_at: string; // Manila time "YYYY-MM-DDTHH:MM:SS"
    paid_at: string | null; // Manila time
  }

  export interface response {
    message: string;
    range: string;
    start: string;
    end: string;
    paid: bill[]; // newest payment first
    pending: bill[]; // oldest first
  }

  export interface error {
    message: string;
  }
}

// =========================
// GET SERVICE (CATALOG) ANALYTICS
// GET /api/admin/analytics/services?range=today|7d|30d|12mo
// "Orders" are consultation records and laboratory request items created in
// the range, excluding cancelled/rejected ones.
// =========================
export namespace getServiceAnalytics {
  export interface query {
    range?: string;
  }

  export interface service {
    service_id: string;
    service_name: string;
    service_type: string;
    service_category: string | null;
    room: string;
    price: number;
    active: boolean;
    orders: number; // in the selected range
    last_ordered_at: string | null; // Manila time, all time, "YYYY-MM-DDTHH:MM:SS"
  }

  export interface summary {
    total_services: number;
    active_services: number;
    inactive_services: number;
    consultation_services: number;
    laboratory_services: number;
    average_price: number; // of active services
    total_orders: number;
    unused_active_services: number; // active services with no orders in the range
  }

  export interface response {
    message: string;
    range: string;
    start: string;
    end: string;
    summary: summary;
    services: service[];
  }

  export interface error {
    message: string;
  }
}

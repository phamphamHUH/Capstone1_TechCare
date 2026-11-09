import { sql } from "../../config/db.js";
import type { Request, Response } from "express";
import type {
  getAllUsers,
  getAllActivities,
  getAllservices,
  getMyActivities,
  getFormTemplateById,
  getAllFormTemplates,
  getSalesAnalytics as SalesAnalyticsDTO,
  getServiceAnalytics as ServiceAnalyticsDTO,
  getAnalyticsBills as AnalyticsBillsDTO,
} from "./dto/get.dto.js";
import {
  ANALYTICS_RANGES,
  isAnalyticsRange,
  resolveAnalyticsRange,
} from "../../utils/analyticsRange.js";

// GET ALL USERS
export async function getAllUsers(
  req: Request,
  res: Response<getAllUsers.response | getAllUsers.error>,
) {
  try {
    const users = await sql`
      SELECT
        id, user_id, username, first_name, middle_name, last_name,
        suffix, sex, email, contact_number, emergency_contact_name,
        emergency_contact, address, birthdate, role, department,
        employment_status, date_hired, shift_start, shift_end,
        last_login, account_status, profile_photo, active, is_verified,
        created_at, updated_at
      FROM users
    `;

    return res.status(200).json({
      users,
    } as getAllUsers.response);
  } catch (error) {
    console.error("GET ALL USERS ERROR:", error);

    return res.status(500).json({
      message: "Error while fetching users",
    } as getAllUsers.error);
  }
}

// GET ALL ACTIVITIES
export async function getAllActivities(
  req: Request,
  res: Response<getAllActivities.response | getAllActivities.error>,
) {
  try {
    const activities = await sql`
      SELECT
        al.id,
        al.user_id,
        a.action_name,
        a.action_description,
        a.module,
        a.is_sensitive,
        al.status,
        al.target_type,
        al.target_id,
        al.metadata,
        al.created_at
      FROM activity_logs al
      JOIN actions a ON a.action_id = al.action_id
      ORDER BY al.created_at DESC
    `;

    if (activities.length === 0) {
      return res.status(200).json({
        activities: [],
        message: "there are no activities",
      } as getAllActivities.response);
    }

    return res.status(200).json({
      activities,
    } as getAllActivities.response);
  } catch (error) {
    console.error("GET ALL ACTIVITIES ERROR:", error);

    return res.status(500).json({
      error: "error on get acts controller",
    } as getAllActivities.error);
  }
}

// GET ALL SERVICES
export async function getAllservices(
  req: Request,
  res: Response<getAllservices.response | getAllservices.error>,
) {
  try {
    const services = await sql`
      SELECT *
      FROM services
      ORDER BY service_id ASC
    `;

    const packages = await sql`
      SELECT
        p.id,
        p.package_id                              AS service_id,
        p.package_name                            AS service_name,
        'package'::text                           AS service_type,
        'Package'::text                           AS service_category,
        p.package_price                           AS price,
        '-'::text                                 AS room,
        (LOWER(TRIM(p.status)) = 'active')        AS active,
        COALESCE(
          ARRAY_AGG(ps.service_id ORDER BY ps.service_id)
            FILTER (WHERE ps.service_id IS NOT NULL),
          '{}'::text[]
        )                                         AS service_ids,
        COALESCE(
          ARRAY_AGG(s.service_name ORDER BY s.service_name)
            FILTER (WHERE s.service_name IS NOT NULL),
          '{}'::text[]
        )                                         AS service_names,
        p.created_at,
        p.updated_at
      FROM packages p
      LEFT JOIN package_services ps ON ps.package_id = p.package_id
      LEFT JOIN services s          ON s.service_id = ps.service_id
      GROUP BY p.id
      ORDER BY p.package_id ASC
    `;

    return res.status(200).json({
      services,
      packages,
    } as getAllservices.response);
  } catch (error) {
    console.error("GET ALL SERVICES ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    } as getAllservices.error);
  }
}

// GET MY ACTIVITIES
export async function getMyActivities(
  req: Request,
  res: Response<getMyActivities.response | getMyActivities.error>,
) {
  try {
    const activities = await sql`
      SELECT *
      FROM system_activity
      WHERE user_id = ${req.user.user_id}
      ORDER BY created_at DESC
    `;

    if (activities.length === 0) {
      return res.status(200).json({
        message: "You have no activities",
        activities: [],
      } as getMyActivities.response);
    }

    return res.status(200).json({
      activities,
    } as getMyActivities.response);
  } catch (error) {
    console.error("GET MY ACTIVITIES ERROR:", error);

    return res.status(500).json({
      error: "error on get your activities",
    } as getMyActivities.error);
  }
}

// GET ALL FORM TEMPLATES
export async function getAllFormTemplates(
  req: Request,
  res: Response<getAllFormTemplates.response | getAllFormTemplates.error>,
) {
  try {
    const { service_id, status } = req.query as getAllFormTemplates.query;

    const templates = await sql`
      SELECT *
      FROM form_templates
      WHERE
        (${service_id ?? null}::VARCHAR IS NULL
          OR service_id = ${service_id ?? null})
        AND (${status ?? null}::VARCHAR IS NULL
          OR status = ${status ?? null})
      ORDER BY created_at DESC
    `;

    return res.status(200).json({
      message: "Form templates fetched successfully",
      formTemplates: templates,
    } as getAllFormTemplates.response);
  } catch (error) {
    console.error("GET ALL FORM TEMPLATES ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error.",
    } as getAllFormTemplates.error);
  }
}

// GET FORM TEMPLATE BY ID
export async function getFormTemplateById(
  req: Request,
  res: Response<getFormTemplateById.response | getFormTemplateById.error>,
) {
  try {
    const { form_id } = req.params;

    if (!form_id) {
      return res.status(400).json({
        message: "Form ID is required.",
      } as getFormTemplateById.error);
    }

    const [formTemplate] = await sql`
      SELECT *
      FROM form_templates
      WHERE form_id = ${form_id}
    `;

    if (!formTemplate) {
      return res.status(404).json({
        message: "Form template not found.",
      } as getFormTemplateById.error);
    }

    const components = await sql`
      SELECT *
      FROM form_components
      WHERE form_id = ${form_id}
      ORDER BY display_order ASC
    `;

    return res.status(200).json({
      message: "Form template fetched successfully",
      formTemplate,
      components,
    } as getFormTemplateById.response);
  } catch (error) {
    console.error("GET FORM TEMPLATE BY ID ERROR:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    } as getFormTemplateById.error);
  }
}

// =========================
// ANALYTICS HELPERS
// =========================

// NUMERIC and COUNT(*) come back from the driver as strings.
const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

// Reads ?range=, defaulting to 30 days. Returns null when it is not allowed.
function readAnalyticsRange(rawRange: unknown) {
  const range = rawRange === undefined || rawRange === "" ? "30d" : rawRange;
  return isAnalyticsRange(range) ? resolveAnalyticsRange(range) : null;
}

// GET SALES ANALYTICS
export async function getSalesAnalytics(
  req: Request,
  res: Response<SalesAnalyticsDTO.response | SalesAnalyticsDTO.error>,
) {
  try {
    const { range: rawRange } = req.query as SalesAnalyticsDTO.query;
    const period = readAnalyticsRange(rawRange);

    if (!period) {
      return res.status(400).json({
        message: `Invalid range. Use one of: ${ANALYTICS_RANGES.join(", ")}.`,
      });
    }

    const { start, end, previous_start, bucket } = period;
    const step = `1 ${bucket}`;

    const [summaryRows, pendingRows, timelineRows, methodRows, serviceRows] =
      await Promise.all([
        // Paid bills in this period and in the previous period of equal length.
        sql`
          SELECT
            COALESCE(SUM(total_amount) FILTER (WHERE paid_local >= ${start}::timestamp), 0) AS revenue,
            COALESCE(SUM(subtotal) FILTER (WHERE paid_local >= ${start}::timestamp), 0) AS gross_sales,
            COALESCE(SUM(discount_amount) FILTER (WHERE paid_local >= ${start}::timestamp), 0) AS discounts,
            COUNT(*) FILTER (WHERE paid_local >= ${start}::timestamp) AS paid_bills,
            COALESCE(SUM(total_amount) FILTER (WHERE paid_local < ${start}::timestamp), 0) AS previous_revenue,
            COUNT(*) FILTER (WHERE paid_local < ${start}::timestamp) AS previous_paid_bills
          FROM (
            SELECT
              total_amount, subtotal, discount_amount,
              paid_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' AS paid_local
            FROM bills
            WHERE LOWER(TRIM(status)) = 'paid' AND paid_at IS NOT NULL
          ) paid
          WHERE paid_local >= ${previous_start}::timestamp
            AND paid_local < ${end}::timestamp
        `,

        // Money still owed right now (legacy rows may say "Unpaid").
        sql`
          SELECT
            COALESCE(SUM(total_amount), 0) AS pending_amount,
            COUNT(*) AS pending_bills
          FROM bills
          WHERE LOWER(TRIM(status)) IN ('pending', 'unpaid')
        `,

        // One row per hour/day/month, including empty ones.
        sql`
          SELECT
            to_char(slot.bucket, 'YYYY-MM-DD"T"HH24:MI:SS') AS bucket,
            COALESCE(SUM(b.total_amount), 0) AS revenue,
            COUNT(b.bill_id) AS bills
          FROM generate_series(
            ${start}::timestamp,
            ${end}::timestamp - ${step}::interval,
            ${step}::interval
          ) AS slot(bucket)
          LEFT JOIN bills b
            ON LOWER(TRIM(b.status)) = 'paid'
           AND b.paid_at IS NOT NULL
           AND date_trunc(${bucket}, b.paid_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila') = slot.bucket
          GROUP BY slot.bucket
          ORDER BY slot.bucket
        `,

        sql`
          SELECT
            COALESCE(NULLIF(TRIM(payment_method), ''), 'Unknown') AS payment_method,
            COALESCE(SUM(total_amount), 0) AS revenue,
            COUNT(*) AS bills
          FROM bills
          WHERE LOWER(TRIM(status)) = 'paid'
            AND paid_at IS NOT NULL
            AND (paid_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila') >= ${start}::timestamp
            AND (paid_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila') < ${end}::timestamp
          GROUP BY 1
          ORDER BY revenue DESC
        `,

        // Per-service sales from the item list saved on each bill at payment.
        // Legacy items may hold text, so price/quantity are only cast when numeric.
        sql`
          SELECT
            COALESCE(s.service_id, line.item->>'service_id') AS service_id,
            COALESCE(s.service_name, line.item->>'service_name', 'Unknown service') AS service_name,
            COALESCE(LOWER(s.service_type), line.item->>'line_type', 'other') AS service_type,
            COALESCE(s.service_category, line.item->>'service_category') AS service_category,
            SUM(amounts.qty) AS quantity,
            SUM(amounts.price * amounts.qty) AS revenue
          FROM bills b
          CROSS JOIN LATERAL jsonb_array_elements(
            CASE WHEN jsonb_typeof(b.items) = 'array' THEN b.items ELSE '[]'::jsonb END
          ) AS line(item)
          CROSS JOIN LATERAL (
            SELECT
              CASE WHEN line.item->>'price' ~ '^[0-9]+([.][0-9]+)?$'
                   THEN (line.item->>'price')::numeric ELSE 0 END AS price,
              CASE WHEN line.item->>'quantity' ~ '^[0-9]+$'
                   THEN (line.item->>'quantity')::int ELSE 1 END AS qty
          ) AS amounts
          LEFT JOIN services s ON s.service_id = line.item->>'service_id'
          WHERE LOWER(TRIM(b.status)) = 'paid'
            AND b.paid_at IS NOT NULL
            AND (b.paid_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila') >= ${start}::timestamp
            AND (b.paid_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila') < ${end}::timestamp
          GROUP BY 1, 2, 3, 4
          ORDER BY revenue DESC, service_name
        `,
      ]);

    const totals = summaryRows[0] ?? {};
    const pending = pendingRows[0] ?? {};

    const revenue = roundMoney(toNumber(totals.revenue));
    const paidBills = toNumber(totals.paid_bills);

    const services: SalesAnalyticsDTO.serviceSales[] = serviceRows.map(
      (row) => ({
        service_id: row.service_id ?? null,
        service_name: String(row.service_name),
        service_type: String(row.service_type),
        service_category: row.service_category ?? null,
        quantity: toNumber(row.quantity),
        revenue: roundMoney(toNumber(row.revenue)),
      }),
    );

    // Totals per service type, built from the per-service rows above.
    const typeTotals = new Map<string, SalesAnalyticsDTO.serviceType>();
    for (const service of services) {
      const current = typeTotals.get(service.service_type) ?? {
        service_type: service.service_type,
        revenue: 0,
        quantity: 0,
      };
      current.revenue = roundMoney(current.revenue + service.revenue);
      current.quantity += service.quantity;
      typeTotals.set(service.service_type, current);
    }

    return res.status(200).json({
      message: "Sales analytics fetched successfully",
      range: period.range,
      bucket,
      start,
      end,
      summary: {
        revenue,
        gross_sales: roundMoney(toNumber(totals.gross_sales)),
        discounts: roundMoney(toNumber(totals.discounts)),
        paid_bills: paidBills,
        average_bill: paidBills > 0 ? roundMoney(revenue / paidBills) : 0,
        previous_revenue: roundMoney(toNumber(totals.previous_revenue)),
        previous_paid_bills: toNumber(totals.previous_paid_bills),
        pending_amount: roundMoney(toNumber(pending.pending_amount)),
        pending_bills: toNumber(pending.pending_bills),
      },
      timeline: timelineRows.map((row) => ({
        bucket: String(row.bucket),
        revenue: roundMoney(toNumber(row.revenue)),
        bills: toNumber(row.bills),
      })),
      payment_methods: methodRows.map((row) => ({
        payment_method: String(row.payment_method),
        revenue: roundMoney(toNumber(row.revenue)),
        bills: toNumber(row.bills),
      })),
      service_types: [...typeTotals.values()].sort(
        (a, b) => b.revenue - a.revenue,
      ),
      services,
    });
  } catch (error) {
    console.error("GET SALES ANALYTICS ERROR:", error);

    return res.status(500).json({
      message: "Error while fetching sales analytics",
    });
  }
}

// GET ANALYTICS BILLS (details behind the sales tiles)
export async function getAnalyticsBills(
  req: Request,
  res: Response<AnalyticsBillsDTO.response | AnalyticsBillsDTO.error>,
) {
  try {
    const { range: rawRange } = req.query as AnalyticsBillsDTO.query;
    const period = readAnalyticsRange(rawRange);

    if (!period) {
      return res.status(400).json({
        message: `Invalid range. Use one of: ${ANALYTICS_RANGES.join(", ")}.`,
      });
    }

    const { start, end } = period;

    const [paidRows, pendingRows] = await Promise.all([
      sql`
        SELECT
          b.bill_id, b.patient_id,
          NULLIF(CONCAT_WS(' ', p.first_name, p.last_name), '') AS patient_name,
          b.status, b.subtotal, b.discount_type, b.discount_amount, b.total_amount,
          b.payment_method,
          CASE WHEN jsonb_typeof(b.items) = 'array' THEN jsonb_array_length(b.items) ELSE 0 END AS item_count,
          to_char(b.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD"T"HH24:MI:SS') AS created_at,
          to_char(b.paid_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD"T"HH24:MI:SS') AS paid_at
        FROM bills b
        LEFT JOIN patients p ON p.patient_id = b.patient_id
        WHERE LOWER(TRIM(b.status)) = 'paid'
          AND b.paid_at IS NOT NULL
          AND (b.paid_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila') >= ${start}::timestamp
          AND (b.paid_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila') < ${end}::timestamp
        ORDER BY b.paid_at DESC
      `,

      // Unpaid bills have no item snapshot yet, so count their linked rows.
      sql`
        SELECT
          b.bill_id, b.patient_id,
          NULLIF(CONCAT_WS(' ', p.first_name, p.last_name), '') AS patient_name,
          'Pending' AS status, b.subtotal, b.discount_type, b.discount_amount, b.total_amount,
          NULL AS payment_method,
          (
            SELECT COUNT(*) FROM consultation_records cr
            WHERE cr.bill_id = b.bill_id
              AND LOWER(TRIM(cr.status)) NOT IN ('cancelled', 'canceled', 'rejected')
          ) + (
            SELECT COUNT(*) FROM laboratory_request_items lri
            WHERE lri.bill_id = b.bill_id
              AND LOWER(TRIM(lri.status)) NOT IN ('cancelled', 'canceled', 'rejected')
          ) AS item_count,
          to_char(b.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD"T"HH24:MI:SS') AS created_at,
          NULL AS paid_at
        FROM bills b
        LEFT JOIN patients p ON p.patient_id = b.patient_id
        WHERE LOWER(TRIM(b.status)) IN ('pending', 'unpaid')
        ORDER BY b.created_at ASC
      `,
    ]);

    const toBill = (row: Record<string, any>): AnalyticsBillsDTO.bill => ({
      bill_id: String(row.bill_id),
      patient_id: String(row.patient_id),
      patient_name: row.patient_name ?? null,
      status: String(row.status),
      subtotal: roundMoney(toNumber(row.subtotal)),
      discount_type: row.discount_type ?? null,
      discount_amount: roundMoney(toNumber(row.discount_amount)),
      total_amount: roundMoney(toNumber(row.total_amount)),
      payment_method: row.payment_method ?? null,
      item_count: toNumber(row.item_count),
      created_at: String(row.created_at),
      paid_at: row.paid_at ?? null,
    });

    return res.status(200).json({
      message: "Analytics bills fetched successfully",
      range: period.range,
      start,
      end,
      paid: paidRows.map(toBill),
      pending: pendingRows.map(toBill),
    });
  } catch (error) {
    console.error("GET ANALYTICS BILLS ERROR:", error);

    return res.status(500).json({
      message: "Error while fetching bills",
    });
  }
}

// GET SERVICE (CATALOG) ANALYTICS
export async function getServiceAnalytics(
  req: Request,
  res: Response<ServiceAnalyticsDTO.response | ServiceAnalyticsDTO.error>,
) {
  try {
    const { range: rawRange } = req.query as ServiceAnalyticsDTO.query;
    const period = readAnalyticsRange(rawRange);

    if (!period) {
      return res.status(400).json({
        message: `Invalid range. Use one of: ${ANALYTICS_RANGES.join(", ")}.`,
      });
    }

    const { start, end } = period;

    // "Orders" = consultation records + laboratory request items, not cancelled.
    const rows = await sql`
      SELECT
        s.service_id,
        s.service_name,
        LOWER(s.service_type) AS service_type,
        s.service_category,
        s.room,
        s.price,
        s.active,
        COALESCE(o.orders, 0) AS orders,
        to_char(o.last_ordered_local, 'YYYY-MM-DD"T"HH24:MI:SS') AS last_ordered_at
      FROM services s
      LEFT JOIN (
        SELECT
          service_id,
          COUNT(*) FILTER (
            WHERE ordered_local >= ${start}::timestamp
              AND ordered_local < ${end}::timestamp
          ) AS orders,
          MAX(ordered_local) AS last_ordered_local
        FROM (
          SELECT
            cr.service_id,
            cr.requested_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' AS ordered_local,
            cr.status
          FROM consultation_records cr
          UNION ALL
          SELECT
            lri.service_id,
            lri.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila',
            lri.status
          FROM laboratory_request_items lri
        ) ordered
        WHERE LOWER(TRIM(status)) NOT IN ('cancelled', 'canceled', 'rejected')
        GROUP BY service_id
      ) o ON o.service_id = s.service_id
      ORDER BY orders DESC, s.service_name
    `;

    const services: ServiceAnalyticsDTO.service[] = rows.map((row) => ({
      service_id: String(row.service_id),
      service_name: String(row.service_name),
      service_type: String(row.service_type),
      service_category: row.service_category ?? null,
      room: String(row.room),
      price: roundMoney(toNumber(row.price)),
      active: Boolean(row.active),
      orders: toNumber(row.orders),
      last_ordered_at: row.last_ordered_at ?? null,
    }));

    const active = services.filter((service) => service.active);

    return res.status(200).json({
      message: "Service analytics fetched successfully",
      range: period.range,
      start,
      end,
      summary: {
        total_services: services.length,
        active_services: active.length,
        inactive_services: services.length - active.length,
        consultation_services: services.filter(
          (service) => service.service_type === "consultation",
        ).length,
        laboratory_services: services.filter(
          (service) => service.service_type === "laboratory",
        ).length,
        average_price:
          active.length > 0
            ? roundMoney(
                active.reduce((sum, service) => sum + service.price, 0) /
                  active.length,
              )
            : 0,
        total_orders: services.reduce(
          (sum, service) => sum + service.orders,
          0,
        ),
        unused_active_services: active.filter(
          (service) => service.orders === 0,
        ).length,
      },
      services,
    });
  } catch (error) {
    console.error("GET SERVICE ANALYTICS ERROR:", error);

    return res.status(500).json({
      message: "Error while fetching service analytics",
    });
  }
}

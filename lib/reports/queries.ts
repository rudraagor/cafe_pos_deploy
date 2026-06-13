import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  categories,
  orderItems,
  orders,
  payments,
  posSessions,
  products,
  users,
} from "@/lib/db/schema";
import type { ReportFilters, ReportRange } from "./range";

function paidOrdersWhere(filters: ReportRange | ReportFilters) {
  const conditions = [
    eq(orders.status, "paid"),
    gte(orders.updatedAt, filters.start),
    lt(orders.updatedAt, filters.end),
  ];

  if ("employeeId" in filters && filters.employeeId) {
    conditions.push(eq(orders.employeeId, filters.employeeId));
  }
  if ("sessionId" in filters && filters.sessionId) {
    conditions.push(eq(orders.sessionId, filters.sessionId));
  }
  if ("productId" in filters && filters.productId) {
    conditions.push(sql`exists (
      select 1 from ${orderItems}
      where ${orderItems.orderId} = ${orders.id}
        and ${orderItems.productId} = ${filters.productId}
    )`);
  }

  return and(...conditions);
}

function paidLineItemsWhere(filters: ReportRange | ReportFilters) {
  const conditions = [paidOrdersWhere(filters)];
  if ("productId" in filters && filters.productId) {
    conditions.push(eq(orderItems.productId, filters.productId));
  }
  return and(...conditions);
}

function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function getPreviousPeriod(filters: ReportRange | ReportFilters): ReportRange {
  const duration = filters.end.getTime() - filters.start.getTime();
  return {
    preset: filters.preset,
    start: new Date(filters.start.getTime() - duration),
    end: filters.start,
  };
}

function deltaPercent(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

export async function getPeriodComparison(filters: ReportRange | ReportFilters) {
  const previous = getPreviousPeriod(filters);
  const [current, prior] = await Promise.all([
    getSalesSummary(filters),
    getSalesSummary(previous),
  ]);

  return {
    current,
    previous: prior,
    revenueDelta: deltaPercent(current.revenue, prior.revenue),
    orderCountDelta: deltaPercent(current.orderCount, prior.orderCount),
    aovDelta: deltaPercent(current.averageOrderValue, prior.averageOrderValue),
    discountDelta: deltaPercent(current.discountTotal, prior.discountTotal),
    taxDelta: deltaPercent(current.taxTotal, prior.taxTotal),
    grossDelta: deltaPercent(current.gross, prior.gross),
  };
}

export async function getItemsSold(filters: ReportRange | ReportFilters) {
  const [row] = await db
    .select({
      quantity: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(paidLineItemsWhere(filters));
  return toNumber(row?.quantity);
}

export async function getSalesByEmployee(
  filters: ReportRange | ReportFilters,
  limit = 10,
) {
  const rows = await db
    .select({
      employeeId: orders.employeeId,
      employee: users.name,
      revenue: sql<string>`coalesce(sum(${orders.total}), 0)`,
      orderCount: sql<number>`count(${orders.id})::int`,
    })
    .from(orders)
    .leftJoin(users, eq(orders.employeeId, users.id))
    .where(paidOrdersWhere(filters))
    .groupBy(orders.employeeId, users.name)
    .orderBy(desc(sql`sum(${orders.total})`))
    .limit(limit);

  return rows.map((row) => ({
    employeeId: row.employeeId,
    employee: row.employee ?? "Unknown",
    revenue: toNumber(row.revenue),
    orderCount: toNumber(row.orderCount),
  }));
}

export async function getSalesByFulfillment(filters: ReportRange | ReportFilters) {
  const rows = await db
    .select({
      fulfillmentType: orders.fulfillmentType,
      revenue: sql<string>`coalesce(sum(${orders.total}), 0)`,
      orderCount: sql<number>`count(${orders.id})::int`,
    })
    .from(orders)
    .where(paidOrdersWhere(filters))
    .groupBy(orders.fulfillmentType);

  return rows.map((row) => ({
    fulfillmentType: row.fulfillmentType,
    label: row.fulfillmentType === "dine_in" ? "Dine in" : "Takeaway",
    revenue: toNumber(row.revenue),
    orderCount: toNumber(row.orderCount),
  }));
}

export async function getDiscountBreakdown(filters: ReportRange | ReportFilters) {
  const [row] = await db
    .select({
      totalDiscount: sql<string>`coalesce(sum(${orders.discountTotal}), 0)`,
      couponDiscount: sql<string>`coalesce(sum(${orders.discountTotal}) filter (where ${orders.couponId} is not null), 0)`,
      couponOrders: sql<number>`count(${orders.id}) filter (where ${orders.couponId} is not null)::int`,
    })
    .from(orders)
    .where(paidOrdersWhere(filters));

  const totalDiscount = toNumber(row?.totalDiscount);
  const couponDiscount = toNumber(row?.couponDiscount);
  return {
    totalDiscount,
    couponDiscount,
    promotionDiscount: Math.max(0, totalDiscount - couponDiscount),
    couponOrders: toNumber(row?.couponOrders),
  };
}

export async function getSalesByDayOfWeek(filters: ReportRange | ReportFilters) {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const rows = await db
    .select({
      day: sql<number>`extract(dow from ${orders.updatedAt})::int`,
      revenue: sql<string>`coalesce(sum(${orders.total}), 0)`,
      orders: sql<number>`count(${orders.id})::int`,
    })
    .from(orders)
    .where(paidOrdersWhere(filters))
    .groupBy(sql`extract(dow from ${orders.updatedAt})`)
    .orderBy(sql`extract(dow from ${orders.updatedAt})`);

  return rows.map((row) => ({
    label: labels[row.day] ?? String(row.day),
    day: row.day,
    revenue: toNumber(row.revenue),
    orders: toNumber(row.orders),
  }));
}

export async function getSalesSummary(filters: ReportRange | ReportFilters) {
  const [row] = await db
    .select({
      revenue: sql<string>`coalesce(sum(${orders.total}), 0)`,
      gross: sql<string>`coalesce(sum(${orders.subtotal}), 0)`,
      orderCount: sql<number>`count(${orders.id})::int`,
      averageOrderValue: sql<string>`coalesce(avg(${orders.total}), 0)`,
      discountTotal: sql<string>`coalesce(sum(${orders.discountTotal}), 0)`,
      taxTotal: sql<string>`coalesce(sum(${orders.tax}), 0)`,
    })
    .from(orders)
    .where(paidOrdersWhere(filters));

  return {
    revenue: toNumber(row?.revenue),
    gross: toNumber(row?.gross),
    orderCount: toNumber(row?.orderCount),
    averageOrderValue: toNumber(row?.averageOrderValue),
    discountTotal: toNumber(row?.discountTotal),
    taxTotal: toNumber(row?.taxTotal),
  };
}

export async function getRevenueByDay(filters: ReportRange | ReportFilters) {
  const rows = await db
    .select({
      label: sql<string>`to_char(date_trunc('day', ${orders.updatedAt}), 'YYYY-MM-DD')`,
      revenue: sql<string>`coalesce(sum(${orders.total}), 0)`,
      orders: sql<number>`count(${orders.id})::int`,
    })
    .from(orders)
    .where(paidOrdersWhere(filters))
    .groupBy(sql`date_trunc('day', ${orders.updatedAt})`)
    .orderBy(sql`date_trunc('day', ${orders.updatedAt})`);

  return rows.map((row) => ({
    label: row.label,
    revenue: toNumber(row.revenue),
    orders: toNumber(row.orders),
  }));
}

export async function getSalesByHour(filters: ReportRange | ReportFilters) {
  const rows = await db
    .select({
      hour: sql<number>`extract(hour from ${orders.updatedAt})::int`,
      revenue: sql<string>`coalesce(sum(${orders.total}), 0)`,
      orders: sql<number>`count(${orders.id})::int`,
    })
    .from(orders)
    .where(paidOrdersWhere(filters))
    .groupBy(sql`extract(hour from ${orders.updatedAt})`)
    .orderBy(sql`extract(hour from ${orders.updatedAt})`);

  return rows.map((row) => ({
    label: `${String(row.hour).padStart(2, "0")}:00`,
    hour: row.hour,
    revenue: toNumber(row.revenue),
    orders: toNumber(row.orders),
  }));
}

export async function getTopProducts(
  filters: ReportRange | ReportFilters,
  limit = 8,
) {
  const rows = await db
    .select({
      product: orderItems.nameSnapshot,
      quantity: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
      revenue: sql<string>`coalesce(sum(${orderItems.lineTotal}), 0)`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(paidLineItemsWhere(filters))
    .groupBy(orderItems.nameSnapshot)
    .orderBy(desc(sql`sum(${orderItems.quantity})`))
    .limit(limit);

  return rows.map((row) => ({
    product: row.product,
    quantity: toNumber(row.quantity),
    revenue: toNumber(row.revenue),
  }));
}

export async function getSalesByCategory(filters: ReportRange | ReportFilters) {
  const rows = await db
    .select({
      category: sql<string>`coalesce(${categories.name}, 'Uncategorized')`,
      revenue: sql<string>`coalesce(sum(${orderItems.lineTotal}), 0)`,
      quantity: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .leftJoin(products, eq(orderItems.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(paidLineItemsWhere(filters))
    .groupBy(categories.name)
    .orderBy(desc(sql`sum(${orderItems.lineTotal})`));

  return rows.map((row) => ({
    category: row.category,
    revenue: toNumber(row.revenue),
    quantity: toNumber(row.quantity),
  }));
}

export async function getPaymentMix(filters: ReportRange | ReportFilters) {
  const rows = await db
    .select({
      method: payments.method,
      amount: sql<string>`coalesce(sum(${payments.amount}), 0)`,
      count: sql<number>`count(${payments.id})::int`,
    })
    .from(payments)
    .innerJoin(orders, eq(payments.orderId, orders.id))
    .where(paidOrdersWhere(filters))
    .groupBy(payments.method)
    .orderBy(desc(sql`sum(${payments.amount})`));

  return rows.map((row) => ({
    method: row.method,
    amount: toNumber(row.amount),
    count: toNumber(row.count),
  }));
}

export async function getProductVelocity(filters: ReportRange | ReportFilters) {
  const days = Math.max(
    1,
    Math.ceil((filters.end.getTime() - filters.start.getTime()) / 86400000),
  );
  const rows = await getTopProducts(filters, 20);
  return rows.map((row) => ({
    product: row.product,
    quantity: row.quantity,
    perDay: Number((row.quantity / days).toFixed(2)),
    revenue: row.revenue,
  }));
}

export async function getTopOrders(
  filters: ReportRange | ReportFilters,
  limit = 8,
) {
  const rows = await db.query.orders.findMany({
    where: paidOrdersWhere(filters),
    with: {
      customer: true,
      employee: true,
      table: true,
    },
    orderBy: [desc(orders.total)],
    limit,
  });

  return rows.map((row) => ({
    id: row.id,
    orderNumber: row.orderNumber,
    customerId: row.customerId,
    customer: row.customer?.name ?? "Walk-in",
    employee: row.employee?.name ?? "Unknown",
    tableNumber: row.table?.number ?? null,
    paidAt: row.updatedAt,
    total: Number(row.total),
  }));
}

export async function getExtendedReportDashboard(
  filters: ReportRange | ReportFilters,
) {
  const [
    summary,
    comparison,
    itemsSold,
    revenueByDay,
    salesByHour,
    topProducts,
    salesByCategory,
    paymentMix,
    productVelocity,
    topOrders,
    salesByEmployee,
    salesByFulfillment,
    discountBreakdown,
    salesByDayOfWeek,
  ] = await Promise.all([
    getSalesSummary(filters),
    getPeriodComparison(filters),
    getItemsSold(filters),
    getRevenueByDay(filters),
    getSalesByHour(filters),
    getTopProducts(filters, 10),
    getSalesByCategory(filters),
    getPaymentMix(filters),
    getProductVelocity(filters),
    getTopOrders(filters, 10),
    getSalesByEmployee(filters),
    getSalesByFulfillment(filters),
    getDiscountBreakdown(filters),
    getSalesByDayOfWeek(filters),
  ]);

  return {
    summary,
    comparison,
    itemsSold,
    revenueByDay,
    salesByHour,
    topProducts,
    salesByCategory,
    paymentMix,
    productVelocity,
    topOrders,
    salesByEmployee,
    salesByFulfillment,
    discountBreakdown,
    salesByDayOfWeek,
  };
}

export async function getReportDashboard(filters: ReportRange | ReportFilters) {
  const extended = await getExtendedReportDashboard(filters);
  return {
    summary: extended.summary,
    comparison: extended.comparison,
    itemsSold: extended.itemsSold,
    revenueByDay: extended.revenueByDay,
    salesByHour: extended.salesByHour,
    topProducts: extended.topProducts,
    salesByCategory: extended.salesByCategory,
    paymentMix: extended.paymentMix,
    productVelocity: extended.productVelocity,
    topOrders: extended.topOrders,
    salesByEmployee: extended.salesByEmployee,
    salesByFulfillment: extended.salesByFulfillment,
    discountBreakdown: extended.discountBreakdown,
    salesByDayOfWeek: extended.salesByDayOfWeek,
  };
}

export async function getReportFilterOptions() {
  const [employees, sessions, productRows] = await Promise.all([
    db.query.users.findMany({
      orderBy: (user, { asc }) => [asc(user.name)],
    }),
    db.query.posSessions.findMany({
      with: {
        openedByUser: true,
      },
      orderBy: [desc(posSessions.openedAt)],
      limit: 100,
    }),
    db.query.products.findMany({
      orderBy: (product, { asc }) => [asc(product.name)],
    }),
  ]);

  return {
    employees: employees.map((employee) => ({
      id: employee.id,
      label: `${employee.name} (${employee.role})`,
    })),
    sessions: sessions.map((session) => ({
      id: session.id,
      label: `${session.openedAt.toLocaleString()} - ${
        session.openedByUser?.name ?? "Unknown"
      } (${session.status})`,
    })),
    products: productRows.map((product) => ({
      id: product.id,
      label: product.name,
    })),
  };
}

export async function getSessionList() {
  const rows = await db
    .select({
      id: posSessions.id,
      openedAt: posSessions.openedAt,
      closedAt: posSessions.closedAt,
      status: posSessions.status,
      openingFloat: posSessions.openingFloat,
      closingAmount: posSessions.closingAmount,
      cashier: users.name,
      paidOrders: sql<number>`count(${orders.id}) filter (where ${orders.status} = 'paid')::int`,
      revenue: sql<string>`coalesce(sum(${orders.total}) filter (where ${orders.status} = 'paid'), 0)`,
    })
    .from(posSessions)
    .leftJoin(users, eq(posSessions.openedBy, users.id))
    .leftJoin(orders, eq(orders.sessionId, posSessions.id))
    .groupBy(posSessions.id, users.name)
    .orderBy(desc(posSessions.openedAt));

  return rows.map((row) => ({
    ...row,
    openingFloat: toNumber(row.openingFloat),
    closingAmount:
      row.closingAmount == null ? null : toNumber(row.closingAmount),
    paidOrders: toNumber(row.paidOrders),
    revenue: toNumber(row.revenue),
  }));
}

export async function getSessionReport(sessionId: string) {
  const session = await db.query.posSessions.findFirst({
    where: eq(posSessions.id, sessionId),
    with: {
      openedByUser: true,
      orders: {
        where: eq(orders.status, "paid"),
        with: { payments: true, items: true },
        orderBy: (order, { asc }) => [asc(order.createdAt)],
      },
    },
  });
  if (!session) return null;

  const ordersPaid = session.orders;
  const paymentMap = new Map<string, { method: string; amount: number; count: number }>();
  for (const order of ordersPaid) {
    for (const payment of order.payments) {
      const existing = paymentMap.get(payment.method) ?? {
        method: payment.method,
        amount: 0,
        count: 0,
      };
      existing.amount += Number(payment.amount);
      existing.count += 1;
      paymentMap.set(payment.method, existing);
    }
  }

  return {
    id: session.id,
    status: session.status,
    openedAt: session.openedAt,
    closedAt: session.closedAt,
    cashier: session.openedByUser?.name ?? "Unknown",
    openingFloat: Number(session.openingFloat),
    closingAmount:
      session.closingAmount == null ? null : Number(session.closingAmount),
    orderCount: ordersPaid.length,
    gross: ordersPaid.reduce((sum, order) => sum + Number(order.subtotal), 0),
    discountTotal: ordersPaid.reduce(
      (sum, order) => sum + Number(order.discountTotal),
      0,
    ),
    taxTotal: ordersPaid.reduce((sum, order) => sum + Number(order.tax), 0),
    revenue: ordersPaid.reduce((sum, order) => sum + Number(order.total), 0),
    payments: [...paymentMap.values()],
    orders: ordersPaid.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      paidAt: order.updatedAt,
      subtotal: Number(order.subtotal),
      discountTotal: Number(order.discountTotal),
      tax: Number(order.tax),
      total: Number(order.total),
    })),
  };
}

export async function getDashboardCsvRows(filters: ReportRange | ReportFilters) {
  const [
    summary,
    comparison,
    topProducts,
    categories,
    payments,
    hours,
    topOrders,
    employees,
    fulfillment,
    discountBreakdown,
  ] = await Promise.all([
    getSalesSummary(filters),
    getPeriodComparison(filters),
    getTopProducts(filters, 50),
    getSalesByCategory(filters),
    getPaymentMix(filters),
    getSalesByHour(filters),
    getTopOrders(filters, 50),
    getSalesByEmployee(filters, 50),
    getSalesByFulfillment(filters),
    getDiscountBreakdown(filters),
  ]);

  const rows: Record<string, string | number>[] = [
    { section: "summary", label: "revenue", value: summary.revenue },
    { section: "summary", label: "paid_orders", value: summary.orderCount },
    { section: "summary", label: "aov", value: summary.averageOrderValue },
    { section: "summary", label: "discounts", value: summary.discountTotal },
    { section: "summary", label: "tax", value: summary.taxTotal },
    { section: "summary", label: "gross", value: summary.gross },
    { section: "comparison", label: "revenue_delta_pct", value: comparison.revenueDelta },
    { section: "comparison", label: "orders_delta_pct", value: comparison.orderCountDelta },
    { section: "discount_breakdown", label: "coupon_discount", value: discountBreakdown.couponDiscount },
    { section: "discount_breakdown", label: "promotion_discount", value: discountBreakdown.promotionDiscount },
    ...topProducts.map((row) => ({
      section: "top_product",
      label: row.product,
      quantity: row.quantity,
      value: row.revenue,
    })),
    ...topOrders.map((row) => ({
      section: "top_order",
      label: row.orderNumber,
      customer: row.customer,
      employee: row.employee,
      paid_at: row.paidAt.toISOString(),
      value: row.total,
    })),
    ...categories.map((row) => ({
      section: "category",
      label: row.category,
      quantity: row.quantity,
      value: row.revenue,
    })),
    ...payments.map((row) => ({
      section: "payment",
      label: row.method,
      count: row.count,
      value: row.amount,
    })),
    ...hours.map((row) => ({
      section: "hour",
      label: row.label,
      count: row.orders,
      value: row.revenue,
    })),
    ...employees.map((row) => ({
      section: "employee",
      label: row.employee,
      count: row.orderCount,
      value: row.revenue,
    })),
    ...fulfillment.map((row) => ({
      section: "fulfillment",
      label: row.label,
      count: row.orderCount,
      value: row.revenue,
    })),
  ];

  return rows;
}

export function toCsv(rows: Record<string, unknown>[]) {
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => csvCell(row[header])).join(","),
    ),
  ];
  return `${lines.join("\n")}\n`;
}

function csvCell(value: unknown) {
  if (value == null) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

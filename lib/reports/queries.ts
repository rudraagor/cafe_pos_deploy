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
import type { ReportRange } from "./range";

type NumericRow<T extends string> = Record<T, string | number | null>;

function paidRangeWhere(range: ReportRange) {
  return and(
    eq(orders.status, "paid"),
    gte(orders.updatedAt, range.start),
    lt(orders.updatedAt, range.end),
  );
}

function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

export async function getSalesSummary(range: ReportRange) {
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
    .where(paidRangeWhere(range));

  return {
    revenue: toNumber(row?.revenue),
    gross: toNumber(row?.gross),
    orderCount: toNumber(row?.orderCount),
    averageOrderValue: toNumber(row?.averageOrderValue),
    discountTotal: toNumber(row?.discountTotal),
    taxTotal: toNumber(row?.taxTotal),
  };
}

export async function getRevenueByDay(range: ReportRange) {
  const rows = await db
    .select({
      label: sql<string>`to_char(date_trunc('day', ${orders.updatedAt}), 'YYYY-MM-DD')`,
      revenue: sql<string>`coalesce(sum(${orders.total}), 0)`,
      orders: sql<number>`count(${orders.id})::int`,
    })
    .from(orders)
    .where(paidRangeWhere(range))
    .groupBy(sql`date_trunc('day', ${orders.updatedAt})`)
    .orderBy(sql`date_trunc('day', ${orders.updatedAt})`);

  return rows.map((row) => ({
    label: row.label,
    revenue: toNumber(row.revenue),
    orders: toNumber(row.orders),
  }));
}

export async function getSalesByHour(range: ReportRange) {
  const rows = await db
    .select({
      hour: sql<number>`extract(hour from ${orders.updatedAt})::int`,
      revenue: sql<string>`coalesce(sum(${orders.total}), 0)`,
      orders: sql<number>`count(${orders.id})::int`,
    })
    .from(orders)
    .where(paidRangeWhere(range))
    .groupBy(sql`extract(hour from ${orders.updatedAt})`)
    .orderBy(sql`extract(hour from ${orders.updatedAt})`);

  return rows.map((row) => ({
    label: `${String(row.hour).padStart(2, "0")}:00`,
    hour: row.hour,
    revenue: toNumber(row.revenue),
    orders: toNumber(row.orders),
  }));
}

export async function getTopProducts(range: ReportRange, limit = 8) {
  const rows = await db
    .select({
      product: orderItems.nameSnapshot,
      quantity: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
      revenue: sql<string>`coalesce(sum(${orderItems.lineTotal}), 0)`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(paidRangeWhere(range))
    .groupBy(orderItems.nameSnapshot)
    .orderBy(desc(sql`sum(${orderItems.quantity})`))
    .limit(limit);

  return rows.map((row) => ({
    product: row.product,
    quantity: toNumber(row.quantity),
    revenue: toNumber(row.revenue),
  }));
}

export async function getSalesByCategory(range: ReportRange) {
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
    .where(paidRangeWhere(range))
    .groupBy(categories.name)
    .orderBy(desc(sql`sum(${orderItems.lineTotal})`));

  return rows.map((row) => ({
    category: row.category,
    revenue: toNumber(row.revenue),
    quantity: toNumber(row.quantity),
  }));
}

export async function getPaymentMix(range: ReportRange) {
  const rows = await db
    .select({
      method: payments.method,
      amount: sql<string>`coalesce(sum(${payments.amount}), 0)`,
      count: sql<number>`count(${payments.id})::int`,
    })
    .from(payments)
    .innerJoin(orders, eq(payments.orderId, orders.id))
    .where(paidRangeWhere(range))
    .groupBy(payments.method)
    .orderBy(desc(sql`sum(${payments.amount})`));

  return rows.map((row) => ({
    method: row.method,
    amount: toNumber(row.amount),
    count: toNumber(row.count),
  }));
}

export async function getProductVelocity(range: ReportRange) {
  const days = Math.max(
    1,
    Math.ceil((range.end.getTime() - range.start.getTime()) / 86400000),
  );
  const rows = await getTopProducts(range, 20);
  return rows.map((row) => ({
    product: row.product,
    quantity: row.quantity,
    perDay: Number((row.quantity / days).toFixed(2)),
    revenue: row.revenue,
  }));
}

export async function getReportDashboard(range: ReportRange) {
  const [
    summary,
    revenueByDay,
    salesByHour,
    topProducts,
    salesByCategory,
    paymentMix,
    productVelocity,
  ] = await Promise.all([
    getSalesSummary(range),
    getRevenueByDay(range),
    getSalesByHour(range),
    getTopProducts(range),
    getSalesByCategory(range),
    getPaymentMix(range),
    getProductVelocity(range),
  ]);

  return {
    summary,
    revenueByDay,
    salesByHour,
    topProducts,
    salesByCategory,
    paymentMix,
    productVelocity,
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

export async function getDashboardCsvRows(range: ReportRange) {
  const [summary, topProducts, categories, payments, hours] = await Promise.all([
    getSalesSummary(range),
    getTopProducts(range, 50),
    getSalesByCategory(range),
    getPaymentMix(range),
    getSalesByHour(range),
  ]);

  const rows: Record<string, string | number>[] = [
    { section: "summary", label: "revenue", value: summary.revenue },
    { section: "summary", label: "paid_orders", value: summary.orderCount },
    { section: "summary", label: "aov", value: summary.averageOrderValue },
    { section: "summary", label: "discounts", value: summary.discountTotal },
    { section: "summary", label: "tax", value: summary.taxTotal },
    ...topProducts.map((row) => ({
      section: "top_product",
      label: row.product,
      quantity: row.quantity,
      value: row.revenue,
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

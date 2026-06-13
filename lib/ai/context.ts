import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { posSessions, products, users } from "@/lib/db/schema";
import {
  getPeriodComparison,
  getReportDashboard,
  getSalesByDayOfWeek,
  getSalesByEmployee,
  getSalesByFulfillment,
} from "@/lib/reports/queries";
import type { ReportFilters, ReportRange } from "@/lib/reports/range";
import { formatRangeLabel } from "@/lib/reports/range";
import { formatMoney } from "@/lib/pos/pricing";

export const AI_CURRENCY_INSTRUCTION =
  "This cafe operates in India. All monetary values are Indian Rupees (INR). Always write amounts with the ₹ symbol (for example ₹1,234.56). Never use $, USD, or dollars.";

export async function buildReportAiContext(filters: ReportRange | ReportFilters) {
  const [
    dashboard,
    labels,
    comparison,
    salesByEmployee,
    salesByFulfillment,
    salesByDayOfWeek,
  ] = await Promise.all([
    getReportDashboard(filters),
    getFilterLabels(filters),
    getPeriodComparison(filters),
    getSalesByEmployee(filters, 5),
    getSalesByFulfillment(filters),
    getSalesByDayOfWeek(filters),
  ]);

  return {
    currency: "INR (₹)",
    range: {
      preset: filters.preset,
      label: formatRangeLabel(filters),
      start: filters.start.toISOString(),
      end: filters.end.toISOString(),
    },
    filters: labels,
    summary: {
      revenue: formatMoney(dashboard.summary.revenue),
      gross: formatMoney(dashboard.summary.gross),
      orderCount: dashboard.summary.orderCount,
      averageOrderValue: formatMoney(dashboard.summary.averageOrderValue),
      discountTotal: formatMoney(dashboard.summary.discountTotal),
      taxTotal: formatMoney(dashboard.summary.taxTotal),
    },
    comparison: {
      revenueDeltaPct: comparison.revenueDelta,
      orderCountDeltaPct: comparison.orderCountDelta,
      aovDeltaPct: comparison.aovDelta,
    },
    revenueByDay: dashboard.revenueByDay.map((row) => ({
      label: row.label,
      revenue: formatMoney(row.revenue),
      orders: row.orders,
    })),
    salesByHour: dashboard.salesByHour.map((row) => ({
      label: row.label,
      revenue: formatMoney(row.revenue),
      orders: row.orders,
    })),
    salesByDayOfWeek: salesByDayOfWeek.map((row) => ({
      label: row.label,
      revenue: formatMoney(row.revenue),
      orders: row.orders,
    })),
    topProducts: dashboard.topProducts.map((row) => ({
      product: row.product,
      quantity: row.quantity,
      revenue: formatMoney(row.revenue),
    })),
    topOrders: dashboard.topOrders.map((order) => ({
      orderNumber: order.orderNumber,
      employee: order.employee,
      paidAt: order.paidAt.toISOString(),
      total: formatMoney(order.total),
    })),
    salesByCategory: dashboard.salesByCategory.map((row) => ({
      category: row.category,
      quantity: row.quantity,
      revenue: formatMoney(row.revenue),
    })),
    paymentMix: dashboard.paymentMix.map((row) => ({
      method: row.method,
      amount: formatMoney(row.amount),
      count: row.count,
    })),
    productVelocity: dashboard.productVelocity,
    salesByEmployee: salesByEmployee.map((row) => ({
      employee: row.employee,
      orderCount: row.orderCount,
      revenue: formatMoney(row.revenue),
    })),
    salesByFulfillment: salesByFulfillment.map((row) => ({
      label: row.label,
      orderCount: row.orderCount,
      revenue: formatMoney(row.revenue),
    })),
    itemsSold: dashboard.itemsSold,
    dataNotes:
      dashboard.productVelocity.length === 0
        ? "No paid orders in this filter range."
        : undefined,
    privacy:
      "This context contains aggregate cafe metrics only. It intentionally excludes customer emails, phone numbers, and customer names.",
  };
}

async function getFilterLabels(filters: ReportRange | ReportFilters) {
  const [employees, sessions, productRows] = await Promise.all([
    "employeeIds" in filters && filters.employeeIds.length > 0
      ? db.query.users.findMany({
          where: inArray(users.id, filters.employeeIds),
        })
      : [],
    "sessionIds" in filters && filters.sessionIds.length > 0
      ? db.query.posSessions.findMany({
          where: inArray(posSessions.id, filters.sessionIds),
          with: { openedByUser: true },
        })
      : [],
    "productIds" in filters && filters.productIds.length > 0
      ? db.query.products.findMany({
          where: inArray(products.id, filters.productIds),
        })
      : [],
  ]);

  return {
    employee:
      employees.length > 0
        ? employees.map((employee) => employee.name).join(", ")
        : "All employees",
    session:
      sessions.length > 0
        ? sessions
            .map(
              (session) =>
                `${session.openedAt.toISOString()} (${session.openedByUser?.name ?? "Unknown"})`,
            )
            .join(", ")
        : "All sessions",
    product:
      productRows.length > 0
        ? productRows.map((product) => product.name).join(", ")
        : "All products",
  };
}

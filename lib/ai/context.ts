import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { posSessions, products, users } from "@/lib/db/schema";
import { getReportDashboard } from "@/lib/reports/queries";
import type { ReportFilters, ReportRange } from "@/lib/reports/range";
import { formatRangeLabel } from "@/lib/reports/range";

export async function buildReportAiContext(filters: ReportRange | ReportFilters) {
  const [dashboard, labels] = await Promise.all([
    getReportDashboard(filters),
    getFilterLabels(filters),
  ]);
  return {
    range: {
      preset: filters.preset,
      label: formatRangeLabel(filters),
      start: filters.start.toISOString(),
      end: filters.end.toISOString(),
    },
    filters: labels,
    summary: dashboard.summary,
    revenueByDay: dashboard.revenueByDay,
    salesByHour: dashboard.salesByHour,
    topProducts: dashboard.topProducts,
    topOrders: dashboard.topOrders.map((order) => ({
      orderNumber: order.orderNumber,
      employee: order.employee,
      paidAt: order.paidAt.toISOString(),
      total: order.total,
    })),
    salesByCategory: dashboard.salesByCategory,
    paymentMix: dashboard.paymentMix,
    productVelocity: dashboard.productVelocity,
    privacy:
      "This context contains aggregate cafe metrics only. It intentionally excludes customer emails, phone numbers, and customer names.",
  };
}

async function getFilterLabels(filters: ReportRange | ReportFilters) {
  if (!("employeeId" in filters || "sessionId" in filters || "productId" in filters)) {
    return {
      employee: "All employees",
      session: "All sessions",
      product: "All products",
    };
  }

  const [employee, session, product] = await Promise.all([
    filters.employeeId
      ? db.query.users.findFirst({ where: eq(users.id, filters.employeeId) })
      : null,
    filters.sessionId
      ? db.query.posSessions.findFirst({
          where: eq(posSessions.id, filters.sessionId),
          with: { openedByUser: true },
        })
      : null,
    filters.productId
      ? db.query.products.findFirst({ where: eq(products.id, filters.productId) })
      : null,
  ]);

  return {
    employee: employee?.name ?? "All employees",
    session: session
      ? `${session.openedAt.toISOString()} (${session.openedByUser?.name ?? "Unknown"})`
      : "All sessions",
    product: product?.name ?? "All products",
  };
}

import { getReportDashboard } from "@/lib/reports/queries";
import type { ReportRange } from "@/lib/reports/range";
import { formatRangeLabel } from "@/lib/reports/range";

export async function buildReportAiContext(range: ReportRange) {
  const dashboard = await getReportDashboard(range);
  return {
    range: {
      preset: range.preset,
      label: formatRangeLabel(range),
      start: range.start.toISOString(),
      end: range.end.toISOString(),
    },
    summary: dashboard.summary,
    revenueByDay: dashboard.revenueByDay,
    salesByHour: dashboard.salesByHour,
    topProducts: dashboard.topProducts,
    salesByCategory: dashboard.salesByCategory,
    paymentMix: dashboard.paymentMix,
    productVelocity: dashboard.productVelocity,
    privacy:
      "This context contains aggregate cafe metrics only. It intentionally excludes customer names, emails, phone numbers, and raw order rows.",
  };
}

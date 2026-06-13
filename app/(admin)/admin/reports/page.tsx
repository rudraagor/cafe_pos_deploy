import { Download } from "lucide-react";
import { AiWidgets } from "@/components/reports/ai-widgets";
import { DashboardCharts } from "@/components/reports/report-charts";
import { KpiCards } from "@/components/reports/kpi-cards";
import { LiveToggle } from "@/components/reports/live-toggle";
import { RangePicker } from "@/components/reports/range-picker";
import { SessionsLinkCard, TopProductsTable } from "@/components/reports/report-tables";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { getReportDashboard } from "@/lib/reports/queries";
import {
  formatRangeLabel,
  parseReportRange,
  rangeToSearchParams,
  type ReportSearchParams,
} from "@/lib/reports/range";

type ReportsPageProps = {
  searchParams: Promise<ReportSearchParams>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  await requireRole("admin");
  const params = await searchParams;
  const range = parseReportRange(params);
  const dashboard = await getReportDashboard(range);
  const csvHref = `/admin/reports/export.csv?${rangeToSearchParams(range)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-muted-foreground text-sm">
            Sales dashboard for {formatRangeLabel(range)}.
          </p>
        </div>
        <div className="flex gap-2">
          <LiveToggle />
          <Button variant="outline" size="sm" render={<a href={csvHref} />}>
            <Download className="size-4" />
            CSV
          </Button>
        </div>
      </div>

      <RangePicker range={range} />
      <KpiCards summary={dashboard.summary} />
      <DashboardCharts
        revenueByDay={dashboard.revenueByDay}
        salesByHour={dashboard.salesByHour}
        topProducts={dashboard.topProducts}
        salesByCategory={dashboard.salesByCategory}
        paymentMix={dashboard.paymentMix}
      />
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <TopProductsTable rows={dashboard.topProducts} />
        <SessionsLinkCard />
      </div>
      <AiWidgets params={params} />
    </div>
  );
}

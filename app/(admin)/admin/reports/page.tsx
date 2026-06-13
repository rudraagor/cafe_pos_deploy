import { Download } from "lucide-react";
import { AiWidgets } from "@/components/reports/ai-widgets";
import { DashboardCharts } from "@/components/reports/report-charts";
import { KpiCards } from "@/components/reports/kpi-cards";
import { LiveToggle } from "@/components/reports/live-toggle";
import { RangePicker } from "@/components/reports/range-picker";
import {
  SessionsLinkCard,
  TopCategoriesTable,
  TopOrdersTable,
  TopProductsTable,
} from "@/components/reports/report-tables";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import {
  getReportDashboard,
  getReportFilterOptions,
} from "@/lib/reports/queries";
import {
  formatRangeLabel,
  parseReportFilters,
  rangeToSearchParams,
  type ReportSearchParams,
} from "@/lib/reports/range";

type ReportsPageProps = {
  searchParams: Promise<ReportSearchParams>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  await requireRole("admin");
  const params = await searchParams;
  const filters = parseReportFilters(params);
  const [dashboard, filterOptions] = await Promise.all([
    getReportDashboard(filters),
    getReportFilterOptions(),
  ]);
  const exportParams = rangeToSearchParams(filters);
  const csvHref = `/admin/reports/export.csv?${exportParams}`;
  const xlsxHref = `/admin/reports/export.xlsx?${exportParams}`;
  const pdfHref = `/admin/reports/export.pdf?${exportParams}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-muted-foreground text-sm">
            Sales dashboard for {formatRangeLabel(filters)}.
          </p>
        </div>
        <div className="flex gap-2">
          <LiveToggle />
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href={csvHref} />}
          >
            <Download className="size-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href={xlsxHref} />}
          >
            <Download className="size-4" />
            XLSX
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href={pdfHref} />}
          >
            <Download className="size-4" />
            PDF
          </Button>
        </div>
      </div>

      <RangePicker filters={filters} options={filterOptions} />
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
      <div className="grid gap-4 xl:grid-cols-2">
        <TopOrdersTable rows={dashboard.topOrders} />
        <TopCategoriesTable rows={dashboard.salesByCategory} />
      </div>
      <AiWidgets params={params} />
    </div>
  );
}

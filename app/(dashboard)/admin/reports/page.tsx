import { Download } from "lucide-react";
import { redirect } from "next/navigation";
import { DashboardCanvas } from "@/components/reports/dashboard-canvas";
import { LunchRushButton } from "@/components/reports/lunch-rush-button";
import { LiveToggle } from "@/components/reports/live-toggle";
import { RangePicker } from "@/components/reports/range-picker";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { getAdminLiveFloor } from "@/lib/reports/customers";
import {
  getReportDashboard,
  getReportFilterOptions,
} from "@/lib/reports/queries";
import {
  clampReportFilters,
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
  const filterOptions = await getReportFilterOptions();
  const parsed = parseReportFilters(params);
  const filters = clampReportFilters(parsed, filterOptions.dataBounds);

  if (rangeToSearchParams(parsed) !== rangeToSearchParams(filters)) {
    redirect(`/admin/reports?${rangeToSearchParams(filters)}`);
  }

  const [dashboard, liveFloor] = await Promise.all([
    getReportDashboard(filters),
    getAdminLiveFloor(),
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
          <LunchRushButton />
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
      <DashboardCanvas
        dashboard={dashboard}
        liveFloor={liveFloor}
        params={params}
      />
    </div>
  );
}

import { requireRole } from "@/lib/auth";
import { getDashboardCsvRows, toCsv } from "@/lib/reports/queries";
import {
  parseReportFilters,
  reportParamsFromUrlSearchParams,
} from "@/lib/reports/range";

export async function GET(request: Request) {
  await requireRole("admin");
  const url = new URL(request.url);
  const filters = parseReportFilters(
    reportParamsFromUrlSearchParams(url.searchParams),
  );
  const rows = await getDashboardCsvRows(filters);

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reports-${filters.preset}.csv"`,
    },
  });
}

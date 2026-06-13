import { requireRole } from "@/lib/auth";
import { getDashboardCsvRows, toCsv } from "@/lib/reports/queries";
import { parseReportFilters } from "@/lib/reports/range";

export async function GET(request: Request) {
  await requireRole("admin");
  const url = new URL(request.url);
  const filters = parseReportFilters({
    preset: url.searchParams.get("preset") ?? undefined,
    start: url.searchParams.get("start") ?? undefined,
    end: url.searchParams.get("end") ?? undefined,
    employeeId: url.searchParams.get("employeeId") ?? undefined,
    sessionId: url.searchParams.get("sessionId") ?? undefined,
    productId: url.searchParams.get("productId") ?? undefined,
  });
  const rows = await getDashboardCsvRows(filters);

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reports-${filters.preset}.csv"`,
    },
  });
}

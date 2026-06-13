import { requireRole } from "@/lib/auth";
import { getDashboardCsvRows, toCsv } from "@/lib/reports/queries";
import { parseReportRange } from "@/lib/reports/range";

export async function GET(request: Request) {
  await requireRole("admin");
  const url = new URL(request.url);
  const range = parseReportRange({
    preset: url.searchParams.get("preset") ?? undefined,
    start: url.searchParams.get("start") ?? undefined,
    end: url.searchParams.get("end") ?? undefined,
  });
  const rows = await getDashboardCsvRows(range);

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reports-${range.preset}.csv"`,
    },
  });
}

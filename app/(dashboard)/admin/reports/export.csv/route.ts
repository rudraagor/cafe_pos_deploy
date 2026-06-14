import { requireRole } from "@/lib/auth";
import { getDashboardCsvRows, toCsv } from "@/lib/reports/queries";
import {
  parseReportFilters,
  reportParamsFromUrlSearchParams,
} from "@/lib/reports/range";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const user = await requireRole("admin");
  const limit = checkRateLimit({
    scope: "reports:export:csv",
    identifier: user.id,
    limit: 20,
    windowMs: 60 * 1000,
  });
  if (!limit.ok) return rateLimitResponse(limit);

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

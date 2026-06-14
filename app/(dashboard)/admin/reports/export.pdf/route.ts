import { requireRole } from "@/lib/auth";
import { buildReportPdf } from "@/lib/reports/build-pdf";
import { getDashboardCsvRows } from "@/lib/reports/queries";
import {
  formatRangeLabel,
  parseReportFilters,
  reportParamsFromUrlSearchParams,
} from "@/lib/reports/range";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await requireRole("admin");
  const limit = checkRateLimit({
    scope: "reports:export:pdf",
    identifier: user.id,
    limit: 20,
    windowMs: 60 * 1000,
  });
  if (!limit.ok) return rateLimitResponse(limit);

  const url = new URL(request.url);
  const filters = parseReportFilters(
    reportParamsFromUrlSearchParams(url.searchParams),
  );

  try {
    const rows = await getDashboardCsvRows(filters);
    const buffer = await buildReportPdf(
      rows,
      `Sales report: ${formatRangeLabel(filters)}`,
    );

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="reports-${filters.preset}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[reports/export.pdf]", error);
    return new Response("Failed to generate PDF export.", { status: 500 });
  }
}

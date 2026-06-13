import { requireRole } from "@/lib/auth";
import { buildReportPdf } from "@/lib/reports/build-pdf";
import { getDashboardCsvRows } from "@/lib/reports/queries";
import { formatRangeLabel, parseReportFilters } from "@/lib/reports/range";

export const runtime = "nodejs";

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

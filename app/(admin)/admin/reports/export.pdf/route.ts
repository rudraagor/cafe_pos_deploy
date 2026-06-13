import PDFDocument from "pdfkit";
import { requireRole } from "@/lib/auth";
import { formatMoney } from "@/lib/pos/pricing";
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
  const rows = await getDashboardCsvRows(filters);
  const buffer = await buildPdf(rows, `Sales report: ${formatRangeLabel(filters)}`);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reports-${filters.preset}.pdf"`,
    },
  });
}

function buildPdf(rows: Record<string, string | number>[], title: string) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text(title);
    doc.moveDown();

    const sections = new Map<string, typeof rows>();
    for (const row of rows) {
      const section = String(row.section ?? "report");
      sections.set(section, [...(sections.get(section) ?? []), row]);
    }

    for (const [section, sectionRows] of sections) {
      doc.moveDown(0.5).fontSize(13).text(titleCase(section), { underline: true });
      doc.moveDown(0.25);
      for (const row of sectionRows.slice(0, 30)) {
        const line = Object.entries(row)
          .filter(([key]) => key !== "section")
          .map(([key, value]) => `${key}: ${formatPdfValue(value)}`)
          .join(" | ");
        doc.fontSize(9).text(line, { lineGap: 2 });
      }
    }

    doc.end();
  });
}

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatPdfValue(value: unknown) {
  if (typeof value === "number") return Number.isInteger(value) ? value : formatMoney(value);
  return String(value ?? "");
}

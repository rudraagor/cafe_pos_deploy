import PDFDocument from "pdfkit";
import { formatMoney } from "@/lib/pos/pricing";

export function buildReportPdf(
  rows: Record<string, string | number>[],
  title: string,
) {
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
  if (typeof value === "number") {
    return Number.isInteger(value) ? value : formatMoney(value);
  }
  return String(value ?? "");
}

import ExcelJS from "exceljs";
import { requireRole } from "@/lib/auth";
import { getDashboardCsvRows } from "@/lib/reports/queries";
import {
  parseReportFilters,
  reportParamsFromUrlSearchParams,
} from "@/lib/reports/range";

export const runtime = "nodejs";

export async function GET(request: Request) {
  await requireRole("admin");
  const url = new URL(request.url);
  const filters = parseReportFilters(
    reportParamsFromUrlSearchParams(url.searchParams),
  );
  const rows = await getDashboardCsvRows(filters);
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Cafe POS";
  const sheet = workbook.addWorksheet("Reports");
  sheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.max(12, header.length + 2),
  }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(
      Object.fromEntries(
        headers.map((header) => {
          return [header, row[header]];
        }),
      ),
    );
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reports-${filters.preset}.xlsx"`,
    },
  });
}

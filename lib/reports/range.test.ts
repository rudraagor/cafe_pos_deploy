import assert from "node:assert/strict";
import {
  formatDateInput,
  parseReportFilters,
  parseReportRange,
  rangeToSearchParams,
} from "@/lib/reports/range";

const custom = parseReportRange({
  preset: "custom",
  start: "2026-06-01",
  end: "2026-06-13",
});

assert.equal(custom.preset, "custom");
assert.equal(formatDateInput(custom.start), "2026-06-01");
assert.equal(formatDateInput(new Date(custom.end.getTime() - 86400000)), "2026-06-13");
assert.equal(rangeToSearchParams(custom), "preset=custom&start=2026-06-01&end=2026-06-13");

const invalidCustom = parseReportRange({
  preset: "custom",
  start: "2026-06-13",
  end: "2026-06-01",
});

assert.equal(invalidCustom.preset, "today");
assert.equal(invalidCustom.start < invalidCustom.end, true);

const unknownPreset = parseReportRange({ preset: "not-a-real-range" });
assert.equal(unknownPreset.preset, "today");

const last7 = parseReportRange({ preset: "last7" });
const spanDays = Math.round(
  (last7.end.getTime() - last7.start.getTime()) / 86400000,
);
assert.equal(last7.preset, "last7");
assert.equal(spanDays, 7);

const filtered = parseReportFilters({
  preset: "today",
  employeeId: "employee-1",
  sessionId: "session-1",
  productId: "product-1",
});

assert.equal(filtered.employeeId, "employee-1");
assert.equal(filtered.sessionId, "session-1");
assert.equal(filtered.productId, "product-1");
assert.equal(
  rangeToSearchParams(filtered),
  "preset=today&employeeId=employee-1&sessionId=session-1&productId=product-1",
);

const cleaned = parseReportFilters({
  preset: "today",
  employeeId: "all",
  sessionId: "",
  productId: "   ",
});

assert.equal(cleaned.employeeId, undefined);
assert.equal(cleaned.sessionId, undefined);
assert.equal(cleaned.productId, undefined);

console.log("report range tests passed");

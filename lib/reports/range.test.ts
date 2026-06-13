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
  employeeId: ["employee-1", "employee-2"],
  sessionId: "session-1",
  productId: "product-1,product-2",
});

assert.deepEqual(filtered.employeeIds, ["employee-1", "employee-2"]);
assert.deepEqual(filtered.sessionIds, ["session-1"]);
assert.deepEqual(filtered.productIds, ["product-1", "product-2"]);
assert.equal(
  rangeToSearchParams(filtered),
  "preset=today&employeeId=employee-1&employeeId=employee-2&sessionId=session-1&productId=product-1&productId=product-2",
);

const cleaned = parseReportFilters({
  preset: "today",
  employeeId: "all",
  sessionId: "",
  productId: "   ",
});

assert.deepEqual(cleaned.employeeIds, []);
assert.deepEqual(cleaned.sessionIds, []);
assert.deepEqual(cleaned.productIds, []);

console.log("report range tests passed");

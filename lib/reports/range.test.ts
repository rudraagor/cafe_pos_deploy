import assert from "node:assert/strict";
import { aggregateTrendByBucket } from "@/lib/reports/buckets";
import {
  clampReportFilters,
  formatDateInput,
  parseReportFilters,
  parseReportRange,
  rangeToSearchParams,
  resolveChartBucket,
  yearRangeDates,
  yearsForDataPicker,
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

assert.equal(resolveChartBucket(last7), "1d");
assert.equal(
  resolveChartBucket(
    parseReportRange({
      preset: "custom",
      start: "2026-01-01",
      end: "2026-01-31",
    }),
  ),
  "7d",
);

const bounds = {
  minDate: "2025-03-01",
  maxDate: "2026-06-10",
  yearsWithData: [2025, 2026],
};
assert.deepEqual(yearsForDataPicker(bounds), [2026, 2025]);

const clamped = clampReportFilters(
  parseReportFilters({
    preset: "custom",
    start: "2021-01-01",
    end: "2026-06-14",
  }),
  bounds,
);
assert.equal(formatDateInput(clamped.start), "2025-03-01");
assert.equal(formatDateInput(new Date(clamped.end.getTime() - 86400000)), "2026-06-10");
assert.equal(clamped.preset, "custom");

assert.deepEqual(yearRangeDates(2025, bounds), {
  start: "2025-03-01",
  end: "2025-12-31",
});

const daily = [
  { label: "2026-06-01", revenue: 100, orders: 2 },
  { label: "2026-06-02", revenue: 50, orders: 1 },
  { label: "2026-06-04", revenue: 200, orders: 4 },
];
const bucketed = aggregateTrendByBucket(
  daily,
  "7d",
  new Date("2026-06-01T00:00:00"),
  new Date("2026-06-08T00:00:00"),
);
assert.equal(bucketed.length, 1);
assert.equal(bucketed[0]?.revenue, 350);
assert.equal(bucketed[0]?.orders, 7);

console.log("report range tests passed");

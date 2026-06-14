export type RangePreset = "today" | "yesterday" | "last7" | "month" | "custom";

export type ChartBucket = "1d" | "7d" | "15d" | "30d";

export const chartBuckets: { value: ChartBucket; label: string }[] = [
  { value: "1d", label: "1d" },
  { value: "7d", label: "7d" },
  { value: "15d", label: "15d" },
  { value: "30d", label: "30d" },
];

export type ReportDataBounds = {
  minDate: string | null;
  maxDate: string | null;
  yearsWithData: number[];
};

export type ReportRange = {
  preset: RangePreset;
  start: Date;
  end: Date;
};

export type ReportFilters = ReportRange & {
  employeeIds: string[];
  sessionIds: string[];
  productIds: string[];
};

export type ReportSearchParams = {
  preset?: string;
  start?: string;
  end?: string;
  employeeId?: string | string[];
  sessionId?: string | string[];
  productId?: string | string[];
};

export const rangePresets: { value: RangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 days" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom" },
];

export function parseReportRange(
  searchParams: ReportSearchParams = {},
): ReportRange {
  const now = new Date();
  const preset = isRangePreset(searchParams.preset)
    ? searchParams.preset
    : "today";

  if (preset === "custom") {
    const start = parseDateBoundary(searchParams.start, "start") ?? startOfDay(now);
    const end = parseDateBoundary(searchParams.end, "end") ?? endOfDay(now);
    return start < end
      ? { preset, start, end }
      : { preset: "today", start: startOfDay(now), end: endOfDay(now) };
  }

  if (preset === "yesterday") {
    const yesterday = addDays(startOfDay(now), -1);
    return { preset, start: yesterday, end: addDays(yesterday, 1) };
  }

  if (preset === "last7") {
    return { preset, start: addDays(startOfDay(now), -6), end: endOfDay(now) };
  }

  if (preset === "month") {
    return {
      preset,
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: endOfDay(now),
    };
  }

  return { preset: "today", start: startOfDay(now), end: endOfDay(now) };
}

export function parseReportFilters(
  searchParams: ReportSearchParams = {},
): ReportFilters {
  return {
    ...parseReportRange(searchParams),
    employeeIds: cleanFilterIds(searchParams.employeeId),
    sessionIds: cleanFilterIds(searchParams.sessionId),
    productIds: cleanFilterIds(searchParams.productId),
  };
}

/** Pick a chart bucket that keeps trend charts readable for the selected span. */
export function resolveChartBucket(range: ReportRange): ChartBucket {
  const days = Math.max(
    1,
    Math.round((range.end.getTime() - range.start.getTime()) / 86400000),
  );
  if (days <= 14) return "1d";
  if (days <= 45) return "7d";
  if (days <= 90) return "15d";
  return "30d";
}

export function isDateInBounds(date: Date, bounds: ReportDataBounds) {
  if (!bounds.minDate || !bounds.maxDate) return true;
  const min = parseBoundDate(bounds.minDate);
  const max = parseBoundDate(bounds.maxDate);
  const day = startOfDay(date);
  return day >= min && day <= max;
}

export function rangeToSearchParams(range: ReportRange | ReportFilters) {
  const params = new URLSearchParams({ preset: range.preset });
  if (range.preset === "custom") {
    params.set("start", formatDateInput(range.start));
    params.set("end", formatDateInput(addDays(range.end, -1)));
  }
  if ("employeeIds" in range) {
    for (const id of range.employeeIds) params.append("employeeId", id);
  }
  if ("sessionIds" in range) {
    for (const id of range.sessionIds) params.append("sessionId", id);
  }
  if ("productIds" in range) {
    for (const id of range.productIds) params.append("productId", id);
  }
  return params.toString();
}

export function reportParamsFromUrlSearchParams(
  searchParams: URLSearchParams,
): ReportSearchParams {
  return {
    preset: searchParams.get("preset") ?? undefined,
    start: searchParams.get("start") ?? undefined,
    end: searchParams.get("end") ?? undefined,
    employeeId: searchParams.getAll("employeeId"),
    sessionId: searchParams.getAll("sessionId"),
    productId: searchParams.getAll("productId"),
  };
}

export function yearsForDataPicker(bounds: ReportDataBounds) {
  return [...bounds.yearsWithData].sort((a, b) => b - a);
}

export function monthsInBoundsForYear(
  year: number,
  bounds: ReportDataBounds,
): number[] {
  if (!bounds.minDate || !bounds.maxDate) {
    return Array.from({ length: 12 }, (_, index) => index + 1);
  }
  const min = parseBoundDate(bounds.minDate);
  const max = parseBoundDate(bounds.maxDate);
  if (year < min.getFullYear() || year > max.getFullYear()) return [];
  const start = year === min.getFullYear() ? min.getMonth() + 1 : 1;
  const end = year === max.getFullYear() ? max.getMonth() + 1 : 12;
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function daysInBoundsForMonth(
  year: number,
  month: number,
  bounds: ReportDataBounds,
): number[] {
  const lastDay = new Date(year, month, 0).getDate();
  if (!bounds.minDate || !bounds.maxDate) {
    return Array.from({ length: lastDay }, (_, index) => index + 1);
  }
  const min = parseBoundDate(bounds.minDate);
  const max = parseBoundDate(bounds.maxDate);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month - 1, lastDay);
  if (monthStart > max || monthEnd < min) return [];
  let start = 1;
  let end = lastDay;
  if (year === min.getFullYear() && month === min.getMonth() + 1) {
    start = min.getDate();
  }
  if (year === max.getFullYear() && month === max.getMonth() + 1) {
    end = max.getDate();
  }
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function clampReportFilters(
  filters: ReportFilters,
  bounds: ReportDataBounds,
): ReportFilters {
  if (!bounds.minDate || !bounds.maxDate) return filters;

  const min = parseBoundDate(bounds.minDate);
  const maxEnd = addDays(parseBoundDate(bounds.maxDate), 1);
  const start = filters.start < min ? min : filters.start;
  const end = filters.end > maxEnd ? maxEnd : filters.end;

  if (start >= end) {
    return clampReportFilters(
      {
        ...filters,
        ...parseReportRange({ preset: "last7" }),
        preset: "last7",
      },
      bounds,
    );
  }

  const datesChanged =
    start.getTime() !== filters.start.getTime() ||
    end.getTime() !== filters.end.getTime();

  return {
    ...filters,
    preset:
      filters.preset === "custom" || datesChanged ? "custom" : filters.preset,
    start,
    end,
  };
}

export function yearRangeDates(year: number, bounds: ReportDataBounds) {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  if (!bounds.minDate || !bounds.maxDate) {
    return { start, end };
  }
  return {
    start: start < bounds.minDate ? bounds.minDate : start,
    end: end > bounds.maxDate ? bounds.maxDate : end,
  };
}

export function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const REPORT_LOCALE = "en-IN";
const REPORT_TIME_ZONE = "Asia/Kolkata";

function toValidDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatReportDateTime(value: Date | string | null | undefined) {
  const date = toValidDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(REPORT_LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: REPORT_TIME_ZONE,
  }).format(date);
}

export function formatReportDate(value: Date | string | null | undefined) {
  const date = toValidDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(REPORT_LOCALE, {
    dateStyle: "medium",
    timeZone: REPORT_TIME_ZONE,
  }).format(date);
}

export function formatRangeLabel(range: ReportRange) {
  const start = formatReportDate(range.start);
  const end = formatReportDate(addDays(range.end, -1));
  return start === end ? start : `${start} - ${end}`;
}

function isRangePreset(value: unknown): value is RangePreset {
  return (
    value === "today" ||
    value === "yesterday" ||
    value === "last7" ||
    value === "month" ||
    value === "custom"
  );
}

function cleanFilterIds(value: string | string[] | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return [
    ...new Set(
      values
        .flatMap((item) => item.split(","))
        .map((item) => item.trim())
        .filter((item) => item && item !== "all"),
    ),
  ];
}

function parseBoundDate(value: string) {
  return startOfDay(new Date(`${value}T00:00:00`));
}

function parseDateBoundary(value: string | undefined, side: "start" | "end") {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return side === "start" ? startOfDay(date) : addDays(startOfDay(date), 1);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return addDays(startOfDay(date), 1);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

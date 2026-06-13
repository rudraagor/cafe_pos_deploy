export type RangePreset = "today" | "yesterday" | "last7" | "month" | "custom";

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

export type RangePreset = "today" | "yesterday" | "last7" | "month" | "custom";

export type ReportRange = {
  preset: RangePreset;
  start: Date;
  end: Date;
};

export type ReportSearchParams = {
  preset?: string;
  start?: string;
  end?: string;
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

export function rangeToSearchParams(range: ReportRange) {
  const params = new URLSearchParams({ preset: range.preset });
  if (range.preset === "custom") {
    params.set("start", formatDateInput(range.start));
    params.set("end", formatDateInput(addDays(range.end, -1)));
  }
  return params.toString();
}

export function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function formatRangeLabel(range: ReportRange) {
  const start = range.start.toLocaleDateString();
  const end = addDays(range.end, -1).toLocaleDateString();
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

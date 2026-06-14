"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatDateInput,
  formatReportDate,
  isDateInBounds,
  monthsInBoundsForYear,
  yearsForDataPicker,
  type ReportDataBounds,
} from "@/lib/reports/range";

const weekdayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const monthLabels = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function buildCalendarDays(year: number, month: number) {
  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leading = firstOfMonth.getDay();
  const cells: { date: Date; inMonth: boolean }[] = [];

  for (let index = 0; index < leading; index += 1) {
    cells.push({
      date: addDays(firstOfMonth, index - leading),
      inMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      date: new Date(year, month - 1, day),
      inMonth: true,
    });
  }

  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1]?.date ?? firstOfMonth;
    cells.push({ date: addDays(last, 1), inMonth: false });
  }

  return cells;
}

function clampViewMonth(year: number, month: number, bounds: ReportDataBounds) {
  const months = monthsInBoundsForYear(year, bounds);
  if (months.length === 0) {
    const years = yearsForDataPicker(bounds);
    const fallbackYear = years[0] ?? year;
    const fallbackMonths = monthsInBoundsForYear(fallbackYear, bounds);
    return {
      year: fallbackYear,
      month: fallbackMonths[0] ?? 1,
    };
  }
  if (months.includes(month)) return { year, month };
  return { year, month: months[0] ?? month };
}

export function ReportDatePicker({
  value,
  bounds,
  label,
  onChange,
}: {
  value: Date;
  bounds: ReportDataBounds;
  label: string;
  onChange: (date: Date) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const initialView = clampViewMonth(
    value.getFullYear(),
    value.getMonth() + 1,
    bounds,
  );
  const [viewYear, setViewYear] = useState(initialView.year);
  const [viewMonth, setViewMonth] = useState(initialView.month);

  const years = yearsForDataPicker(bounds);
  const months = monthsInBoundsForYear(viewYear, bounds);
  const cells = useMemo(
    () => buildCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", onPointerDown);
      return () => document.removeEventListener("mousedown", onPointerDown);
    }
  }, [open]);

  function shiftMonth(delta: number) {
    const index = months.indexOf(viewMonth);
    if (delta < 0) {
      if (index > 0) {
        setViewMonth(months[index - 1] ?? viewMonth);
        return;
      }
      const yearIndex = years.indexOf(viewYear);
      if (yearIndex < years.length - 1) {
        const prevYear = years[yearIndex + 1] ?? viewYear;
        const prevMonths = monthsInBoundsForYear(prevYear, bounds);
        setViewYear(prevYear);
        setViewMonth(prevMonths[prevMonths.length - 1] ?? 1);
      }
      return;
    }

    if (index < months.length - 1) {
      setViewMonth(months[index + 1] ?? viewMonth);
      return;
    }
    const yearIndex = years.indexOf(viewYear);
    if (yearIndex > 0) {
      const nextYear = years[yearIndex - 1] ?? viewYear;
      const nextMonths = monthsInBoundsForYear(nextYear, bounds);
      setViewYear(nextYear);
      setViewMonth(nextMonths[0] ?? 1);
    }
  }

  const canGoPrev =
    years.indexOf(viewYear) < years.length - 1 || months.indexOf(viewMonth) > 0;
  const canGoNext =
    years.indexOf(viewYear) > 0 ||
    months.indexOf(viewMonth) < months.length - 1;

  if (years.length === 0) {
    return (
      <div className="min-w-[11rem] flex-1 space-y-1.5">
        <span className="text-muted-foreground text-xs font-medium">
          {label}
        </span>
        <div className="text-muted-foreground flex h-9 items-center rounded-lg border border-dashed px-3 text-sm">
          No order data
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative min-w-[11rem] flex-1 space-y-1.5">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <Button
        type="button"
        variant="outline"
        className="h-9 w-full justify-start gap-2 px-3 font-normal"
        onClick={() => setOpen((current) => !current)}
      >
        <CalendarDays className="text-muted-foreground size-4 shrink-0" />
        <span className="truncate">{formatReportDate(value)}</span>
      </Button>

      {open ? (
        <div className="bg-popover text-popover-foreground absolute top-[calc(100%-0.25rem)] z-50 mt-2 w-[17rem] rounded-xl border p-3 shadow-lg">
          <div className="mb-3 flex items-center justify-between gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!canGoPrev}
              onClick={() => shiftMonth(-1)}
            >
              <ChevronLeft className="size-4" />
            </Button>

            <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
              {years.length > 1 ? (
                <select
                  aria-label="Year"
                  className="border-input bg-background rounded-md border px-2 py-1 text-sm outline-none"
                  value={viewYear}
                  onChange={(event) => {
                    const year = Number(event.target.value);
                    const next = clampViewMonth(year, viewMonth, bounds);
                    setViewYear(next.year);
                    setViewMonth(next.month);
                  }}
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm font-medium tabular-nums">
                  {viewYear}
                </span>
              )}
              <select
                aria-label="Month"
                className="border-input bg-background rounded-md border px-2 py-1 text-sm outline-none"
                value={viewMonth}
                onChange={(event) => setViewMonth(Number(event.target.value))}
              >
                {months.map((month) => (
                  <option key={month} value={month}>
                    {monthLabels[month - 1]?.slice(0, 3)}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!canGoNext}
              onClick={() => shiftMonth(1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {weekdayLabels.map((label) => (
              <div
                key={label}
                className="text-muted-foreground py-1 text-center text-[11px] font-medium"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map(({ date, inMonth }) => {
              const enabled = inMonth && isDateInBounds(date, bounds);
              const selected = formatDateInput(date) === formatDateInput(value);
              return (
                <button
                  key={formatDateInput(date)}
                  type="button"
                  disabled={!enabled}
                  onClick={() => {
                    onChange(date);
                    setOpen(false);
                  }}
                  className={cn(
                    "h-8 rounded-md text-sm transition-colors",
                    enabled
                      ? "hover:bg-muted"
                      : "text-muted-foreground/35 cursor-not-allowed",
                    selected &&
                      enabled &&
                      "bg-primary text-primary-foreground hover:bg-primary",
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

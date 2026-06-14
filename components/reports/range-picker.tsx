"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MultiFilterSelect } from "@/components/reports/multi-filter-select";
import { ReportDatePicker } from "@/components/reports/report-date-picker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  rangePresets,
  rangeToSearchParams,
  type ReportDataBounds,
  type ReportFilters,
  type RangePreset,
} from "@/lib/reports/range";

type ReportFilterOptions = {
  employees: { id: string; label: string }[];
  sessions: { id: string; label: string }[];
  products: { id: string; label: string }[];
  dataBounds: ReportDataBounds;
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function RangePicker({
  filters,
  options,
}: {
  filters: ReportFilters;
  options: ReportFilterOptions;
}) {
  const router = useRouter();
  const { dataBounds } = options;
  const [showAdvanced, setShowAdvanced] = useState(
    filters.employeeIds.length > 0 ||
      filters.sessionIds.length > 0 ||
      filters.productIds.length > 0,
  );

  const endInclusive = new Date(filters.end.getTime() - 86400000);
  const hasAdvancedFilters =
    filters.employeeIds.length > 0 ||
    filters.sessionIds.length > 0 ||
    filters.productIds.length > 0;

  function navigate(next: ReportFilters) {
    router.push(`/admin/reports?${rangeToSearchParams(next)}`);
  }

  function setPreset(preset: RangePreset) {
    navigate({ ...filters, preset });
  }

  function setCustomRange(start: Date, endInclusive: Date) {
    const nextStart = start;
    let nextEnd = addDays(endInclusive, 1);
    if (nextStart >= nextEnd) {
      nextEnd = addDays(nextStart, 1);
    }
    navigate({
      ...filters,
      preset: "custom",
      start: nextStart,
      end: nextEnd,
    });
  }

  function setStartDate(start: Date) {
    setCustomRange(start, endInclusive);
  }

  function setEndDate(end: Date) {
    setCustomRange(filters.start, end);
  }

  function submitAdvanced(formData: FormData) {
    const params = new URLSearchParams(rangeToSearchParams(filters));
    params.delete("employeeId");
    params.delete("sessionId");
    params.delete("productId");
    for (const key of ["employeeId", "sessionId", "productId"]) {
      for (const value of formData.getAll(key)) {
        const id = String(value).trim();
        if (id) params.append(key, id);
      }
    }
    router.push(`/admin/reports?${params.toString()}`);
  }

  return (
    <div className="bg-card space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-2">
        {rangePresets
          .filter((preset) => preset.value !== "custom")
          .map((preset) => (
            <Button
              key={preset.value}
              type="button"
              variant={filters.preset === preset.value ? "default" : "outline"}
              size="sm"
              onClick={() => setPreset(preset.value)}
            >
              {preset.label}
            </Button>
          ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-end">
          <ReportDatePicker
            label="From"
            value={filters.start}
            bounds={dataBounds}
            onChange={setStartDate}
          />
          <span className="text-muted-foreground hidden pb-2 text-sm sm:block">
            to
          </span>
          <ReportDatePicker
            label="To"
            value={endInclusive}
            bounds={dataBounds}
            onChange={setEndDate}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0 gap-2 self-start lg:self-end"
          onClick={() => setShowAdvanced((current) => !current)}
        >
          <SlidersHorizontal className="size-4" />
          Filters
          {hasAdvancedFilters ? (
            <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px] leading-none">
              {filters.employeeIds.length +
                filters.sessionIds.length +
                filters.productIds.length}
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              showAdvanced && "rotate-180",
            )}
          />
        </Button>
      </div>

      {showAdvanced ? (
        <form
          key={`${rangeToSearchParams(filters)}-advanced`}
          action={submitAdvanced}
          className="grid gap-3 border-t pt-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <MultiFilterSelect
            name="employeeId"
            label="Employees"
            placeholder="All employees"
            values={filters.employeeIds}
            options={options.employees}
          />
          <MultiFilterSelect
            name="sessionId"
            label="Sessions"
            placeholder="All sessions"
            values={filters.sessionIds}
            options={options.sessions}
          />
          <MultiFilterSelect
            name="productId"
            label="Products"
            placeholder="All products"
            values={filters.productIds}
            options={options.products}
          />
          <div className="flex items-end">
            <Button type="submit" className="h-9 w-full">
              Apply filters
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { MultiFilterSelect } from "@/components/reports/multi-filter-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatDateInput,
  rangePresets,
  rangeToSearchParams,
  type ReportFilters,
  type RangePreset,
} from "@/lib/reports/range";

type ReportFilterOptions = {
  employees: { id: string; label: string }[];
  sessions: { id: string; label: string }[];
  products: { id: string; label: string }[];
};

export function RangePicker({
  filters,
  options,
}: {
  filters: ReportFilters;
  options: ReportFilterOptions;
}) {
  const router = useRouter();

  function setPreset(preset: RangePreset) {
    router.push(
      `/admin/reports?${rangeToSearchParams({
        ...filters,
        preset,
      })}`,
    );
  }

  function submit(formData: FormData) {
    const start = String(formData.get("start") ?? "");
    const end = String(formData.get("end") ?? "");
    const params = new URLSearchParams({ preset: "custom", start, end });
    for (const key of ["employeeId", "sessionId", "productId"]) {
      for (const value of formData.getAll(key)) {
        const id = String(value).trim();
        if (id) params.append(key, id);
      }
    }
    router.push(`/admin/reports?${params.toString()}`);
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
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
      <form
        key={rangeToSearchParams(filters)}
        action={submit}
        className="grid gap-3 lg:grid-cols-6"
      >
        <Input
          name="start"
          type="date"
          defaultValue={formatDateInput(filters.start)}
        />
        <Input
          name="end"
          type="date"
          defaultValue={formatDateInput(
            new Date(filters.end.getTime() - 86400000),
          )}
        />
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
        <Button type="submit" variant="outline">
          Apply filters
        </Button>
      </form>
    </div>
  );
}

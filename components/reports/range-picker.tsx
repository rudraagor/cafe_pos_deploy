"use client";

import { useRouter } from "next/navigation";
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
      const value = String(formData.get(key) ?? "");
      if (value && value !== "all") params.set(key, value);
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
      <form action={submit} className="grid gap-3 lg:grid-cols-6">
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
        <FilterSelect
          name="employeeId"
          label="All employees"
          value={filters.employeeId}
          options={options.employees}
        />
        <FilterSelect
          name="sessionId"
          label="All sessions"
          value={filters.sessionId}
          options={options.sessions}
        />
        <FilterSelect
          name="productId"
          label="All products"
          value={filters.productId}
          options={options.products}
        />
        <Button type="submit" variant="outline">
          Apply filters
        </Button>
      </form>
    </div>
  );
}

function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: { id: string; label: string }[];
}) {
  return (
    <select
      name={name}
      defaultValue={value ?? "all"}
      className="border-input bg-background h-9 rounded-md border px-3 text-sm"
    >
      <option value="all">{label}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

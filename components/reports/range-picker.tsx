"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatDateInput,
  rangePresets,
  type RangePreset,
  type ReportRange,
} from "@/lib/reports/range";

export function RangePicker({ range }: { range: ReportRange }) {
  const router = useRouter();

  function setPreset(preset: RangePreset) {
    router.push(`/admin/reports?preset=${preset}`);
  }

  function submit(formData: FormData) {
    const start = String(formData.get("start") ?? "");
    const end = String(formData.get("end") ?? "");
    router.push(`/admin/reports?preset=custom&start=${start}&end=${end}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {rangePresets
        .filter((preset) => preset.value !== "custom")
        .map((preset) => (
          <Button
            key={preset.value}
            type="button"
            variant={range.preset === preset.value ? "default" : "outline"}
            size="sm"
            onClick={() => setPreset(preset.value)}
          >
            {preset.label}
          </Button>
        ))}
      <form action={submit} className="flex items-center gap-2">
        <Input
          name="start"
          type="date"
          defaultValue={formatDateInput(range.start)}
          className="w-36"
        />
        <Input
          name="end"
          type="date"
          defaultValue={formatDateInput(new Date(range.end.getTime() - 86400000))}
          className="w-36"
        />
        <Button type="submit" variant="outline" size="sm">
          Apply
        </Button>
      </form>
    </div>
  );
}

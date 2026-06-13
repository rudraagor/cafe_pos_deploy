"use client";

import { ChevronDown } from "lucide-react";
import { useMemo } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MultiFilterSelectProps = {
  name: string;
  label: string;
  placeholder: string;
  values: string[];
  options: { id: string; label: string }[];
};

export function MultiFilterSelect({
  name,
  label,
  placeholder,
  values,
  options,
}: MultiFilterSelectProps) {
  const selected = useMemo(() => new Set(values), [values]);
  const selectedLabels = options
    .filter((option) => selected.has(option.id))
    .map((option) => option.label);
  const summary =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} selected`;

  return (
    <details className="group relative min-w-0">
      <summary
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          "h-9 w-full cursor-pointer list-none justify-between px-3 [&::-webkit-details-marker]:hidden",
        )}
      >
        <span className="min-w-0 truncate text-left">{summary}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="absolute z-40 mt-2 max-h-72 w-full min-w-64 overflow-y-auto rounded-lg border bg-popover p-2 text-popover-foreground shadow-lg">
        <div className="px-2 pb-2 text-xs font-medium text-muted-foreground">
          {label}
        </div>
        {options.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            Nothing to filter yet.
          </p>
        ) : (
          <div className="space-y-1">
            {options.map((option) => (
              <label
                key={option.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  name={name}
                  value={option.id}
                  defaultChecked={selected.has(option.id)}
                  className="size-4 rounded border-input"
                />
                <span className="min-w-0 truncate">{option.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

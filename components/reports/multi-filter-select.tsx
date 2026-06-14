"use client";

import { ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set(values));

  const selectedLabels = options
    .filter((option) => selectedIds.has(option.id))
    .map((option) => option.label);
  const summary =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} selected`;

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) ||
        selectedIds.has(option.id),
    );
  }, [options, query, selectedIds]);

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="min-w-0 space-y-1.5">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <details className="group relative min-w-0">
        <summary
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "h-9 w-full cursor-pointer list-none justify-between px-3 [&::-webkit-details-marker]:hidden",
          )}
        >
          <span className="min-w-0 truncate text-left">{summary}</span>
          <ChevronDown className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        <div className="bg-popover text-popover-foreground absolute z-40 mt-2 w-full min-w-72 overflow-hidden rounded-lg border shadow-lg">
          <div
            className="border-b p-2"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${label.toLowerCase()}…`}
                className="h-8 pl-8"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-2">
            {options.length === 0 ? (
              <p className="text-muted-foreground px-2 py-4 text-sm">
                Nothing to filter yet.
              </p>
            ) : filteredOptions.length === 0 ? (
              <p className="text-muted-foreground px-2 py-4 text-sm">
                No matches for &ldquo;{query.trim()}&rdquo;.
              </p>
            ) : (
              <div className="space-y-1">
                {filteredOptions.map((option) => (
                  <label
                    key={option.id}
                    className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(option.id)}
                      onChange={() => toggle(option.id)}
                      className="border-input size-4 rounded"
                    />
                    <span className="min-w-0 truncate">{option.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </details>

      {[...selectedIds].map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
    </div>
  );
}

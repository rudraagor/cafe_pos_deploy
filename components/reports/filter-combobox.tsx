"use client";

import { Combobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type FilterOption = { value: string; label: string };

type FilterComboboxProps = {
  name: string;
  placeholder: string;
  value?: string;
  options: { id: string; label: string }[];
};

export function FilterCombobox({
  name,
  placeholder,
  value,
  options,
}: FilterComboboxProps) {
  const items = useMemo<FilterOption[]>(
    () => [
      { value: "all", label: placeholder },
      ...options.map((option) => ({
        value: option.id,
        label: option.label,
      })),
    ],
    [options, placeholder],
  );

  const initial =
    items.find((item) => item.value === (value ?? "all")) ?? items[0]!;
  const [selected, setSelected] = useState(initial);

  return (
    <>
      <input type="hidden" name={name} value={selected.value} />
      <Combobox.Root
        items={items}
        value={selected}
        onValueChange={(next) => {
          if (next) setSelected(next);
        }}
        isItemEqualToValue={(a, b) => a.value === b.value}
      >
        <Combobox.Trigger
          className={cn(
            "flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
          )}
        >
          <Combobox.Value placeholder={placeholder}>
            {(current) => (
              <span className="truncate text-left">
                {current?.label ?? placeholder}
              </span>
            )}
          </Combobox.Value>
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </Combobox.Trigger>

        <Combobox.Portal>
          <Combobox.Positioner side="bottom" align="start" sideOffset={4}>
            <Combobox.Popup
              className={cn(
                "z-50 max-h-72 w-(--anchor-width) min-w-[var(--anchor-width)] origin-(--transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10",
              )}
            >
              <div className="border-b p-2">
                <Combobox.Input
                  placeholder="Search…"
                  className={cn(
                    "h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
                  )}
                />
              </div>
              <Combobox.List className="max-h-56 overflow-y-auto p-1">
                {(item: FilterOption) => (
                  <Combobox.Item
                    key={item.value}
                    value={item}
                    className={cn(
                      "relative flex w-full cursor-default items-center rounded-md py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                    )}
                  >
                    <span className="truncate">{item.label}</span>
                    <Combobox.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
                      <CheckIcon className="size-4" />
                    </Combobox.ItemIndicator>
                  </Combobox.Item>
                )}
              </Combobox.List>
              <Combobox.Empty className="text-muted-foreground px-2 py-4 text-center text-sm">
                No results found.
              </Combobox.Empty>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </>
  );
}

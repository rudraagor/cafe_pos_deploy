"use client";

import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";

type DataTableShellProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  empty: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  children: ReactNode;
};

export function DataTableShell({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  empty,
  emptyTitle,
  emptyDescription,
  children,
}: DataTableShellProps) {
  return (
    <div className="space-y-3">
      <div className="relative w-full sm:max-w-xs">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="pl-8"
        />
      </div>

      <div className="bg-card overflow-hidden rounded-lg border">
        {empty ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-1 p-6 text-center">
            <p className="font-medium">{emptyTitle}</p>
            {emptyDescription ? (
              <p className="text-muted-foreground max-w-sm text-sm">
                {emptyDescription}
              </p>
            ) : null}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

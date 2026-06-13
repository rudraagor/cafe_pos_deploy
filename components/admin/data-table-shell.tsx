"use client";

import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";

type DataTableShellProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  toolbarActions?: ReactNode;
  footer?: ReactNode;
  empty: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  children: ReactNode;
};

export function DataTableShell({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  toolbarActions,
  footer,
  empty,
  emptyTitle,
  emptyDescription,
  children,
}: DataTableShellProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 pl-9"
          />
        </div>
        {toolbarActions ? (
          <div className="flex shrink-0 items-center gap-2">{toolbarActions}</div>
        ) : null}
      </div>

      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        {empty ? (
          <div className="flex min-h-44 flex-col items-center justify-center gap-1 p-8 text-center">
            <p className="font-medium">{emptyTitle}</p>
            {emptyDescription ? (
              <p className="text-muted-foreground max-w-sm text-sm">
                {emptyDescription}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            {children}
            {footer}
          </>
        )}
      </div>
    </div>
  );
}

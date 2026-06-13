"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type TableMap = Record<string, { number: number; floorName: string }>;

type CurrentTableIndicatorProps = {
  tables: TableMap;
  variant?: "sidebar" | "header";
};

function CurrentTableIndicatorInner({
  tables,
  variant = "sidebar",
}: CurrentTableIndicatorProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tableId = searchParams.get("table");
  const table = tableId ? tables[tableId] : null;
  const label = pathname === "/pos/takeaway" ? "Takeaway" : "No table";

  return (
    <span
      className={cn(
        "rounded-md border px-2.5 py-1 font-medium",
        variant === "sidebar"
          ? "block w-full text-center text-xs"
          : "bg-muted shrink-0 text-sm whitespace-nowrap",
      )}
    >
      {table ? `Table ${table.number} · ${table.floorName}` : label}
    </span>
  );
}

export function CurrentTableIndicator({
  tables,
  variant = "sidebar",
}: CurrentTableIndicatorProps) {
  return (
    <Suspense
      fallback={
        <span
          className={cn(
            "rounded-md border px-2.5 py-1 font-medium",
            variant === "sidebar"
              ? "block w-full text-center text-xs"
              : "bg-muted shrink-0 text-sm whitespace-nowrap",
          )}
        >
          No table
        </span>
      }
    >
      <CurrentTableIndicatorInner tables={tables} variant={variant} />
    </Suspense>
  );
}

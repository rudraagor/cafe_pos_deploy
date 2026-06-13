"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type TableMap = Record<string, { number: number; floorName: string }>;

function CurrentTableIndicatorInner({ tables }: { tables: TableMap }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tableId = searchParams.get("table");
  const table = tableId ? tables[tableId] : null;
  const label = pathname === "/pos/takeaway" ? "Takeaway" : "No table";

  return (
    <span className="hidden rounded-md border px-2.5 py-1 text-xs font-medium sm:inline">
      {table ? `Table ${table.number} · ${table.floorName}` : label}
    </span>
  );
}

export function CurrentTableIndicator({ tables }: { tables: TableMap }) {
  return (
    <Suspense
      fallback={
        <span className="hidden rounded-md border px-2.5 py-1 text-xs font-medium sm:inline">
          No table
        </span>
      }
    >
      <CurrentTableIndicatorInner tables={tables} />
    </Suspense>
  );
}

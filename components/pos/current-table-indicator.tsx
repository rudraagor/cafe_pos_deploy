"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

type TableMap = Record<string, { number: number; floorName: string }>;

function CurrentTableIndicatorInner({ tables }: { tables: TableMap }) {
  const searchParams = useSearchParams();
  const tableId = searchParams.get("table");
  const table = tableId ? tables[tableId] : null;

  return (
    <span className="hidden rounded-md border px-2.5 py-1 text-xs font-medium sm:inline">
      {table ? `Table ${table.number} · ${table.floorName}` : "No table"}
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

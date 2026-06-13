"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type SortDirection = "asc" | "desc";

export type SortableColumn<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "right";
  sortValue?: (row: T) => string | number | Date | null;
  render: (row: T) => React.ReactNode;
};

export function SortableDataTable<T>({
  rows,
  columns,
  rowKey,
  emptyMessage = "No rows to show.",
  sortKey: controlledSortKey,
  sortDirection: controlledSortDirection,
  onSortChange,
}: {
  rows: T[];
  columns: SortableColumn<T>[];
  rowKey: (row: T, index: number) => string;
  emptyMessage?: string;
  sortKey?: string | null;
  sortDirection?: SortDirection;
  onSortChange?: (key: string, direction: SortDirection) => void;
}) {
  const [internalSortKey, setInternalSortKey] = useState<string | null>(null);
  const [internalSortDirection, setInternalSortDirection] =
    useState<SortDirection>("desc");

  const isControlled = onSortChange != null;
  const sortKey = isControlled ? (controlledSortKey ?? null) : internalSortKey;
  const sortDirection = isControlled
    ? (controlledSortDirection ?? "desc")
    : internalSortDirection;

  const sortedRows = useMemo(() => {
    if (isControlled) return rows;
    if (!sortKey) return rows;
    const column = columns.find((entry) => entry.key === sortKey);
    if (!column?.sortValue) return rows;

    const copy = [...rows];
    copy.sort((a, b) => {
      const left = column.sortValue!(a);
      const right = column.sortValue!(b);
      if (left == null && right == null) return 0;
      if (left == null) return 1;
      if (right == null) return -1;
      if (left instanceof Date && right instanceof Date) {
        return left.getTime() - right.getTime();
      }
      if (typeof left === "number" && typeof right === "number") {
        return left - right;
      }
      return String(left).localeCompare(String(right));
    });
    if (sortDirection === "desc") copy.reverse();
    return copy;
  }, [rows, columns, sortKey, sortDirection, isControlled]);

  function toggleSort(key: string) {
    if (sortKey !== key) {
      if (isControlled) {
        onSortChange?.(key, "desc");
      } else {
        setInternalSortKey(key);
        setInternalSortDirection("desc");
      }
      return;
    }
    const nextDirection = sortDirection === "desc" ? "asc" : "desc";
    if (isControlled) {
      onSortChange?.(key, nextDirection);
    } else {
      setInternalSortDirection(nextDirection);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground flex min-h-24 items-center justify-center rounded-lg border border-dashed text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead
              key={column.key}
              className={cn(column.align === "right" && "text-right")}
            >
              {column.sortable ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  onClick={() => toggleSort(column.key)}
                >
                  {column.label}
                  {sortKey === column.key ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="size-3.5" />
                    ) : (
                      <ArrowDown className="size-3.5" />
                    )
                  ) : (
                    <ArrowUpDown className="size-3.5 opacity-40" />
                  )}
                </button>
              ) : (
                column.label
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedRows.map((row, index) => (
          <TableRow key={rowKey(row, index)}>
            {columns.map((column) => (
              <TableCell
                key={column.key}
                className={cn(column.align === "right" && "text-right")}
              >
                {column.render(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

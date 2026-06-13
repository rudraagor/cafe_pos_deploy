"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
  SortableColumn,
  SortableDataTable,
} from "@/components/reports/sortable-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/pos/pricing";
import { formatReportDateTime } from "@/lib/reports/range";

export type SessionListRow = {
  id: string;
  openedAt: string | Date;
  status: string;
  cashier: string | null;
  paidOrders: number;
  revenue: number;
  closingAmount: number | null;
};

const PAGE_SIZE = 15;

const columns: SortableColumn<SessionListRow>[] = [
  {
    key: "openedAt",
    label: "Opened",
    sortable: true,
    sortValue: (row) => new Date(row.openedAt),
    render: (row) => formatReportDateTime(row.openedAt),
  },
  {
    key: "cashier",
    label: "Cashier",
    sortable: true,
    sortValue: (row) => row.cashier ?? "",
    render: (row) => row.cashier ?? "Unknown",
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    sortValue: (row) => row.status,
    render: (row) => (
      <Badge variant={row.status === "open" ? "secondary" : "default"}>
        {row.status}
      </Badge>
    ),
  },
  {
    key: "paidOrders",
    label: "Paid orders",
    align: "right",
    sortable: true,
    sortValue: (row) => row.paidOrders,
    render: (row) => row.paidOrders,
  },
  {
    key: "revenue",
    label: "Revenue",
    align: "right",
    sortable: true,
    sortValue: (row) => row.revenue,
    render: (row) => formatMoney(row.revenue),
  },
  {
    key: "closingAmount",
    label: "Closing amount",
    align: "right",
    sortable: true,
    sortValue: (row) => row.closingAmount ?? -1,
    render: (row) =>
      row.closingAmount == null ? "Open" : formatMoney(row.closingAmount),
  },
  {
    key: "view",
    label: "",
    align: "right",
    render: (row) => (
      <Link
        href={`/admin/reports/sessions/${row.id}`}
        className="text-sm underline"
      >
        View
      </Link>
    ),
  },
];

function sortRows(
  rows: SessionListRow[],
  sortKey: string | null,
  sortDirection: "asc" | "desc",
) {
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
}

export function SessionListTable({ sessions }: { sessions: SessionListRow[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>("openedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return sessions;

    return sessions.filter((session) => {
      const openedLabel = formatReportDateTime(session.openedAt).toLowerCase();
      const cashier = (session.cashier ?? "unknown").toLowerCase();
      const status = session.status.toLowerCase();
      const paidOrders = String(session.paidOrders);
      const revenue = formatMoney(session.revenue).toLowerCase();
      const closing =
        session.closingAmount == null
          ? "open"
          : formatMoney(session.closingAmount).toLowerCase();

      return (
        cashier.includes(needle) ||
        status.includes(needle) ||
        openedLabel.includes(needle) ||
        paidOrders.includes(needle) ||
        revenue.includes(needle) ||
        closing.includes(needle)
      );
    });
  }, [sessions, query]);

  const sorted = useMemo(
    () => sortRows(filtered, sortKey, sortDirection),
    [filtered, sortKey, sortDirection],
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const pageRows = sorted.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const rangeStart = sorted.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, sorted.length);

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setPage(1);
        }}
        placeholder="Search by cashier, status, date, revenue…"
        className="max-w-md"
      />

      <div className="rounded-lg border">
        <SortableDataTable
          rows={pageRows}
          columns={columns}
          rowKey={(row) => row.id}
          emptyMessage={
            query.trim()
              ? "No sessions match your search."
              : "No sessions found."
          }
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={(key, direction) => {
            setSortKey(key);
            setSortDirection(direction);
            setPage(1);
          }}
        />
      </div>

      {sorted.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">
            Showing {rangeStart}–{rangeEnd} of {sorted.length}
            {query.trim() ? ` (filtered from ${sessions.length})` : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <span className="text-muted-foreground tabular-nums">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

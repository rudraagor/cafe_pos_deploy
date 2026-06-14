"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { DataTableShell } from "@/components/admin/data-table-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/pos/pricing";

const PAGE_SIZE = 12;

export type OrderRow = {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string | null;
  total: string;
  status: "unapproved" | "draft" | "paid" | "cancelled";
  kdsStage: "to_cook" | "preparing" | "completed";
  fulfillmentType: "dine_in" | "takeaway";
  tableNumber: number | null;
  tableLabel: string;
};

type StatusFilter = "all" | OrderRow["status"];

const statusVariant: Record<
  OrderRow["status"],
  "default" | "secondary" | "destructive"
> = {
  unapproved: "secondary",
  draft: "secondary",
  paid: "default",
  cancelled: "destructive",
};

const statusLabel: Record<OrderRow["status"], string> = {
  unapproved: "Needs approval",
  draft: "Unpaid",
  paid: "Paid",
  cancelled: "Cancelled",
};

const kitchenLabel: Record<OrderRow["kdsStage"], string> = {
  to_cook: "To cook",
  preparing: "Preparing",
  completed: "Done",
};

const kitchenVariant: Record<
  OrderRow["kdsStage"],
  "default" | "secondary" | "outline"
> = {
  to_cook: "outline",
  preparing: "secondary",
  completed: "default",
};

const filterOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unapproved", label: "Needs approval" },
  { value: "draft", label: "Unpaid" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];

export function OrdersTable({ orders }: { orders: OrderRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get("filter");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    initialFilter === "unapproved" ||
      initialFilter === "draft" ||
      initialFilter === "paid" ||
      initialFilter === "cancelled"
      ? initialFilter
      : "all",
  );
  const [page, setPage] = useState(1);

  const counts = useMemo(
    () => ({
      all: orders.length,
      unapproved: orders.filter((o) => o.status === "unapproved").length,
      draft: orders.filter((o) => o.status === "draft").length,
      paid: orders.filter((o) => o.status === "paid").length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
    }),
    [orders],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (!q) return true;
      return (
        order.orderNumber.toLowerCase().includes(q) ||
        (order.customerName?.toLowerCase().includes(q) ?? false) ||
        order.tableLabel.toLowerCase().includes(q) ||
        new Date(order.createdAt).toLocaleDateString().includes(q)
      );
    });
  }, [orders, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleFilterChange(value: StatusFilter) {
    setStatusFilter(value);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("filter");
    else params.set("filter", value);
    const query = params.toString();
    router.replace(query ? `/pos/orders?${query}` : "/pos/orders", {
      scroll: false,
    });
  }

  const pageRows = useMemo(
    () =>
      filtered.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
      ),
    [filtered, currentPage],
  );

  const firstRow = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(currentPage * PAGE_SIZE, filtered.length);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((option) => {
          const count =
            option.value === "all" ? counts.all : counts[option.value];
          return (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={statusFilter === option.value ? "default" : "outline"}
              onClick={() => handleFilterChange(option.value)}
              className="gap-1.5"
            >
              {option.label}
              {count > 0 ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] leading-none",
                    statusFilter === option.value
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                    option.value === "unapproved" &&
                      count > 0 &&
                      statusFilter !== option.value &&
                      "bg-amber-500/20 text-amber-800",
                  )}
                >
                  {count}
                </span>
              ) : null}
            </Button>
          );
        })}
      </div>

      <DataTableShell
        searchValue={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search order, customer, table..."
        empty={filtered.length === 0}
        emptyTitle={
          statusFilter === "unapproved"
            ? "No orders waiting for approval"
            : "No orders this session"
        }
        emptyDescription={
          statusFilter === "unapproved"
            ? "Guest QR submissions show up here for you to approve."
            : "Orders appear here after you send them to the kitchen."
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Kitchen</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((order) => (
              <TableRow
                key={order.id}
                onClick={() => router.push(`/pos/orders/${order.id}`)}
                className={cn(
                  "cursor-pointer",
                  order.status === "unapproved" && "bg-amber-500/5",
                )}
              >
                <TableCell>
                  <Link
                    href={`/pos/orders/${order.id}`}
                    className="font-medium hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {order.orderNumber}
                  </Link>
                </TableCell>
                <TableCell suppressHydrationWarning>
                  {new Date(order.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>{order.customerName ?? "—"}</TableCell>
                <TableCell>{order.tableLabel}</TableCell>
                <TableCell>{formatMoney(Number(order.total))}</TableCell>
                <TableCell>
                  {order.status === "unapproved" ? (
                    <span className="text-muted-foreground text-xs">—</span>
                  ) : (
                    <Badge variant={kitchenVariant[order.kdsStage]}>
                      {kitchenLabel[order.kdsStage]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[order.status]}>
                    {statusLabel[order.status]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filtered.length > 0 ? (
          <div className="flex items-center justify-between gap-4 pt-4 text-sm">
            <p className="text-muted-foreground">
              Showing {firstRow}–{lastRow} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
                Prev
              </Button>
              <span className="text-muted-foreground">
                Page {currentPage} of {pageCount}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </DataTableShell>
    </div>
  );
}

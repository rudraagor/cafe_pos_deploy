"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { formatMoney } from "@/lib/pos/pricing";

const PAGE_SIZE = 12;

export type OrderRow = {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string | null;
  total: string;
  status: "draft" | "paid" | "cancelled";
  kdsStage: "to_cook" | "preparing" | "completed";
  fulfillmentType: "dine_in" | "takeaway";
  tableNumber: number | null;
};

const statusVariant: Record<
  OrderRow["status"],
  "default" | "secondary" | "destructive"
> = {
  draft: "secondary",
  paid: "default",
  cancelled: "destructive",
};

const statusLabel: Record<OrderRow["status"], string> = {
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

export function OrdersTable({ orders }: { orders: OrderRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        (o.customerName?.toLowerCase().includes(q) ?? false) ||
        new Date(o.createdAt).toLocaleDateString().includes(q),
    );
  }, [orders, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
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
    <DataTableShell
      searchValue={search}
      onSearchChange={handleSearchChange}
      searchPlaceholder="Search order, customer, date..."
      empty={filtered.length === 0}
      emptyTitle="No orders this session"
      emptyDescription="Orders appear here after you send them to the kitchen."
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
            <TableHead>Payment</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.map((order) => (
            <TableRow
              key={order.id}
              onClick={() => router.push(`/pos/orders/${order.id}`)}
              className="cursor-pointer"
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
              <TableCell>
                {order.fulfillmentType === "takeaway"
                  ? "Takeaway"
                  : order.tableNumber != null
                    ? `T${order.tableNumber}`
                    : "—"}
              </TableCell>
              <TableCell>{formatMoney(Number(order.total))}</TableCell>
              <TableCell>
                <Badge variant={kitchenVariant[order.kdsStage]}>
                  {kitchenLabel[order.kdsStage]}
                </Badge>
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
  );
}

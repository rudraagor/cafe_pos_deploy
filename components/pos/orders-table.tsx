"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTableShell } from "@/components/admin/data-table-shell";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/pos/pricing";

export type OrderRow = {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string | null;
  total: string;
  status: "draft" | "paid" | "cancelled";
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

export function OrdersTable({ orders }: { orders: OrderRow[] }) {
  const [search, setSearch] = useState("");

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

  return (
    <DataTableShell
      searchValue={search}
      onSearchChange={setSearch}
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
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((order) => (
            <TableRow key={order.id}>
              <TableCell>
                <Link
                  href={`/pos/orders/${order.id}`}
                  className="font-medium hover:underline"
                >
                  {order.orderNumber}
                </Link>
              </TableCell>
              <TableCell>
                {new Date(order.createdAt).toLocaleString()}
              </TableCell>
              <TableCell>{order.customerName ?? "—"}</TableCell>
              <TableCell>
                {order.tableNumber != null ? `T${order.tableNumber}` : "—"}
              </TableCell>
              <TableCell>{formatMoney(Number(order.total))}</TableCell>
              <TableCell>
                <Badge variant={statusVariant[order.status]}>
                  {order.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableShell>
  );
}

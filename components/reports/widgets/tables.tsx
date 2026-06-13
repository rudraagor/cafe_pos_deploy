"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { searchMarketingCustomers } from "@/app/(dashboard)/admin/reports/marketing-actions";
import {
  CustomerNameButton,
  CustomerProfileDialog,
  SendCouponQuickAction,
} from "@/components/reports/customer-profile-dialog";
import {
  SortableColumn,
  SortableDataTable,
} from "@/components/reports/sortable-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/pos/pricing";
import { formatReportDateTime } from "@/lib/reports/range";
import type { ReportSearchParams } from "@/lib/reports/range";

export function TopProductsTableWidget({
  rows,
}: {
  rows: { product: string; quantity: number; revenue: number }[];
}) {
  const columns: SortableColumn<(typeof rows)[number]>[] = [
    {
      key: "product",
      label: "Product",
      render: (row) => row.product,
      sortValue: (row) => row.product,
      sortable: true,
    },
    {
      key: "quantity",
      label: "Qty",
      align: "right",
      sortable: true,
      sortValue: (row) => row.quantity,
      render: (row) => row.quantity,
    },
    {
      key: "revenue",
      label: "Revenue",
      align: "right",
      sortable: true,
      sortValue: (row) => row.revenue,
      render: (row) => formatMoney(row.revenue),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top products</CardTitle>
      </CardHeader>
      <CardContent>
        <SortableDataTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.product}
        />
      </CardContent>
    </Card>
  );
}

export function TopCategoriesTableWidget({
  rows,
}: {
  rows: { category: string; quantity: number; revenue: number }[];
}) {
  const columns: SortableColumn<(typeof rows)[number]>[] = [
    {
      key: "category",
      label: "Category",
      sortable: true,
      sortValue: (row) => row.category,
      render: (row) => row.category,
    },
    {
      key: "quantity",
      label: "Qty",
      align: "right",
      sortable: true,
      sortValue: (row) => row.quantity,
      render: (row) => row.quantity,
    },
    {
      key: "revenue",
      label: "Revenue",
      align: "right",
      sortable: true,
      sortValue: (row) => row.revenue,
      render: (row) => formatMoney(row.revenue),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top categories</CardTitle>
      </CardHeader>
      <CardContent>
        <SortableDataTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.category}
        />
      </CardContent>
    </Card>
  );
}

export function TopOrdersTableWidget({
  rows,
  params,
}: {
  rows: {
    id: string;
    orderNumber: string;
    customerId: string | null;
    customer: string;
    employee: string;
    tableNumber: number | null;
    paidAt: Date;
    total: number;
  }[];
  params: ReportSearchParams;
}) {
  const [profileCustomerId, setProfileCustomerId] = useState<string | null>(null);

  const columns: SortableColumn<(typeof rows)[number]>[] = [
    {
      key: "orderNumber",
      label: "Order",
      sortable: true,
      sortValue: (row) => row.orderNumber,
      render: (row) => row.orderNumber,
    },
    {
      key: "customer",
      label: "Customer",
      sortable: true,
      sortValue: (row) => row.customer,
      render: (row) => (
        <CustomerNameButton
          customerId={row.customerId}
          name={row.customer}
          onClick={setProfileCustomerId}
        />
      ),
    },
    {
      key: "employee",
      label: "Employee",
      sortable: true,
      sortValue: (row) => row.employee,
      render: (row) => row.employee,
    },
    {
      key: "paidAt",
      label: "Paid at",
      sortable: true,
      sortValue: (row) => row.paidAt,
      render: (row) => formatReportDateTime(row.paidAt),
    },
    {
      key: "total",
      label: "Amount",
      align: "right",
      sortable: true,
      sortValue: (row) => row.total,
      render: (row) => formatMoney(row.total),
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Top orders</CardTitle>
        </CardHeader>
        <CardContent>
          <SortableDataTable
            rows={rows}
            columns={columns}
            rowKey={(row) => row.id}
          />
        </CardContent>
      </Card>
      <CustomerProfileDialog
        customerId={profileCustomerId}
        open={!!profileCustomerId}
        onOpenChange={(open) => !open && setProfileCustomerId(null)}
        params={params}
      />
    </>
  );
}

export function SessionsLinkWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Session reports</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Review cashier Z-reports with opening float, closing amount, paid
          orders, payment mix, discounts, and tax.
        </p>
        <Link href="/admin/reports/sessions" className="text-sm underline">
          Open session reports
        </Link>
      </CardContent>
    </Card>
  );
}

type MarketingCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  orderCount: number;
  totalSpend: number;
  lastOrderAt: string | null;
};

const MARKETING_PAGE_SIZE = 10;

function sortMarketingRows(
  rows: MarketingCustomer[],
  columns: SortableColumn<MarketingCustomer>[],
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

export function MarketingWidget({ params }: { params: ReportSearchParams }) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<MarketingCustomer[]>([]);
  const [profileCustomerId, setProfileCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>("spend");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  async function search(nextQuery = query) {
    setLoading(true);
    try {
      const result = await searchMarketingCustomers(
        nextQuery,
        JSON.parse(paramsKey) as ReportSearchParams,
      );
      if (result.ok) {
        setRows(result.rows);
        setPage(1);
        if (result.rows.length === 0) {
          toast.message("No customers matched your search.");
        }
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Could not search customers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      try {
        const result = await searchMarketingCustomers(
          "",
          JSON.parse(paramsKey) as ReportSearchParams,
        );
        if (cancelled) return;
        if (result.ok) {
          setRows(result.rows);
          setPage(1);
        } else {
          toast.error(result.error);
        }
      } catch {
        if (!cancelled) toast.error("Could not load customers.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [paramsKey]);

  const columns: SortableColumn<MarketingCustomer>[] = useMemo(
    () => [
      {
        key: "name",
        label: "Name",
        sortable: true,
        sortValue: (row) => row.name,
        render: (row) => (
          <CustomerNameButton
            customerId={row.id}
            name={row.name}
            onClick={setProfileCustomerId}
          />
        ),
      },
      {
        key: "email",
        label: "Email",
        sortable: true,
        sortValue: (row) => row.email ?? "",
        render: (row) => row.email ?? "—",
      },
      {
        key: "orders",
        label: "Orders",
        align: "right",
        sortable: true,
        sortValue: (row) => row.orderCount,
        render: (row) => row.orderCount,
      },
      {
        key: "spend",
        label: "Spend",
        align: "right",
        sortable: true,
        sortValue: (row) => row.totalSpend,
        render: (row) => formatMoney(row.totalSpend),
      },
      {
        key: "actions",
        label: "Actions",
        render: (row) => (
          <SendCouponQuickAction customerId={row.id} customerName={row.name} />
        ),
      },
    ],
    [],
  );

  const sortedRows = useMemo(
    () => sortMarketingRows(rows, columns, sortKey, sortDirection),
    [rows, columns, sortKey, sortDirection],
  );

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / MARKETING_PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const pageRows = sortedRows.slice(
    (currentPage - 1) * MARKETING_PAGE_SIZE,
    currentPage * MARKETING_PAGE_SIZE,
  );
  const rangeStart =
    sortedRows.length === 0 ? 0 : (currentPage - 1) * MARKETING_PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * MARKETING_PAGE_SIZE, sortedRows.length);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Customer marketing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              search();
            }}
          >
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search customers by name, email, or phone"
            />
            <button
              type="submit"
              className="border-input hover:bg-muted rounded-md border px-3 text-sm"
              disabled={loading}
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </form>
          <SortableDataTable
            rows={pageRows}
            columns={columns}
            rowKey={(row) => row.id}
            emptyMessage={
              loading
                ? "Loading customers…"
                : "No customers found for this search and filter range."
            }
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortChange={(key, direction) => {
              setSortKey(key);
              setSortDirection(direction);
              setPage(1);
            }}
          />
          {sortedRows.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="text-muted-foreground">
                Showing {rangeStart}–{rangeEnd} of {sortedRows.length}
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
                  onClick={() =>
                    setPage((value) => Math.min(totalPages, value + 1))
                  }
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <CustomerProfileDialog
        customerId={profileCustomerId}
        open={!!profileCustomerId}
        onOpenChange={(open) => !open && setProfileCustomerId(null)}
        params={params}
      />
    </>
  );
}

export function LiveFloorWidget({
  floors,
  sessionOpen,
  params,
}: {
  floors: {
    orderId: string;
    orderNumber: string;
    status: string;
    kdsStage: string;
    total: number;
    tableNumber: number;
    floorName: string;
    tableLabel: string;
    customerId: string | null;
    customerName: string;
  }[];
  sessionOpen: boolean;
  params: ReportSearchParams;
}) {
  const [profileCustomerId, setProfileCustomerId] = useState<string | null>(null);

  const columns: SortableColumn<(typeof floors)[number]>[] = [
    {
      key: "table",
      label: "Table",
      sortable: true,
      sortValue: (row) => row.tableLabel,
      render: (row) => row.tableLabel,
    },
    {
      key: "customer",
      label: "Customer",
      sortable: true,
      sortValue: (row) => row.customerName,
      render: (row) => (
        <CustomerNameButton
          customerId={row.customerId}
          name={row.customerName}
          onClick={setProfileCustomerId}
        />
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      sortValue: (row) => row.status,
      render: (row) => `${row.status} / ${row.kdsStage}`,
    },
    {
      key: "total",
      label: "Order total",
      align: "right",
      sortable: true,
      sortValue: (row) => row.total,
      render: (row) => formatMoney(row.total),
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Live floor</CardTitle>
        </CardHeader>
        <CardContent>
          <SortableDataTable
            rows={floors}
            columns={columns}
            rowKey={(row) => row.orderId}
            emptyMessage={
              sessionOpen
                ? "All tables are free in the open session."
                : "No POS session is currently open."
            }
          />
        </CardContent>
      </Card>
      <CustomerProfileDialog
        customerId={profileCustomerId}
        open={!!profileCustomerId}
        onOpenChange={(open) => !open && setProfileCustomerId(null)}
        params={params}
      />
    </>
  );
}

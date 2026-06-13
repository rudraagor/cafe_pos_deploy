"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { searchMarketingCustomers } from "@/app/(admin)/admin/reports/marketing-actions";
import {
  CustomerNameButton,
  CustomerProfileDialog,
  SendCouponQuickAction,
} from "@/components/reports/customer-profile-dialog";
import {
  SortableColumn,
  SortableDataTable,
} from "@/components/reports/sortable-table";
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

export function MarketingWidget({ params }: { params: ReportSearchParams }) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<MarketingCustomer[]>([]);
  const [profileCustomerId, setProfileCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
            rows={rows}
            columns={columns}
            rowKey={(row) => row.id}
            emptyMessage={
              loading
                ? "Loading customers…"
                : "No customers found for this search and filter range."
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
      sortValue: (row) => row.tableNumber,
      render: (row) => `${row.floorName} · T${row.tableNumber}`,
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

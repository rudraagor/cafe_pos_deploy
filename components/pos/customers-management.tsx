"use client";

import { useMemo, useState } from "react";
import {
  createCustomer,
  deleteCustomer,
  updateCustomer,
} from "@/app/(dashboard)/pos/actions";
import { DeleteButton } from "@/components/admin/delete-button";
import { DataTableShell } from "@/components/admin/data-table-shell";
import {
  paginateRows,
  TablePagination,
} from "@/components/admin/table-pagination";
import { PageHeader } from "@/components/admin/page-header";
import { CustomerFormDialog } from "@/components/pos/customer-form-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 10;

export type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export function CustomersManagement({
  customers,
}: {
  customers: CustomerRow[];
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.phone?.includes(q) ?? false),
    );
  }, [customers, search]);

  const { pageRows, currentPage } = paginateRows(filtered, page, PAGE_SIZE);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Customers"
        description="Manage cafe customers for order assignment and receipts."
      />
      <DataTableShell
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="Search customers..."
        toolbarActions={
          <CustomerFormDialog mode="create" action={createCustomer} />
        }
        empty={filtered.length === 0}
        emptyTitle="No customers yet"
        emptyDescription="Add a customer to assign them to orders."
        footer={
          <TablePagination
            page={currentPage}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPageChange={setPage}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{customer.email ?? "—"}</TableCell>
                <TableCell>{customer.phone ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <CustomerFormDialog
                      mode="edit"
                      customer={{
                        name: customer.name,
                        email: customer.email ?? "",
                        phone: customer.phone ?? "",
                      }}
                      action={(fd) => updateCustomer(customer.id, fd)}
                    />
                    <DeleteButton
                      itemName={customer.name}
                      action={() => deleteCustomer(customer.id)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>
    </div>
  );
}

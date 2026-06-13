"use client";

import { useMemo, useState } from "react";
import { DataTableShell } from "@/components/admin/data-table-shell";
import { DeleteButton } from "@/components/admin/delete-button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteProduct, updateProduct } from "./actions";
import {
  ProductFormDialog,
  type ProductCategoryOption,
  type ProductFormValue,
} from "./product-form-dialog";

export type ProductRow = ProductFormValue & {
  id: string;
  categoryName: string | null;
  categoryColor: string | null;
};

type ProductTableProps = {
  rows: ProductRow[];
  categories: ProductCategoryOption[];
};

function formatMoney(value: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function ProductTable({ rows, categories }: ProductTableProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = useMemo(
    () =>
      normalizedQuery
        ? rows.filter((row) =>
            [row.name, row.categoryName ?? "", row.description]
              .join(" ")
              .toLowerCase()
              .includes(normalizedQuery),
          )
        : rows,
    [normalizedQuery, rows],
  );

  return (
    <DataTableShell
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder="Search products..."
      empty={filteredRows.length === 0}
      emptyTitle={rows.length === 0 ? "No products yet" : "No products found"}
      emptyDescription={
        rows.length === 0
          ? "Create menu items for the POS terminal."
          : "Try another product or category."
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead className="text-right">Tax</TableHead>
            <TableHead>KDS</TableHead>
            <TableHead className="w-24 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div className="font-medium">{row.name}</div>
                {row.description ? (
                  <div className="text-muted-foreground max-w-xs truncate text-xs">
                    {row.description}
                  </div>
                ) : null}
              </TableCell>
              <TableCell>
                {row.categoryName ? (
                  <Badge variant="outline" className="gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{
                        backgroundColor: row.categoryColor ?? "#64748b",
                      }}
                    />
                    {row.categoryName}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">
                    Uncategorized
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(row.price)}
              </TableCell>
              <TableCell>{row.unitOfMeasure}</TableCell>
              <TableCell className="text-right tabular-nums">
                {row.taxRate}%
              </TableCell>
              <TableCell>
                <Badge variant={row.isKitchenItem ? "secondary" : "outline"}>
                  {row.isKitchenItem ? "Kitchen" : "Counter"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <ProductFormDialog
                    mode="edit"
                    product={row}
                    categories={categories}
                    action={updateProduct.bind(null, row.id)}
                  />
                  <DeleteButton
                    itemName={row.name}
                    title="Delete product?"
                    description={`${row.name} will be removed from the POS menu. Existing historical order lines keep their snapshots.`}
                    action={deleteProduct.bind(null, row.id)}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableShell>
  );
}

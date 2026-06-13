"use client";

import type { ReactNode } from "react";
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
import { CategoryFormDialog } from "./category-form-dialog";
import { deleteCategory, updateCategory } from "./actions";

export type CategoryRow = {
  id: string;
  name: string;
  color: string;
  productCount: number;
};

type CategoryTableProps = {
  rows: CategoryRow[];
  usedColors: string[];
  toolbarActions?: ReactNode;
};

export function CategoryTable({
  rows,
  usedColors,
  toolbarActions,
}: CategoryTableProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = useMemo(
    () =>
      normalizedQuery
        ? rows.filter((row) => row.name.toLowerCase().includes(normalizedQuery))
        : rows,
    [normalizedQuery, rows],
  );

  return (
    <DataTableShell
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder="Search categories..."
      toolbarActions={toolbarActions}
      empty={filteredRows.length === 0}
      emptyTitle={
        rows.length === 0 ? "No categories yet" : "No categories found"
      }
      emptyDescription={
        rows.length === 0
          ? "Create the first product category to start shaping the POS menu."
          : "Try a different search term."
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Color</TableHead>
            <TableHead className="text-right">Products</TableHead>
            <TableHead className="w-24 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell>
                <Badge variant="outline" className="gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="font-mono text-xs">{row.color}</span>
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.productCount}
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <CategoryFormDialog
                    mode="edit"
                    category={{ name: row.name, color: row.color }}
                    action={updateCategory.bind(null, row.id)}
                    usedColors={usedColors}
                  />
                  <DeleteButton
                    itemName={row.name}
                    action={deleteCategory.bind(null, row.id)}
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

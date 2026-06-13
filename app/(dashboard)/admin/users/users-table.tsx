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
import {
  archiveUser,
  changeUserPassword,
  deleteUser,
  restoreUser,
  updateUserAccount,
} from "./actions";
import { PasswordDialog } from "./password-dialog";
import { UserFormDialog, type UserFormValue } from "./user-form-dialog";
import { UserStatusButton } from "./user-status-button";

export type UserRow = Omit<UserFormValue, "password"> & {
  id: string;
  archived: boolean;
  current: boolean;
};

type UsersTableProps = {
  rows: UserRow[];
  toolbarActions?: ReactNode;
};

export function UsersTable({ rows, toolbarActions }: UsersTableProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = useMemo(
    () =>
      normalizedQuery
        ? rows.filter((row) =>
            [row.name, row.email, row.role]
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
      searchPlaceholder="Search users..."
      toolbarActions={toolbarActions}
      empty={filteredRows.length === 0}
      emptyTitle={rows.length === 0 ? "No users yet" : "No users found"}
      emptyDescription={
        rows.length === 0
          ? "Create admin and employee accounts."
          : "Try another name or email."
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-32 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">
                {row.name}
                {row.current ? (
                  <span className="text-muted-foreground ml-2 text-xs">
                    You
                  </span>
                ) : null}
              </TableCell>
              <TableCell>{row.email}</TableCell>
              <TableCell>
                <Badge variant={row.role === "admin" ? "secondary" : "outline"}>
                  {row.role === "admin" ? "Admin" : "Employee"}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={row.archived ? "outline" : "secondary"}>
                  {row.archived ? "Archived" : "Active"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <UserFormDialog
                    mode="edit"
                    user={row}
                    action={updateUserAccount.bind(null, row.id)}
                  />
                  <PasswordDialog
                    userName={row.name}
                    action={changeUserPassword.bind(null, row.id)}
                  />
                  {!row.current ? (
                    <>
                      <UserStatusButton
                        userName={row.name}
                        archived={row.archived}
                        action={
                          row.archived
                            ? restoreUser.bind(null, row.id)
                            : archiveUser.bind(null, row.id)
                        }
                      />
                      <DeleteButton
                        itemName={row.name}
                        title="Delete user?"
                        description={`${row.name} will be permanently removed if they are not linked to historical records.`}
                        action={deleteUser.bind(null, row.id)}
                      />
                    </>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableShell>
  );
}

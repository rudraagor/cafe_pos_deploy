"use client";

import { Armchair } from "lucide-react";
import { DeleteButton } from "@/components/admin/delete-button";
import { Badge } from "@/components/ui/badge";
import {
  createTable,
  deleteFloor,
  deleteTable,
  updateFloor,
  updateTable,
} from "./actions";
import { FloorFormDialog } from "./floor-form-dialog";
import {
  TableFormDialog,
  type FloorOption,
  type TableFormValue,
} from "./table-form-dialog";

export type BookingFloor = FloorOption & {
  tables: Array<{
    id: string;
    number: number;
    seats: number;
    active: boolean;
  }>;
};

type BookingManagementProps = {
  floors: BookingFloor[];
};

export function BookingManagement({ floors }: BookingManagementProps) {
  const floorOptions: FloorOption[] = floors.map(({ id, name }) => ({
    id,
    name,
  }));

  if (floors.length === 0) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
        <Armchair className="text-muted-foreground size-8" />
        <div>
          <p className="font-medium">No floors yet</p>
          <p className="text-muted-foreground text-sm">
            Add a floor first, then place tables inside it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {floors.map((floor) => (
        <section key={floor.id} className="space-y-3 rounded-lg border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{floor.name}</h2>
              <p className="text-muted-foreground text-sm">
                {floor.tables.length} table
                {floor.tables.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TableFormDialog
                mode="create"
                floors={floorOptions}
                table={{
                  floorId: floor.id,
                  number: "",
                  seats: "4",
                  active: true,
                }}
                action={createTable}
              />
              <FloorFormDialog
                mode="edit"
                floor={{ name: floor.name }}
                action={updateFloor.bind(null, floor.id)}
              />
              <DeleteButton
                itemName={floor.name}
                title="Delete floor?"
                description={`${floor.name} and all of its tables will be removed.`}
                action={deleteFloor.bind(null, floor.id)}
              />
            </div>
          </div>

          {floor.tables.length === 0 ? (
            <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
              No tables on this floor yet.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {floor.tables.map((table) => {
                const tableValue: TableFormValue = {
                  floorId: floor.id,
                  number: String(table.number),
                  seats: String(table.seats),
                  active: table.active,
                };

                return (
                  <div
                    key={table.id}
                    className="bg-card flex min-h-32 flex-col justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-2xl font-semibold tabular-nums">
                          T{table.number}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {table.seats} seats
                        </p>
                      </div>
                      <Badge variant={table.active ? "secondary" : "outline"}>
                        {table.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex justify-end gap-1">
                      <TableFormDialog
                        mode="edit"
                        floors={floorOptions}
                        table={tableValue}
                        action={updateTable.bind(null, table.id)}
                      />
                      <DeleteButton
                        itemName={`T${table.number}`}
                        title="Delete table?"
                        description={`Table ${table.number} will be removed from ${floor.name}.`}
                        action={deleteTable.bind(null, table.id)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

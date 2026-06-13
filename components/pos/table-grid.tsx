"use client";

import { useRouter } from "next/navigation";
import type { TableOccupancy } from "@/lib/pos/queries";
import { useKdsStream } from "@/lib/realtime/use-kds-stream";
import { cn } from "@/lib/utils";

export type FloorWithTables = {
  id: string;
  name: string;
  tables: {
    id: string;
    number: number;
    seats: number;
    active: boolean;
  }[];
};

type TableGridProps = {
  floors: FloorWithTables[];
  occupiedTableIds: string[];
  occupiedOrdersByTable?: Record<string, TableOccupancy>;
  onSelectTable?: (tableId: string) => void;
  selectedTableIds?: string[];
  onToggleTable?: (tableId: string) => void;
  linkPrefix?: string;
};

export function TableGrid({
  floors,
  occupiedTableIds,
  occupiedOrdersByTable = {},
  onSelectTable,
  selectedTableIds = [],
  onToggleTable,
  linkPrefix = "/pos?table=",
}: TableGridProps) {
  const router = useRouter();
  useKdsStream();
  const occupied = new Set(occupiedTableIds);
  const selected = new Set(selectedTableIds);

  function handleSelect(tableId: string) {
    const occupancy = occupiedOrdersByTable[tableId];
    if (occupancy?.kind === "order") {
      router.push(`/pos/orders/${occupancy.orderId}`);
      return;
    }
    if (occupancy?.kind === "reservation") {
      router.push(
        `/pos?table=${occupancy.primaryTableId}&tables=${occupancy.tableIds.join(",")}&reservation=${occupancy.reservationId}`,
      );
      return;
    }
    if (onToggleTable) {
      onToggleTable(tableId);
      return;
    }
    if (onSelectTable) {
      onSelectTable(tableId);
      return;
    }
    router.push(`${linkPrefix}${tableId}`);
  }

  if (floors.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No floors or tables configured. Add them in Admin → Booking.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {floors.map((floor) => (
        <div key={floor.id}>
          <h3 className="mb-3 text-sm font-semibold">{floor.name}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {floor.tables.map((table) => {
              const isOccupied = occupied.has(table.id);
              const occupancy = occupiedOrdersByTable[table.id];
              const isSelected = selected.has(table.id);
              return (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => handleSelect(table.id)}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border-2 p-4 transition-colors",
                    isOccupied
                      ? occupancy?.kind === "reservation"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                        : "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                      : isSelected
                        ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary hover:bg-muted/50",
                  )}
                >
                  <span className="text-2xl font-bold">{table.number}</span>
                  <span className="text-muted-foreground text-xs">
                    {table.seats} seats
                  </span>
                  {isOccupied ? (
                    <span
                      className={cn(
                        "mt-1 text-[10px] font-medium",
                        occupancy?.kind === "reservation"
                          ? "text-blue-600"
                          : "text-amber-600",
                      )}
                    >
                      {occupancy?.kind === "reservation"
                        ? `Reserved: ${occupancy.customerName}`
                        : "View order"}
                    </span>
                  ) : isSelected ? (
                    <span className="text-primary mt-1 text-[10px] font-medium">
                      Selected
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

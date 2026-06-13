"use client";

import { useRouter } from "next/navigation";
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
  onSelectTable?: (tableId: string) => void;
  linkPrefix?: string;
};

export function TableGrid({
  floors,
  occupiedTableIds,
  onSelectTable,
  linkPrefix = "/pos?table=",
}: TableGridProps) {
  const router = useRouter();
  const occupied = new Set(occupiedTableIds);

  function handleSelect(tableId: string) {
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
              return (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => handleSelect(table.id)}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border-2 p-4 transition-colors",
                    isOccupied
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                      : "border-border hover:border-primary hover:bg-muted/50",
                  )}
                >
                  <span className="text-2xl font-bold">{table.number}</span>
                  <span className="text-muted-foreground text-xs">
                    {table.seats} seats
                  </span>
                  {isOccupied ? (
                    <span className="mt-1 text-[10px] font-medium text-amber-600">
                      Occupied
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

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { TableOccupancy } from "@/lib/pos/queries";
import { TableGrid, type FloorWithTables } from "./table-grid";

type FloorPopupProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  floors: FloorWithTables[];
  occupiedTableIds: string[];
  occupiedOrdersByTable?: Record<string, TableOccupancy>;
};

export function FloorPopup({
  open,
  onOpenChange,
  floors,
  occupiedTableIds,
  occupiedOrdersByTable,
}: FloorPopupProps) {
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);

  function toggleTable(tableId: string) {
    setSelectedTableIds((current) =>
      current.includes(tableId)
        ? current.filter((id) => id !== tableId)
        : [...current, tableId],
    );
  }

  function startOrder() {
    const [primary] = selectedTableIds;
    if (!primary) return;
    onOpenChange(false);
    window.location.href = `/pos?table=${primary}&tables=${selectedTableIds.join(",")}`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select tables</DialogTitle>
          <DialogDescription>
            Choose one primary table and any extra tables to reserve for this
            order.
          </DialogDescription>
        </DialogHeader>
        <TableGrid
          floors={floors}
          occupiedTableIds={occupiedTableIds}
          occupiedOrdersByTable={occupiedOrdersByTable}
          selectedTableIds={selectedTableIds}
          onToggleTable={toggleTable}
        />
        <DialogFooter className="items-center gap-3 sm:justify-between">
          <p className="text-muted-foreground text-sm">
            {selectedTableIds.length
              ? `${selectedTableIds.length} table${selectedTableIds.length === 1 ? "" : "s"} selected`
              : "No tables selected"}
          </p>
          <Button
            type="button"
            onClick={startOrder}
            disabled={selectedTableIds.length === 0}
          >
            Start Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

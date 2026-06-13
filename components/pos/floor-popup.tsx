"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TableGrid, type FloorWithTables } from "./table-grid";

type FloorPopupProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  floors: FloorWithTables[];
  occupiedTableIds: string[];
};

export function FloorPopup({
  open,
  onOpenChange,
  floors,
  occupiedTableIds,
}: FloorPopupProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select a table</DialogTitle>
          <DialogDescription>
            Choose a table to start or continue an order.
          </DialogDescription>
        </DialogHeader>
        <TableGrid
          floors={floors}
          occupiedTableIds={occupiedTableIds}
          onSelectTable={(tableId) => {
            onOpenChange(false);
            window.location.href = `/pos?table=${tableId}`;
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

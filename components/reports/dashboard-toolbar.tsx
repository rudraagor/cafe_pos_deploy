"use client";

import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { WIDGET_CATALOG, type DashboardLayout } from "@/lib/reports/widgets";

export function DashboardToolbar({
  layout,
  onToggle,
  onMove,
  onReset,
}: {
  layout: DashboardLayout;
  onToggle: (id: DashboardLayout["widgets"][number]["id"]) => void;
  onMove: (id: DashboardLayout["widgets"][number]["id"], direction: -1 | 1) => void;
  onReset: () => void;
}) {
  const ordered = [...layout.widgets].sort((a, b) => a.order - b.order);

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Settings2 className="size-4" />
        Customize
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Customize dashboard</DialogTitle>
          <DialogDescription>
            Show, hide, and reorder widgets. Layout is saved in this browser.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {ordered.map((entry) => {
            const meta = WIDGET_CATALOG.find((widget) => widget.id === entry.id);
            return (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <label className="flex flex-1 items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={entry.visible}
                    onChange={() => onToggle(entry.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">{meta?.label ?? entry.id}</span>
                    <span className="text-muted-foreground block text-xs">
                      {meta?.description}
                    </span>
                  </span>
                </label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onMove(entry.id, -1)}
                  >
                    Up
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onMove(entry.id, 1)}
                  >
                    Down
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onReset}>
            Reset layout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

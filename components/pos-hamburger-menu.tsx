"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BarChart3, LogOut, Menu } from "lucide-react";
import { toast } from "sonner";
import { logout } from "@/app/(auth)/actions";
import { closeSession } from "@/app/(dashboard)/pos/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatMoney } from "@/lib/pos/pricing";
import { cn } from "@/lib/utils";

type CloseSummary = {
  totalOrders: number;
  closingAmount: number;
  openedAt: Date;
  closedAt: Date;
};

export function PosHamburgerMenu({
  isAdmin = false,
  collapsed = false,
  variant = "sidebar",
}: {
  isAdmin?: boolean;
  collapsed?: boolean;
  variant?: "sidebar" | "header";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [summary, setSummary] = useState<CloseSummary | null>(null);

  function handleCloseSession() {
    startTransition(async () => {
      const result = await closeSession();
      if (result.ok) {
        if (result.summary) setSummary(result.summary);
        toast.success(result.message ?? "Session closed.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "rounded-lg transition-colors",
            variant === "header"
              ? "text-foreground/70 hover:bg-muted hover:text-foreground p-2"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed ? "p-2" : variant === "sidebar" ? "w-full p-1.5" : "p-2",
          )}
          aria-label="POS session menu"
          title="Session menu"
        >
          <Menu className={cn("mx-auto", collapsed ? "size-5" : "size-5")} />
          {!collapsed ? (
            <span className="sr-only">Session menu</span>
          ) : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={collapsed ? "start" : "end"}
          side={collapsed ? "right" : "top"}
          className="w-56"
        >
          <DropdownMenuItem onClick={handleCloseSession} disabled={isPending}>
            Close session
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => logout()}>Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!summary} onOpenChange={(open) => !open && setSummary(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Session closed</DialogTitle>
            <DialogDescription>
              Review the closing totals before starting the next shift.
            </DialogDescription>
          </DialogHeader>
          {summary ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryTile label="Orders" value={String(summary.totalOrders)} />
              <SummaryTile
                label="Closing sales"
                value={formatMoney(summary.closingAmount)}
              />
              <SummaryTile
                label="Opened"
                value={new Date(summary.openedAt).toLocaleString()}
              />
              <SummaryTile
                label="Closed"
                value={new Date(summary.closedAt).toLocaleString()}
              />
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:justify-between">
            {isAdmin ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSummary(null);
                  router.push("/admin/reports");
                }}
              >
                <BarChart3 className="size-4" />
                View reports
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSummary(null)}
              >
                Back to POS
              </Button>
              <Button type="button" onClick={() => logout()}>
                <LogOut className="size-4" />
                Log out
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

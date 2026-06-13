"use client";

import { Check, CheckCircle2, Clock, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  advanceTicket,
  recallTicket,
  toggleItemCompleted,
} from "@/app/kds/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { KdsTicket } from "./types";

type TicketCardProps = {
  ticket: KdsTicket;
};

export function TicketCard({ ticket }: TicketCardProps) {
  const [now, setNow] = useState(() => Date.now());
  const [isPending, startTransition] = useTransition();
  const sentAt = useMemo(
    () => new Date(ticket.sentToKitchenAt).getTime(),
    [ticket.sentToKitchenAt],
  );
  const ageMinutes = Math.max(0, Math.floor((now - sentAt) / 60000));
  const ageTone =
    ageMinutes >= 10 ? "red" : ageMinutes >= 5 ? "amber" : "green";

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  function runAction(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(result.error ?? "KDS action failed.");
    });
  }

  const primaryLabel =
    ticket.stage === "to_cook"
      ? "Start"
      : ticket.stage === "preparing"
        ? "Mark Ready"
        : "Recall";
  const primaryIcon =
    ticket.stage === "completed" ? (
      <RotateCcw className="size-4" />
    ) : (
      <CheckCircle2 className="size-4" />
    );

  return (
    <article
      className={cn(
        "rounded-lg border bg-background p-3 shadow-sm",
        ageTone === "green" && "border-emerald-500/50",
        ageTone === "amber" && "border-amber-500/70",
        ageTone === "red" && "border-red-500/80",
      )}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{ticket.orderNumber}</h3>
          <p className="text-sm text-muted-foreground">{ticket.tableLabel}</p>
        </div>
        <div
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold",
            ageTone === "green" && "bg-emerald-500/15 text-emerald-300",
            ageTone === "amber" && "bg-amber-500/15 text-amber-300",
            ageTone === "red" && "bg-red-500/15 text-red-300",
          )}
        >
          <Clock className="size-3" />
          {ageMinutes}m
        </div>
      </header>

      <div className="space-y-2">
        {ticket.items.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={isPending}
            onClick={() => runAction(() => toggleItemCompleted(item.id))}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition",
              item.itemCompleted
                ? "border-emerald-500/40 bg-emerald-500/10 text-muted-foreground line-through"
                : "border-border bg-card hover:bg-muted/40",
            )}
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-md border",
                item.itemCompleted
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-muted-foreground/40",
              )}
            >
              {item.itemCompleted ? <Check className="size-4" /> : null}
            </span>
            <span className="min-w-0 flex-1 font-medium">
              {item.quantity} x {item.nameSnapshot}
            </span>
          </button>
        ))}
      </div>

      <Button
        type="button"
        className="mt-3 w-full"
        variant={ticket.stage === "completed" ? "outline" : "default"}
        disabled={isPending}
        onClick={() =>
          runAction(() =>
            ticket.stage === "completed"
              ? recallTicket(ticket.id)
              : advanceTicket(ticket.id),
          )
        }
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : primaryIcon}
        {primaryLabel}
      </Button>
    </article>
  );
}

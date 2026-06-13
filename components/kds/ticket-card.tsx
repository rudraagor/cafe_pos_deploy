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
import { ticketAgeMinutes } from "@/lib/kds/ticket-age";
import { modifierLabel } from "@/lib/pos/modifiers";
import { cn } from "@/lib/utils";
import type { KdsTicket } from "./types";

type TicketCardProps = {
  ticket: KdsTicket;
};

export function TicketCard({ ticket }: TicketCardProps) {
  const [isPending, startTransition] = useTransition();
  const sentAt = useMemo(
    () => new Date(ticket.sentToKitchenAt).getTime(),
    [ticket.sentToKitchenAt],
  );
  const [now, setNow] = useState(() => Date.now());
  const ageMinutes = ticketAgeMinutes(sentAt, now);
  const ageTone =
    ticket.stage === "completed"
      ? "blue"
      : ageMinutes >= 10
        ? "red"
        : ageMinutes >= 5
          ? "amber"
          : "green";

  useEffect(() => {
    const syncNow = () => setNow(Date.now());
    const timeout = window.setTimeout(syncNow, 0);
    const interval = window.setInterval(syncNow, 15000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [sentAt]);

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
        ageTone === "blue" && "border-blue-500/80 bg-blue-500/5",
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
            ageTone === "green" &&
              "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
            ageTone === "amber" &&
              "bg-amber-500/15 text-amber-700 dark:text-amber-300",
            ageTone === "red" &&
              "bg-red-500/15 text-red-700 dark:text-red-300",
            ageTone === "blue" &&
              "bg-blue-500/15 text-blue-700 dark:text-blue-300",
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
                : item.modifiers.length > 0 || item.note
                  ? "border-amber-500/70 bg-amber-500/10 hover:bg-amber-500/15"
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
            <span className="min-w-0 flex-1">
              <span className="block font-medium">
                {item.quantity} x {item.nameSnapshot}
              </span>
              {item.modifiers.length > 0 ? (
                <span className="mt-1 flex flex-wrap gap-1">
                  {item.modifiers.map((modifier) => (
                    <span
                      key={modifier}
                      className="rounded-full bg-amber-500/25 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-100"
                    >
                      {modifierLabel(modifier)}
                    </span>
                  ))}
                </span>
              ) : null}
              {item.note ? (
                <span className="mt-1 block text-xs font-bold text-amber-800 dark:text-amber-100">
                  {item.note}
                </span>
              ) : null}
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

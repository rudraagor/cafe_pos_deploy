"use client";

import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PromotionCatalogItem } from "@/lib/pos/promotion-display";
import { cn } from "@/lib/utils";

type PromotionsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: PromotionCatalogItem[];
  variant?: "staff" | "guest";
};

export function PromotionsModal({
  open,
  onOpenChange,
  items,
  variant = "staff",
}: PromotionsModalProps) {
  const liveItems = items.filter((item) => item.isActiveNow);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="space-y-1 border-b px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-amber-600" />
            {variant === "guest" ? "Today’s offers" : "Active promotions"}
          </DialogTitle>
          <DialogDescription>
            {variant === "guest"
              ? "These deals apply automatically when you order — no code needed."
              : "Share these with guests. Promotions apply automatically at checkout."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {liveItems.length > 0 ? (
            <p className="mb-3 text-xs font-medium text-amber-700">
              {liveItems.length} running right now
            </p>
          ) : (
            <p className="mb-3 text-xs text-muted-foreground">
              No time-limited offers are live this minute — browse upcoming deals below.
            </p>
          )}

          <div className="space-y-3">
            {items.map((item) => (
              <article
                key={item.id}
                className={cn(
                  "rounded-xl border p-4",
                  item.isActiveNow
                    ? "border-amber-500/50 bg-amber-500/8"
                    : "border-border bg-card",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{item.name}</h3>
                      {item.isActiveNow ? (
                        <Badge className="bg-amber-600 hover:bg-amber-600">
                          Live now
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.summary}</p>
                  </div>
                  <p className="shrink-0 text-right text-lg font-bold text-amber-700 tabular-nums">
                    {item.discountLabel}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline">{item.ruleLabel}</Badge>
                  <Badge variant={item.stackable ? "secondary" : "outline"}>
                    {item.stackable ? "Stacks with other offers" : "Best offer only"}
                  </Badge>
                  {item.scheduleLabel ? (
                    <span className="text-muted-foreground">{item.scheduleLabel}</span>
                  ) : (
                    <span className="text-muted-foreground">Any time</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

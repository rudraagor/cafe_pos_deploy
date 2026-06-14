"use client";

import { Megaphone } from "lucide-react";
import { useMemo, useState } from "react";
import { PromotionsModal } from "@/components/promotions/promotions-modal";
import { Button } from "@/components/ui/button";
import {
  buildNameLookups,
  buildPromotionCatalog,
} from "@/lib/pos/promotion-display";
import type { PromotionInput } from "@/lib/pos/pricing";
import { cn } from "@/lib/utils";

type CatalogProduct = {
  id: string;
  name: string;
  categoryId?: string | null;
};

type CatalogCategory = {
  id: string;
  name: string;
};

type PromotionsOffersButtonProps = {
  promotions: PromotionInput[];
  products: CatalogProduct[];
  categories: CatalogCategory[];
  variant?: "staff" | "guest";
  className?: string;
  size?: "default" | "sm";
};

export function PromotionsOffersButton({
  promotions,
  products,
  categories,
  variant = "staff",
  className,
  size = "default",
}: PromotionsOffersButtonProps) {
  const [open, setOpen] = useState(false);
  const catalog = useMemo(() => {
    const { productNames, categoryNames } = buildNameLookups(products, categories);
    return buildPromotionCatalog(promotions, productNames, categoryNames);
  }, [promotions, products, categories]);

  const liveCount = catalog.filter((item) => item.isActiveNow).length;

  if (catalog.length === 0) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size === "sm" ? "sm" : "default"}
        className={cn(
          "border-amber-500/40 bg-amber-500/10 text-amber-900 hover:bg-amber-500/15",
          size === "sm" ? "h-9" : "h-10 shrink-0",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <Megaphone className="size-4" />
        {variant === "guest" ? "Offers" : "Promotions"}
        {liveCount > 0 ? (
          <span className="rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {liveCount} live
          </span>
        ) : null}
      </Button>

      <PromotionsModal
        open={open}
        onOpenChange={setOpen}
        items={catalog}
        variant={variant}
      />
    </>
  );
}

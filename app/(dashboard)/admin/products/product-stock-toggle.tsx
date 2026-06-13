"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { toggleProductOutOfStock } from "@/app/(dashboard)/admin/products/actions";
import { Switch } from "@/components/ui/switch";

type ProductStockToggleProps = {
  productId: string;
  productName: string;
  isOutOfStock: boolean;
};

export function ProductStockToggle({
  productId,
  productName,
  isOutOfStock,
}: ProductStockToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(checked: boolean) {
    startTransition(async () => {
      const result = await toggleProductOutOfStock(productId, checked);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }
      toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Switch
        checked={isOutOfStock}
        disabled={isPending}
        aria-label={`Mark ${productName} out of stock`}
        onChange={(event) => handleChange(event.target.checked)}
      />
      <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
        {isOutOfStock ? "Out of stock" : "In stock"}
      </span>
    </div>
  );
}

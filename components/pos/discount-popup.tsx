"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { validateCoupon } from "@/app/(pos)/pos/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTableCart, useCartStore } from "@/lib/pos/cart-store";

type DiscountPopupProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
};

export function DiscountPopup({
  open,
  onOpenChange,
  tableId,
}: DiscountPopupProps) {
  const cart = useTableCart(tableId);
  const setCoupon = useCartStore((s) => s.setCoupon);
  const [code, setCode] = useState(cart.couponCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApply() {
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Enter a coupon code.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await validateCoupon(trimmed);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      setCoupon(tableId, {
        code: result.coupon.code,
        id: result.coupon.id,
        discountType: result.coupon.discountType as "percent" | "fixed",
        value: result.coupon.value,
      });
      toast.success(`Coupon ${result.coupon.code} applied.`);
      onOpenChange(false);
    });
  }

  function handleClear() {
    setCoupon(tableId, null);
    setCode("");
    setError(null);
    toast.success("Coupon removed.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Apply coupon</DialogTitle>
          <DialogDescription>
            Enter a coupon code. Automated promotions apply automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="coupon-code">Coupon code</Label>
          <Input
            id="coupon-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="WELCOME10"
          />
          {error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          {cart.couponCode ? (
            <Button type="button" variant="outline" onClick={handleClear}>
              Remove
            </Button>
          ) : null}
          <Button type="button" onClick={handleApply} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

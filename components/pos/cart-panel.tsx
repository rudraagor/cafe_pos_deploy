"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useTableCart, useCartStore } from "@/lib/pos/cart-store";
import {
  computeOrder,
  formatMoney,
  type PromotionInput,
} from "@/lib/pos/pricing";
import { Button } from "@/components/ui/button";
import { modifierLabel } from "@/lib/pos/modifiers";

type CartPanelProps = {
  tableId: string;
  promotions: PromotionInput[];
};

export function CartPanel({ tableId, promotions }: CartPanelProps) {
  const cart = useTableCart(tableId);
  const setQty = useCartStore((s) => s.setQty);
  const removeItem = useCartStore((s) => s.removeItem);

  const coupon = useMemo(() => {
    if (!cart.couponCode || !cart.couponId || cart.couponValue == null) {
      return null;
    }
    return {
      id: cart.couponId,
      code: cart.couponCode,
      discountType: cart.couponDiscountType ?? ("percent" as const),
      value: cart.couponValue,
      stackable: cart.couponStackable,
    };
  }, [
    cart.couponCode,
    cart.couponId,
    cart.couponDiscountType,
    cart.couponValue,
    cart.couponStackable,
  ]);

  const computed = useMemo(
    () => computeOrder(cart.items, { promotions, coupon: coupon ?? undefined }),
    [cart.items, promotions, coupon],
  );

  if (cart.items.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center p-4 text-sm">
        Tap products to add them to the cart.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {computed.lines.map((line) => (
          <div
            key={line.cartLineId ?? line.productId}
            className="flex items-start gap-2 rounded-lg border p-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{line.name}</p>
              <p className="text-muted-foreground text-xs">
                {formatMoney(line.unitPrice)} each
              </p>
              {line.lineDiscount > 0 ? (
                <p className="text-xs text-green-600">
                  -{formatMoney(line.lineDiscount)} promo
                </p>
              ) : null}
              {line.modifiers?.length ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {line.modifiers.map((modifier) => (
                    <span
                      key={modifier}
                      className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                    >
                      {modifierLabel(modifier)}
                    </span>
                  ))}
                </div>
              ) : null}
              {line.note ? (
                <p className="mt-1 text-xs font-medium text-amber-700">
                  {line.note}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() =>
                  setQty(tableId, line.cartLineId ?? line.productId, line.qty - 1)
                }
              >
                <Minus className="size-3" />
              </Button>
              <span className="w-6 text-center text-sm font-medium">
                {line.qty}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() =>
                  setQty(tableId, line.cartLineId ?? line.productId, line.qty + 1)
                }
              >
                <Plus className="size-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() =>
                  removeItem(tableId, line.cartLineId ?? line.productId)
                }
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
            <span className="w-16 text-right text-sm font-medium">
              {formatMoney(line.lineTotal)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function useCartPricing(
  tableId: string,
  promotions: PromotionInput[],
) {
  const cart = useTableCart(tableId);

  const coupon = useMemo(() => {
    if (!cart.couponCode || !cart.couponId || cart.couponValue == null) {
      return null;
    }
    return {
      id: cart.couponId,
      code: cart.couponCode,
      discountType: cart.couponDiscountType ?? ("percent" as const),
      value: cart.couponValue,
      stackable: cart.couponStackable,
    };
  }, [
    cart.couponCode,
    cart.couponId,
    cart.couponDiscountType,
    cart.couponValue,
    cart.couponStackable,
  ]);

  return useMemo(
    () =>
      computeOrder(cart.items, {
        promotions,
        coupon: coupon ?? undefined,
      }),
    [cart.items, promotions, coupon],
  );
}

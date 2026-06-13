"use client";

import { Loader2, Minus, Plus, Send, Tag, Trash2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { sendToKitchen } from "@/app/(dashboard)/pos/actions";
import { CustomerAssignPopup } from "@/components/pos/customer-assign-popup";
import { DiscountPopup } from "@/components/pos/discount-popup";
import { Button } from "@/components/ui/button";
import { useTableCart, useCartStore } from "@/lib/pos/cart-store";
import { modifierLabel } from "@/lib/pos/modifiers";
import {
  computeOrder,
  formatMoney,
  type PromotionInput,
} from "@/lib/pos/pricing";

type CustomerOption = { id: string; name: string; email: string | null };

type PosCartColumnProps = {
  tableId: string;
  orderTableId: string | null;
  orderTableIds?: string[];
  reservationId?: string | null;
  reservationCustomerName?: string | null;
  fulfillmentType: "dine_in" | "takeaway";
  promotions: PromotionInput[];
  customers: CustomerOption[];
};

export function PosCartColumn({
  tableId,
  orderTableId,
  orderTableIds = [],
  reservationId,
  reservationCustomerName,
  fulfillmentType,
  promotions,
  customers,
}: PosCartColumnProps) {
  const router = useRouter();
  const cart = useTableCart(tableId);
  const setQty = useCartStore((s) => s.setQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const setCoupon = useCartStore((s) => s.setCoupon);
  const clearTable = useCartStore((s) => s.clearTable);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

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

  function handleSend() {
    if (cart.items.length === 0) {
      toast.error("Add products before sending to kitchen.");
      return;
    }

    startTransition(async () => {
      const result = await sendToKitchen({
        tableId: orderTableId,
        tableIds: orderTableIds,
        reservationId: reservationId ?? undefined,
        fulfillmentType,
        orderId: cart.orderId,
        items: cart.items,
        couponCode: cart.couponCode,
        customerId: cart.customerId,
      });

      if (result.ok) {
        toast.success(result.message ?? "Sent to kitchen.");
        clearTable(tableId);
        router.push("/pos/orders");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="bg-card flex h-full min-h-0 flex-col overflow-hidden border-l">
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {computed.lines.length === 0 ? (
          <div className="text-muted-foreground flex h-full min-h-40 items-center justify-center text-center text-sm">
            Tap products to add them to the cart.
          </div>
        ) : (
          <div className="space-y-2">
            {computed.lines.map((line) => (
              <div
                key={line.cartLineId ?? line.productId}
                className="flex items-start gap-2 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{line.name}</p>
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
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() =>
                        setQty(
                          tableId,
                          line.cartLineId ?? line.productId,
                          line.qty - 1,
                        )
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
                        setQty(
                          tableId,
                          line.cartLineId ?? line.productId,
                          line.qty + 1,
                        )
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
                  <span className="text-sm font-semibold tabular-nums">
                    {formatMoney(line.lineTotal)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card shrink-0 border-t p-4">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{formatMoney(computed.subtotal)}</span>
          </div>
          {computed.orderDiscounts.map((d) => (
            <div key={d.id} className="flex justify-between text-green-600">
              <span>{d.label}</span>
              <span className="tabular-nums">-{formatMoney(d.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span className="tabular-nums">{formatMoney(computed.tax)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatMoney(computed.total)}</span>
          </div>
        </div>

        {cart.customerName ? (
          <p className="text-muted-foreground mt-2 text-xs">
            Customer:{" "}
            <span className="text-foreground">{cart.customerName}</span>
          </p>
        ) : reservationCustomerName ? (
          <p className="text-muted-foreground mt-2 text-xs">
            Reservation:{" "}
            <span className="text-foreground">{reservationCustomerName}</span>
          </p>
        ) : null}
        {cart.couponCode ? (
          <div className="text-muted-foreground mt-2 flex items-center justify-between gap-2 text-xs">
            <span>
              Coupon: <span className="text-foreground">{cart.couponCode}</span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => {
                setCoupon(tableId, null);
                toast.success("Coupon removed.");
              }}
            >
              Remove
            </Button>
          </div>
        ) : null}
      </div>

      <div className="bg-card shrink-0 space-y-2 border-t p-3">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setCustomerOpen(true)}
          >
            <User className="size-4" />
            Customer
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setDiscountOpen(true)}
          >
            <Tag className="size-4" />
            Discount
          </Button>
        </div>
        <Button
          type="button"
          className="h-11 w-full"
          onClick={handleSend}
          disabled={isPending || cart.items.length === 0}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Send to Kitchen
        </Button>
        <p className="text-muted-foreground px-1 text-xs">
          Payment is available from the saved order once the kitchen marks it
          ready.
        </p>
      </div>

      <DiscountPopup
        open={discountOpen}
        onOpenChange={setDiscountOpen}
        tableId={tableId}
      />
      <CustomerAssignPopup
        open={customerOpen}
        onOpenChange={setCustomerOpen}
        tableId={tableId}
        customers={customers}
      />
    </div>
  );
}

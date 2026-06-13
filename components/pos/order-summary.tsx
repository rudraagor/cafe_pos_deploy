"use client";

import { Loader2, Send, Tag, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { sendToKitchen } from "@/app/(dashboard)/pos/actions";
import { CustomerAssignPopup } from "@/components/pos/customer-assign-popup";
import { DiscountPopup } from "@/components/pos/discount-popup";
import { useCartPricing } from "@/components/pos/cart-panel";
import { Button } from "@/components/ui/button";
import { useTableCart, useCartStore } from "@/lib/pos/cart-store";
import { formatMoney, type PromotionInput } from "@/lib/pos/pricing";

type CustomerOption = { id: string; name: string; email: string | null };

type OrderSummaryProps = {
  tableId: string;
  orderTableId: string | null;
  orderTableIds?: string[];
  reservationId?: string | null;
  fulfillmentType: "dine_in" | "takeaway";
  promotions: PromotionInput[];
  customers: CustomerOption[];
};

export function OrderSummary({
  tableId,
  orderTableId,
  orderTableIds = [],
  reservationId,
  fulfillmentType,
  promotions,
  customers,
}: OrderSummaryProps) {
  const router = useRouter();
  const cart = useTableCart(tableId);
  const clearTable = useCartStore((s) => s.clearTable);
  const setCoupon = useCartStore((s) => s.setCoupon);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const computed = useCartPricing(tableId, promotions);

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
        router.push(
          "/pos/orders",
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex h-full flex-col border-l">
      <div className="flex-1 space-y-2 p-4">
        <h3 className="text-sm font-semibold">Order Summary</h3>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatMoney(computed.subtotal)}</span>
          </div>
          {computed.orderDiscounts.map((d) => (
            <div key={d.id} className="flex justify-between text-green-600">
              <span>{d.label}</span>
              <span>-{formatMoney(d.amount)}</span>
            </div>
          ))}
          {computed.discountTotal > 0 &&
          computed.lines.some((l) => l.lineDiscount > 0) ? (
            <div className="flex justify-between text-green-600">
              <span>Line discounts</span>
              <span>
                -
                {formatMoney(
                  computed.lines.reduce((s, l) => s + l.lineDiscount, 0),
                )}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatMoney(computed.tax)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <span>Total</span>
            <span>{formatMoney(computed.total)}</span>
          </div>
        </div>

        {cart.customerName ? (
          <p className="text-muted-foreground text-xs">
            Customer: <span className="text-foreground">{cart.customerName}</span>
          </p>
        ) : null}
        {cart.couponCode ? (
          <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
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

      <div className="space-y-2 border-t p-3">
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
          className="w-full"
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

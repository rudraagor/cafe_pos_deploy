"use client";

import {
  CreditCard,
  Loader2,
  Mail,
  Pencil,
  Printer,
  ReceiptText,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteDraftOrder, resendReceipt } from "@/app/(dashboard)/pos/actions";
import {
  PaymentDialog,
  type EnabledPaymentMethod,
} from "@/components/pos/payment-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TAKEAWAY_CART_ID, useCartStore } from "@/lib/pos/cart-store";
import { modifierLabel } from "@/lib/pos/modifiers";
import { formatMoney } from "@/lib/pos/pricing";

type OrderItemRow = {
  nameSnapshot: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  lineDiscount: string;
  modifiers: string[];
  note: string | null;
};

type EditDraftPayload = {
  orderId: string;
  tableId: string | null;
  tableIds?: string[];
  fulfillmentType: "dine_in" | "takeaway";
  items: {
    productId: string;
    name: string;
    unitPrice: number;
    taxRate: number;
    qty: number;
    isKitchenItem: boolean;
    modifiers?: string[];
    note?: string;
  }[];
  couponCode?: string;
  couponId?: string;
  couponDiscountType?: "percent" | "fixed";
  couponValue?: number;
  customerId?: string;
  customerName?: string;
};

type OrderDetailActionsProps = {
  orderId: string;
  orderNumber: string;
  total: number;
  tableId: string | null;
  status: "draft" | "paid" | "cancelled";
  editPayload?: EditDraftPayload;
  paymentMethods: EnabledPaymentMethod[];
  upiQrDataUrl?: string | null;
  upiPaymentUrl?: string | null;
  defaultPayOpen?: boolean;
  customerEmail?: string | null;
  paymentReady: boolean;
};

export function OrderDetailActions({
  orderId,
  orderNumber,
  total,
  tableId,
  status,
  editPayload,
  paymentMethods,
  upiQrDataUrl,
  upiPaymentUrl,
  defaultPayOpen = false,
  customerEmail,
  paymentReady,
}: OrderDetailActionsProps) {
  const router = useRouter();
  const loadDraft = useCartStore((s) => s.loadDraft);
  const [isPending, startTransition] = useTransition();

  function handleEdit() {
    if (!editPayload) return;
    const cartId =
      editPayload.fulfillmentType === "takeaway"
        ? TAKEAWAY_CART_ID
        : editPayload.tableId;
    if (!cartId) return;
    loadDraft(cartId, {
      orderId: editPayload.orderId,
      items: editPayload.items,
      couponCode: editPayload.couponCode,
      couponId: editPayload.couponId,
      couponDiscountType: editPayload.couponDiscountType,
      couponValue: editPayload.couponValue,
      customerId: editPayload.customerId,
      customerName: editPayload.customerName,
    });
    router.push(
      editPayload.fulfillmentType === "takeaway"
        ? "/pos/takeaway"
        : `/pos?table=${editPayload.tableId}&tables=${(editPayload.tableIds?.length ? editPayload.tableIds : editPayload.tableId ? [editPayload.tableId] : []).join(",")}&edit=${editPayload.orderId}`,
    );
  }

  function handleDelete() {
    if (!confirm("Delete this draft order?")) return;
    startTransition(async () => {
      const result = await deleteDraftOrder(orderId);
      if (result.ok) {
        toast.success(result.message ?? "Order deleted.");
        router.push("/pos/orders");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleResend() {
    startTransition(async () => {
      const result = await resendReceipt(orderId);
      if (result.ok) {
        toast.success(result.message ?? "Receipt resent.");
      } else {
        toast.error(result.error);
      }
    });
  }

  if (status === "paid") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.open(`/receipt/${orderId}?print=1`, "_blank")}
        >
          <Printer className="size-4" />
          Print receipt
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/receipt/${orderId}`} />}
        >
          <ReceiptText className="size-4" />
          View receipt
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleResend}
          disabled={isPending || !customerEmail}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Mail className="size-4" />
          )}
          Resend receipt
        </Button>
      </div>
    );
  }

  if (status !== "draft") return null;

  return (
    <div className="flex flex-wrap gap-2">
      {paymentReady ? (
        <PaymentDialog
          order={{ id: orderId, orderNumber, total, tableId }}
          methods={paymentMethods}
          upiQrDataUrl={upiQrDataUrl}
          upiPaymentUrl={upiPaymentUrl}
          defaultOpen={defaultPayOpen}
          trigger={
            <Button type="button">
              <CreditCard className="size-4" />
              Pay
            </Button>
          }
        />
      ) : (
        <Button type="button" disabled title="KDS must mark food ready first.">
          <CreditCard className="size-4" />
          Pay after ready
        </Button>
      )}
      <Button type="button" variant="outline" onClick={handleEdit}>
        <Pencil className="size-4" />
        Edit Order
      </Button>
      <Button
        type="button"
        variant="destructive"
        onClick={handleDelete}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
        Delete
      </Button>
    </div>
  );
}

export function OrderItemsList({ items }: { items: OrderItemRow[] }) {
  return (
    <ul className="divide-y rounded-lg border">
      {items.map((item, i) => (
        <li
          key={`${item.nameSnapshot}-${i}`}
          className="flex items-center justify-between px-4 py-3 text-sm"
        >
          <div>
            <p className="font-medium">{item.nameSnapshot}</p>
            <p className="text-muted-foreground text-xs">
              {item.quantity} × {formatMoney(Number(item.unitPrice))}
              {Number(item.lineDiscount) > 0
                ? ` · -${formatMoney(Number(item.lineDiscount))} off`
                : ""}
            </p>
            {item.modifiers.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {item.modifiers.map((modifier) => (
                  <span
                    key={modifier}
                    className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                  >
                    {modifierLabel(modifier)}
                  </span>
                ))}
              </div>
            ) : null}
            {item.note ? (
              <p className="mt-1 text-xs font-medium text-amber-700">
                {item.note}
              </p>
            ) : null}
          </div>
          <span className="font-medium">
            {formatMoney(Number(item.lineTotal))}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function OrderStatusBadge({
  status,
}: {
  status: "draft" | "paid" | "cancelled";
}) {
  const variant =
    status === "paid"
      ? "default"
      : status === "cancelled"
        ? "destructive"
        : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}

"use client";

import { CreditCard, Loader2, Mail, Pencil, Printer, ReceiptText, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteDraftOrder, resendReceipt } from "@/app/(pos)/pos/actions";
import {
  PaymentDialog,
  type EnabledPaymentMethod,
} from "@/components/pos/payment-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/pos/cart-store";
import { formatMoney } from "@/lib/pos/pricing";

type OrderItemRow = {
  nameSnapshot: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  lineDiscount: string;
};

type EditDraftPayload = {
  orderId: string;
  tableId: string;
  items: {
    productId: string;
    name: string;
    unitPrice: number;
    taxRate: number;
    qty: number;
    isKitchenItem: boolean;
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
}: OrderDetailActionsProps) {
  const router = useRouter();
  const loadDraft = useCartStore((s) => s.loadDraft);
  const [isPending, startTransition] = useTransition();

  function handleEdit() {
    if (!editPayload) return;
    loadDraft(editPayload.tableId, {
      orderId: editPayload.orderId,
      items: editPayload.items,
      couponCode: editPayload.couponCode,
      couponId: editPayload.couponId,
      couponDiscountType: editPayload.couponDiscountType,
      couponValue: editPayload.couponValue,
      customerId: editPayload.customerId,
      customerName: editPayload.customerName,
    });
    router.push(`/pos?table=${editPayload.tableId}`);
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
        <Button type="button" variant="outline" render={<Link href={`/receipt/${orderId}`} />}>
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

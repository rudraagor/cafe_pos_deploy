"use client";

import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteDraftOrder } from "@/app/(pos)/pos/actions";
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
  status: "draft" | "paid" | "cancelled";
  editPayload?: EditDraftPayload;
};

export function OrderDetailActions({
  orderId,
  status,
  editPayload,
}: OrderDetailActionsProps) {
  const router = useRouter();
  const loadDraft = useCartStore((s) => s.loadDraft);
  const [isPending, startTransition] = useTransition();

  if (status !== "draft") return null;

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

  return (
    <div className="flex gap-2">
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

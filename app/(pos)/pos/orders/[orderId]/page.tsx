import Link from "next/link";
import { notFound } from "next/navigation";
import {
  OrderDetailActions,
  OrderItemsList,
  OrderStatusBadge,
} from "@/components/pos/order-detail-actions";
import { requireUser } from "@/lib/auth";
import { getOrderDetail } from "@/lib/pos/queries";
import { formatMoney } from "@/lib/pos/pricing";

type Props = {
  params: Promise<{ orderId: string }>;
};

export default async function OrderDetailPage({ params }: Props) {
  await requireUser();
  const { orderId } = await params;
  const order = await getOrderDetail(orderId);
  if (!order) notFound();

  const editPayload =
    order.status === "draft" && order.tableId
      ? {
          orderId: order.id,
          tableId: order.tableId,
          items: order.items
            .filter((item) => item.productId)
            .map((item) => ({
              productId: item.productId!,
            name: item.nameSnapshot,
            unitPrice: Number(item.unitPrice),
            taxRate: Number(item.taxRateSnapshot),
            qty: item.quantity,
            isKitchenItem: item.isKitchenItem,
          })),
          couponCode: order.coupon?.code,
          couponId: order.coupon?.id,
          couponDiscountType: order.coupon?.discountType as
            | "percent"
            | "fixed"
            | undefined,
          couponValue: order.coupon ? Number(order.coupon.value) : undefined,
          customerId: order.customerId ?? undefined,
          customerName: order.customer?.name,
        }
      : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/pos/orders"
            className="text-muted-foreground text-sm hover:underline"
          >
            ← Orders
          </Link>
          <h1 className="mt-1 text-xl font-semibold">{order.orderNumber}</h1>
          <p className="text-muted-foreground text-sm">
            {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Customer</dt>
          <dd className="font-medium">{order.customer?.name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Table</dt>
          <dd className="font-medium">
            {order.table
              ? `${order.table.floor?.name ?? ""} · T${order.table.number}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Amount</dt>
          <dd className="font-medium">{formatMoney(Number(order.total))}</dd>
        </div>
      </dl>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Products</h2>
        <OrderItemsList
          items={order.items.map((item) => ({
            nameSnapshot: item.nameSnapshot,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            lineDiscount: item.lineDiscount,
          }))}
        />
      </div>

      <OrderDetailActions
        orderId={order.id}
        status={order.status}
        editPayload={editPayload}
      />
    </div>
  );
}

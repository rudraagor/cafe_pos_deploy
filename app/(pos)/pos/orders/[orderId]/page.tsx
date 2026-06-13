import Link from "next/link";
import { notFound } from "next/navigation";
import {
  OrderDetailActions,
  OrderItemsList,
  OrderStatusBadge,
} from "@/components/pos/order-detail-actions";
import { requireUser } from "@/lib/auth";
import {
  getEnabledPaymentMethods,
  getOrderDetail,
} from "@/lib/pos/queries";
import { buildQrDataUrl, buildUpiPaymentUrl } from "@/lib/pos/upi";
import { formatMoney } from "@/lib/pos/pricing";
import { getReceiptBrand } from "@/lib/receipt-brand";

type Props = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ pay?: string }>;
};

export default async function OrderDetailPage({ params, searchParams }: Props) {
  await requireUser();
  const { orderId } = await params;
  const [{ pay }, order, paymentMethods] = await Promise.all([
    searchParams,
    getOrderDetail(orderId),
    getEnabledPaymentMethods(),
  ]);
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
  const upiMethod = paymentMethods.find(
    (method) => method.type === "upi" && method.upiId,
  );
  const upiPaymentUrl =
    order.status === "draft" && upiMethod?.upiId
      ? buildUpiPaymentUrl({
          upiId: upiMethod.upiId,
          payeeName: getReceiptBrand().name,
          amount: Number(order.total),
          orderNumber: order.orderNumber,
        })
      : null;
  const upiQrDataUrl = upiPaymentUrl
    ? await buildQrDataUrl(upiPaymentUrl)
    : null;
  const primaryPayment = order.payments[0] ?? null;

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
        {primaryPayment ? (
          <>
            <div>
              <dt className="text-muted-foreground">Payment</dt>
              <dd className="font-medium uppercase">{primaryPayment.method}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Paid at</dt>
              <dd className="font-medium">
                {new Date(primaryPayment.createdAt).toLocaleString()}
              </dd>
            </div>
          </>
        ) : null}
      </dl>

      {primaryPayment ? (
        <div className="rounded-lg border p-4 text-sm">
          <h2 className="mb-3 font-semibold">Payment breakdown</h2>
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-muted-foreground">Amount paid</dt>
              <dd className="font-medium">
                {formatMoney(Number(primaryPayment.amount))}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Change due</dt>
              <dd className="font-medium">
                {primaryPayment.changeDue
                  ? formatMoney(Number(primaryPayment.changeDue))
                  : "—"}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground">Reference</dt>
              <dd className="font-medium">{primaryPayment.reference ?? "—"}</dd>
            </div>
          </dl>
        </div>
      ) : null}

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
        orderNumber={order.orderNumber}
        total={Number(order.total)}
        tableId={order.tableId}
        status={order.status}
        editPayload={editPayload}
        paymentMethods={paymentMethods.map((method) => ({
          type: method.type,
          enabled: method.enabled,
          upiId: method.upiId,
        }))}
        upiPaymentUrl={upiPaymentUrl}
        upiQrDataUrl={upiQrDataUrl}
        defaultPayOpen={order.status === "draft" && pay === "1"}
        customerEmail={order.customer?.email}
      />
    </div>
  );
}

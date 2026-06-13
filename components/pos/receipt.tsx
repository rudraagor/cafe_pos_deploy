import { formatMoney } from "@/lib/pos/pricing";
import { modifierLabel } from "@/lib/pos/modifiers";
import { formatMergedTableLabel } from "@/lib/pos/table-labels";

type ReceiptItem = {
  nameSnapshot: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  lineDiscount: string;
  modifiers: unknown;
  note: string | null;
};

type ReceiptPayment = {
  method: "cash" | "card" | "upi";
  amount: string;
  changeDue: string | null;
  reference: string | null;
  createdAt: Date;
};

export type ReceiptOrder = {
  id: string;
  orderNumber: string;
  createdAt: Date;
  subtotal: string;
  tax: string;
  discountTotal: string;
  total: string;
  fulfillmentType: "dine_in" | "takeaway";
  customer: { name: string; email: string | null } | null;
  employee: { name: string } | null;
  table: { number: number; floor: { name: string } | null } | null;
  orderTables: {
    isPrimary: boolean;
    table: { number: number; floor: { name: string } | null };
  }[];
  coupon: { code: string } | null;
  items: ReceiptItem[];
  payments: ReceiptPayment[];
};

type ReceiptProps = {
  brand: {
    name: string;
    address: string;
    footer: string;
  };
  order: ReceiptOrder;
  digitalReceiptUrl: string;
  digitalReceiptQrDataUrl: string;
};

export function Receipt({
  brand,
  order,
  digitalReceiptUrl,
  digitalReceiptQrDataUrl,
}: ReceiptProps) {
  const payment = order.payments[0];
  return (
    <article className="mx-auto w-full max-w-sm bg-white p-6 text-sm text-neutral-950 shadow-sm print:shadow-none">
      <header className="border-b border-dashed pb-4 text-center">
        <h1 className="text-xl font-bold">{brand.name}</h1>
        <p className="text-xs text-neutral-600">{brand.address}</p>
        <p className="mt-2 font-medium">{order.orderNumber}</p>
        <p className="text-xs text-neutral-600">
          {new Date(order.createdAt).toLocaleString()}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-2 border-b border-dashed py-4 text-xs">
        <div>
          <p className="text-neutral-500">Table</p>
          <p className="font-medium">
            {order.fulfillmentType === "takeaway"
              ? "Takeaway"
              : order.orderTables.length > 0
                ? formatMergedTableLabel(
                    order.orderTables
                      .slice()
                      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
                      .map((row) => row.table),
                  )
                : order.table
                  ? `${order.table.floor?.name ?? "Floor"} / T${order.table.number}`
                  : "Takeaway"}
          </p>
        </div>
        <div>
          <p className="text-neutral-500">Cashier</p>
          <p className="font-medium">{order.employee?.name ?? "—"}</p>
        </div>
        <div className="col-span-2">
          <p className="text-neutral-500">Customer</p>
          <p className="font-medium">{order.customer?.name ?? "Guest"}</p>
        </div>
      </section>

      <section className="border-b border-dashed py-4">
        <div className="space-y-3">
          {order.items.map((item, index) => (
            <div key={`${item.nameSnapshot}-${index}`} className="flex gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.nameSnapshot}</p>
                <p className="text-xs text-neutral-500">
                  {item.quantity} x {formatMoney(Number(item.unitPrice))}
                  {Number(item.lineDiscount) > 0
                    ? ` · -${formatMoney(Number(item.lineDiscount))}`
                    : ""}
                </p>
                {Array.isArray(item.modifiers) && item.modifiers.length > 0 ? (
                  <p className="text-xs font-medium text-neutral-700">
                    {item.modifiers.map((modifier) =>
                      modifierLabel(String(modifier)),
                    ).join(", ")}
                  </p>
                ) : null}
                {item.note ? (
                  <p className="text-xs font-medium text-neutral-700">
                    {item.note}
                  </p>
                ) : null}
              </div>
              <p className="font-medium">
                {formatMoney(Number(item.lineTotal))}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2 border-b border-dashed py-4">
        <ReceiptTotal label="Subtotal" value={Number(order.subtotal)} />
        {Number(order.discountTotal) > 0 ? (
          <ReceiptTotal
            label={order.coupon ? `Discount (${order.coupon.code})` : "Discount"}
            value={-Number(order.discountTotal)}
          />
        ) : null}
        <ReceiptTotal label="Tax" value={Number(order.tax)} />
        <div className="flex justify-between border-t pt-2 text-base font-bold">
          <span>Total</span>
          <span>{formatMoney(Number(order.total))}</span>
        </div>
      </section>

      {payment ? (
        <section className="space-y-2 border-b border-dashed py-4">
          <ReceiptTotal
            label={`Paid (${payment.method.toUpperCase()})`}
            value={Number(payment.amount)}
          />
          {payment.changeDue ? (
            <ReceiptTotal label="Change" value={Number(payment.changeDue)} />
          ) : null}
          {payment.reference ? (
            <p className="break-all text-xs text-neutral-500">
              Ref: {payment.reference}
            </p>
          ) : null}
        </section>
      ) : null}

      <footer className="space-y-3 pt-4 text-center">
        <div className="mx-auto w-28 rounded border bg-white p-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={digitalReceiptQrDataUrl} alt="Digital receipt QR" />
        </div>
        <p className="break-all text-[11px] text-neutral-500">
          {digitalReceiptUrl}
        </p>
        <p className="text-xs font-medium">{brand.footer}</p>
      </footer>
    </article>
  );
}

function ReceiptTotal({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-600">{label}</span>
      <span>{formatMoney(value)}</span>
    </div>
  );
}

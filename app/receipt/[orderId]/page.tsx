import { notFound } from "next/navigation";
import { Receipt } from "@/components/pos/receipt";
import { ReceiptPrintControls } from "@/components/pos/receipt-print-controls";
import { getOrderForReceipt } from "@/lib/pos/queries";
import { buildQrDataUrl } from "@/lib/pos/upi";
import { getAppUrl, getReceiptBrand } from "@/lib/receipt-brand";

type Props = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ print?: string }>;
};

export default async function PublicReceiptPage({
  params,
  searchParams,
}: Props) {
  const [{ orderId }, { print }] = await Promise.all([params, searchParams]);
  const order = await getOrderForReceipt(orderId);
  if (!order || order.status !== "paid") notFound();

  const digitalReceiptUrl = `${getAppUrl()}/receipt/${order.id}`;
  const digitalReceiptQrDataUrl = await buildQrDataUrl(digitalReceiptUrl);

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-6 print:bg-white print:p-0">
      <style>{`
        @media print {
          @page { margin: 8mm; }
          body { background: white !important; }
        }
      `}</style>
      <div className="mx-auto mb-4 flex max-w-sm justify-end print:hidden">
        <ReceiptPrintControls autoPrint={print === "1"} />
      </div>
      <Receipt
        brand={getReceiptBrand()}
        order={order}
        digitalReceiptUrl={digitalReceiptUrl}
        digitalReceiptQrDataUrl={digitalReceiptQrDataUrl}
      />
    </main>
  );
}

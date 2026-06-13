import { Resend } from "resend";
import { ReceiptEmail } from "@/emails/receipt-email";
import { getOrderForReceipt } from "@/lib/pos/queries";
import { getAppUrl, getReceiptBrand } from "@/lib/receipt-brand";

export type ReceiptEmailResult =
  | { ok: true; skipped?: false }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string };

export async function sendReceiptEmail(
  orderId: string,
): Promise<ReceiptEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    console.warn("Receipt email skipped: RESEND_API_KEY or RESEND_FROM unset.");
    return {
      ok: true,
      skipped: true,
      reason: "Receipt email is not configured.",
    };
  }

  const order = await getOrderForReceipt(orderId);
  if (!order || order.status !== "paid") {
    return { ok: false, error: "Paid order not found." };
  }
  if (!order.customer?.email) {
    return {
      ok: true,
      skipped: true,
      reason: "Customer email is missing.",
    };
  }

  const brand = getReceiptBrand();
  const receiptUrl = `${getAppUrl()}/receipt/${order.id}`;
  const prepMinutes = Number(process.env.RECEIPT_PREP_MINUTES ?? 15);

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: order.customer.email,
      subject: `Receipt for ${order.orderNumber}`,
      react: ReceiptEmail({
        brandName: brand.name,
        customerName: order.customer.name,
        orderNumber: order.orderNumber,
        total: Number(order.total),
        receiptUrl,
        prepMinutes: Number.isFinite(prepMinutes) ? prepMinutes : 15,
      }),
    });
    return { ok: true };
  } catch (error) {
    console.error("Receipt email failed", error);
    return { ok: false, error: "Receipt email failed to send." };
  }
}

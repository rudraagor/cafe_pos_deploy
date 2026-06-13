import { Resend } from "resend";
import { CouponOfferEmail } from "@/emails/coupon-offer-email";
import { getReceiptBrand } from "@/lib/receipt-brand";

export type CouponEmailResult =
  | { ok: true; skipped?: false }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string };

function formatDiscountLabel(
  discountType: "percent" | "fixed",
  value: number,
) {
  return discountType === "percent"
    ? `${value}% off your order`
    : `₹${value.toFixed(2)} off your order`;
}

export async function sendCouponOfferEmail(input: {
  customerName: string;
  customerEmail: string;
  couponCode: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  personalMessage?: string;
}): Promise<CouponEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    return {
      ok: true,
      skipped: true,
      reason: "Email is not configured (RESEND_API_KEY / RESEND_FROM).",
    };
  }

  if (!input.customerEmail.trim()) {
    return { ok: true, skipped: true, reason: "Customer email is missing." };
  }

  const brand = getReceiptBrand();

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: input.customerEmail.trim(),
      subject: `${brand.name}: your coupon code ${input.couponCode}`,
      react: CouponOfferEmail({
        brandName: brand.name,
        customerName: input.customerName,
        couponCode: input.couponCode,
        discountLabel: formatDiscountLabel(
          input.discountType,
          input.discountValue,
        ),
        personalMessage: input.personalMessage?.trim() || undefined,
      }),
    });
    return { ok: true };
  } catch (error) {
    console.error("Coupon offer email failed", error);
    return { ok: false, error: "Coupon email failed to send." };
  }
}

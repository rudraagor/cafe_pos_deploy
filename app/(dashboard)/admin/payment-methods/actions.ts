"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { paymentMethods } from "@/lib/db/schema";
import {
  type PaymentMethodInput,
  paymentMethodSchema,
} from "@/lib/validations/payment-methods";

type PaymentField = keyof PaymentMethodInput;
export type PaymentMethodActionResult = ActionResult<PaymentField>;

function parsePaymentMethod(
  formData: FormData,
): PaymentMethodActionResult | PaymentMethodInput {
  const type = String(formData.get("type") ?? "");
  const rawUpiId = String(formData.get("upiId") ?? "").trim();
  const parsed = paymentMethodSchema.safeParse({
    type,
    enabled: formData.get("enabled") === "true",
    upiId: rawUpiId || null,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  return parsed.data;
}

export async function updatePaymentMethod(
  formData: FormData,
): Promise<PaymentMethodActionResult> {
  await requireRole("admin");

  const parsed = parsePaymentMethod(formData);
  if ("ok" in parsed) return parsed;

  await db
    .insert(paymentMethods)
    .values({
      type: parsed.type,
      enabled: parsed.enabled,
      upiId: parsed.type === "upi" ? parsed.upiId : null,
    })
    .onConflictDoUpdate({
      target: paymentMethods.type,
      set: {
        enabled: parsed.enabled,
        upiId: parsed.type === "upi" ? parsed.upiId : null,
      },
    });

  revalidatePath("/admin/payment-methods");

  return { ok: true, message: "Payment method updated." };
}

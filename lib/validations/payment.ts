import { z } from "zod";
import { paymentTypeOptions } from "@/lib/validations/payment-methods";

export const paymentSchema = z.object({
  orderId: z.string().uuid(),
  method: z.enum(paymentTypeOptions),
  tendered: z.coerce.number().positive().optional(),
  reference: z.string().trim().max(120, "Reference is too long.").optional(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;

export const splitPaymentSchema = z.object({
  orderId: z.string().uuid(),
  payments: z
    .array(
      z.object({
        method: z.enum(paymentTypeOptions),
        amount: z.coerce.number().positive("Amount must be greater than 0."),
        tendered: z.coerce.number().positive().optional(),
        reference: z
          .string()
          .trim()
          .max(120, "Reference is too long.")
          .optional(),
      }),
    )
    .min(1, "Add at least one payment.")
    .max(6, "Use six or fewer payment lines."),
});

export type SplitPaymentInput = z.infer<typeof splitPaymentSchema>;

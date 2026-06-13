import { z } from "zod";
import { paymentTypeOptions } from "@/lib/validations/payment-methods";

export const paymentSchema = z.object({
  orderId: z.string().uuid(),
  method: z.enum(paymentTypeOptions),
  tendered: z.coerce.number().positive().optional(),
  reference: z.string().trim().max(120, "Reference is too long.").optional(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;

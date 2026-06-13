import { z } from "zod";

export const paymentTypeOptions = ["cash", "card", "upi"] as const;

export const paymentMethodSchema = z
  .object({
    type: z.enum(paymentTypeOptions),
    enabled: z.boolean(),
    upiId: z.string().trim().max(120, "UPI ID is too long.").nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "upi" && value.enabled && !value.upiId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["upiId"],
        message: "UPI ID is required when UPI is enabled.",
      });
    }
  });

export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;

import { z } from "zod";

export const discountTypeOptions = ["percent", "fixed"] as const;
export const promotionScopeOptions = ["product", "order"] as const;

const discountValue = z.coerce
  .number({ invalid_type_error: "Discount value is required." })
  .positive("Discount value must be greater than 0.")
  .max(999999, "Discount value is too high.");

function validateDiscountValue(
  discountType: "percent" | "fixed",
  value: number,
  ctx: z.RefinementCtx,
) {
  if (discountType === "percent" && value > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["value"],
      message: "Percentage discounts cannot exceed 100%.",
    });
  }
}

export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Coupon code is required.")
      .max(40, "Coupon code must be 40 characters or fewer.")
      .transform((value) => value.toUpperCase()),
    discountType: z.enum(discountTypeOptions),
    value: discountValue,
    active: z.boolean(),
  })
  .superRefine((value, ctx) => {
    validateDiscountValue(value.discountType, value.value, ctx);
  });

export const promotionSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Promotion name is required.")
      .max(120, "Promotion name must be 120 characters or fewer."),
    scope: z.enum(promotionScopeOptions),
    productId: z.string().uuid("Select a valid product.").nullable(),
    minQuantity: z.coerce.number().int().positive().nullable(),
    minOrderAmount: z.coerce.number().positive().nullable(),
    discountType: z.enum(discountTypeOptions),
    value: discountValue,
    active: z.boolean(),
  })
  .superRefine((value, ctx) => {
    validateDiscountValue(value.discountType, value.value, ctx);

    if (value.scope === "product") {
      if (!value.productId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["productId"],
          message: "Select a product for product promotions.",
        });
      }
      if (!value.minQuantity) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["minQuantity"],
          message: "Minimum quantity is required.",
        });
      }
    }

    if (value.scope === "order" && !value.minOrderAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minOrderAmount"],
        message: "Minimum order amount is required.",
      });
    }
  });

export type CouponInput = z.infer<typeof couponSchema>;
export type PromotionInput = z.infer<typeof promotionSchema>;

import { z } from "zod";

export const discountTypeOptions = ["percent", "fixed"] as const;
export const promotionScopeOptions = ["product", "order"] as const;
export const promotionRuleTypeOptions = [
  "order_threshold",
  "product_quantity",
  "combo",
  "daily_item",
] as const;

const weekdays = [0, 1, 2, 3, 4, 5, 6] as const;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

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
    stackable: z.boolean(),
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
    ruleType: z.enum(promotionRuleTypeOptions),
    productId: z.string().uuid("Select a valid product.").nullable(),
    minQuantity: z.coerce.number().int().positive().nullable(),
    minOrderAmount: z.coerce.number().positive().nullable(),
    requiredProductIds: z.array(z.string().uuid()).default([]),
    dailyProductIds: z.array(z.string().uuid()).default([]),
    dailyCategoryIds: z.array(z.string().uuid()).default([]),
    requiredQuantity: z.coerce.number().int().positive().default(1),
    rewardProductIds: z.array(z.string().uuid()).default([]),
    rewardQuantity: z.coerce.number().int().positive().default(1),
    daysOfWeek: z.array(z.coerce.number().int()).default([]),
    startTime: z.string().trim().nullable(),
    endTime: z.string().trim().nullable(),
    discountType: z.enum(discountTypeOptions),
    value: discountValue,
    stackable: z.boolean(),
    active: z.boolean(),
  })
  .superRefine((value, ctx) => {
    validateDiscountValue(value.discountType, value.value, ctx);

    for (const day of value.daysOfWeek) {
      if (!weekdays.includes(day as (typeof weekdays)[number])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["daysOfWeek"],
          message: "Select valid weekdays.",
        });
        break;
      }
    }

    if (value.startTime && !timePattern.test(value.startTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startTime"],
        message: "Start time must use HH:mm.",
      });
    }

    if (value.endTime && !timePattern.test(value.endTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "End time must use HH:mm.",
      });
    }

    if (value.ruleType === "product_quantity") {
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

    if (value.ruleType === "order_threshold" && !value.minOrderAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minOrderAmount"],
        message: "Minimum order amount is required.",
      });
    }

    if (value.ruleType === "combo" && value.requiredProductIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requiredProductIds"],
        message: "Select at least one required product.",
      });
    }

    if (
      value.ruleType === "daily_item" &&
      value.dailyProductIds.length === 0 &&
      value.dailyCategoryIds.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dailyProductIds"],
        message: "Select at least one product or category.",
      });
    }
  });

export type CouponInput = z.infer<typeof couponSchema>;
export type PromotionInput = z.infer<typeof promotionSchema>;

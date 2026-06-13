import { z } from "zod";

export const cartItemSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().min(1),
  unitPrice: z.number().positive(),
  taxRate: z.number().min(0).max(100),
  qty: z.number().int().positive(),
  isKitchenItem: z.boolean(),
  categoryColor: z.string().optional(),
});

export const sendToKitchenSchema = z
  .object({
    fulfillmentType: z.enum(["dine_in", "takeaway"]).default("dine_in"),
    tableId: z.string().uuid().nullable().optional(),
    orderId: z.string().uuid().optional(),
    items: z.array(cartItemSchema).min(1, "Add at least one product."),
    couponCode: z.string().trim().optional(),
    customerId: z.string().uuid().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.fulfillmentType === "dine_in" && !value.tableId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tableId"],
        message: "Select a table for dine-in orders.",
      });
    }
  });

export type SendToKitchenInput = z.infer<typeof sendToKitchenSchema>;

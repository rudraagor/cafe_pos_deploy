import { z } from "zod";
import { modifierIds } from "@/lib/pos/modifiers";

export const unitOptions = ["piece", "kg", "litre"] as const;

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Product name is required.")
    .max(120, "Product name must be 120 characters or fewer."),
  categoryId: z.string().uuid("Select a valid category.").nullable(),
  price: z.coerce
    .number({ invalid_type_error: "Price is required." })
    .positive("Price must be greater than 0.")
    .max(999999, "Price is too high."),
  unitOfMeasure: z.enum(unitOptions),
  taxRate: z.coerce
    .number({ invalid_type_error: "Tax rate is required." })
    .min(0, "Tax cannot be negative.")
    .max(100, "Tax cannot exceed 100%."),
  description: z
    .string()
    .trim()
    .max(600, "Description must be 600 characters or fewer.")
    .nullable(),
  supportedModifiers: z.array(z.enum(modifierIds)).default([]),
  isKitchenItem: z.boolean(),
});

export type ProductInput = z.infer<typeof productSchema>;
